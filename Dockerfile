# syntax=docker/dockerfile:1.7
#
# Image Docker pii-scanner-web — distribution officielle pour déploiement
# self-hosted souverain. Sert le SPA Angular en statique via nginx.
#
# Trois principes structurants :
#
#   1. **Pas de dépendance réseau au runtime.** L'image n'effectue aucun
#      appel réseau sortant à l'exécution. Les assets sont tous embarqués.
#      Le serveur nginx ne fait que servir les fichiers locaux.
#   2. **Non-root.** L'image se base sur `nginxinc/nginx-unprivileged` qui
#      tourne en UID 101 et écoute par défaut sur le port 8080 (publiable
#      depuis n'importe quelle infra Docker sans CAP_NET_BIND_SERVICE).
#   3. **Multi-arch (amd64 + arm64).** Le workflow release la construit pour
#      les deux architectures via Buildx + QEMU.
#
# Usage local (test) :
#
#   docker build -t pii-scanner-web .
#   docker run --rm -p 8080:8080 pii-scanner-web
#   open http://localhost:8080
#
# La promesse souveraineté reste vérifiable derrière nginx : DevTools →
# Réseau → drop d'un fichier → 0 requête sortante.

# -----------------------------------------------------------------------------
# Étape 1 : build de l'app Angular en mode production.
# Le release.yml peut court-circuiter cette étape via le `dist/browser` déjà
# uploadé en artifact (cf. step `Download dist artifact`). En build local
# (sans CI), cette étape regenere depuis les sources.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Active corepack pour l'usage de pnpm@9.12.0 fixé.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /workspace

# Copie sélective : on optimise le cache Docker. Manifests d'abord, code après.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/pii-detectors/package.json packages/pii-detectors/
COPY packages/pii-scanner-engine/package.json packages/pii-scanner-engine/
COPY apps/pii-scanner-web/package.json apps/pii-scanner-web/

# `--frozen-lockfile` fail si le lockfile bouge (cohérent CI).
RUN pnpm install --frozen-lockfile

# Code source.
COPY . .

# Build production. `--base-href ./` : chemins relatifs, l'image fonctionne
# qu'elle soit servie à la racine ou derrière un reverse-proxy avec sous-chemin.
# Le script alias `build:rel` évite le souci pnpm 9 + Angular CLI sur la
# propagation d'args `-- --base-href ./`.
RUN pnpm -r --filter='./packages/*' build \
 && pnpm --filter pii-scanner-web build:rel

# -----------------------------------------------------------------------------
# Étape 2 : runtime nginx unprivileged.
# Image officielle non-root (UID 101). Port 8080 par défaut.
# -----------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# OCI labels (complétés par la build-action via metadata).
LABEL org.opencontainers.image.title="pii-scanner-web" \
      org.opencontainers.image.description="Scanner local de PII (souverain, navigateur uniquement)" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="RezDevOps" \
      org.opencontainers.image.source="https://github.com/RezDevOps/pii-scanner-web"

# Configuration nginx : CSP/sécurité/cache + fallback SPA.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# App buildée.
COPY --from=builder /workspace/apps/pii-scanner-web/dist/browser /usr/share/nginx/html

# Healthcheck minimal local — utilise wget alpine déjà dans l'image, pas
# d'appel sortant. Vérifie juste que le serveur répond sur /.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

EXPOSE 8080
USER 101
