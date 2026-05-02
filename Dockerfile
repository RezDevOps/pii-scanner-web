# syntax=docker/dockerfile:1.7
#
# Image Docker pii-scanner-web — distribution officielle pour déploiement
# self-hosted souverain. Sert le SPA Angular en statique via nginx.
#
# Quatre principes structurants :
#
#   1. **Pas de dépendance réseau au runtime.** L'image n'effectue aucun
#      appel réseau sortant à l'exécution. Les assets sont tous embarqués.
#      Le serveur nginx ne fait que servir les fichiers locaux.
#   2. **Non-root.** L'image se base sur `nginxinc/nginx-unprivileged` qui
#      tourne en UID 101 et écoute par défaut sur le port 8080 (publiable
#      depuis n'importe quelle infra Docker sans CAP_NET_BIND_SERVICE).
#   3. **Multi-arch (amd64 + arm64).** Le workflow release la construit
#      pour les deux architectures via Buildx. Comme l'image n'exécute
#      AUCUN binaire pendant le build (juste des `COPY` de fichiers
#      statiques), Buildx n'a pas besoin de QEMU pour le build arm64 sur
#      runner amd64. Cf. release v1.0.2 où l'ancien Dockerfile multi-stage
#      faisait tourner `pnpm install` + `ng build` sous QEMU arm64 et
#      plantait avec « qemu: uncaught target signal 4 (Illegal
#      instruction) » sur les instructions SIMD modernes (NEON/SVE) que
#      la version QEMU embarquée dans le runner ne sait pas émuler. Le
#      refactor v1.0.3 supprime entièrement l'étape builder et fait
#      confiance au dist Angular pré-buildé fourni dans le contexte.
#   4. **Pré-condition explicite : `pnpm build` AVANT `docker build`.**
#      L'image suppose que `apps/pii-scanner-web/dist/browser/` existe
#      dans le contexte. La CI release.yml le garantit via le job
#      `build-app` qui upload le dist en artifact, puis le télécharge
#      dans le contexte avant de lancer Buildx (cf. step `Download dist
#      artifact` du job `build-docker`). En local :
#
#        pnpm install --frozen-lockfile
#        pnpm build
#        docker build -t pii-scanner-web .
#        docker run --rm -p 8080:8080 pii-scanner-web
#        open http://localhost:8080
#
#      Si `apps/pii-scanner-web/dist/browser/` n'existe pas, le `COPY`
#      échoue avec un message clair de Docker (« no source files were
#      specified »).
#
# La promesse souveraineté reste vérifiable derrière nginx :
# DevTools → Réseau → drop d'un fichier → 0 requête sortante.

FROM nginxinc/nginx-unprivileged:1.27-alpine

# OCI labels (complétés par la build-action via metadata).
LABEL org.opencontainers.image.title="pii-scanner-web" \
      org.opencontainers.image.description="Scanner local de PII (souverain, navigateur uniquement)" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="RezDevOps" \
      org.opencontainers.image.source="https://github.com/RezDevOps/pii-scanner-web"

# Configuration nginx : CSP/sécurité/cache + fallback SPA.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# App buildée. Le dist DOIT être présent dans le contexte avant le
# `docker build` (cf. doc en tête de fichier). Aucun fallback : si le
# `pnpm build` n'a pas été lancé en amont (ou si le `.dockerignore`
# exclut le chemin), ce step échoue avec un message clair de Docker.
COPY apps/pii-scanner-web/dist/browser /usr/share/nginx/html

# Healthcheck minimal local — utilise wget alpine déjà dans l'image, pas
# d'appel sortant. Vérifie juste que le serveur répond sur /.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

EXPOSE 8080
USER 101
