#!/usr/bin/env node
/**
 * Audit des dépendances de PRODUCTION contre les advisories de sécurité npm.
 *
 * Remplace `pnpm audit --audit-level=high --prod`. Depuis 2026, npm a retiré
 * l'ancien endpoint « quick » (…/-/npm/v1/security/audits/quick) que TOUTES
 * les versions de pnpm (jusqu'à 11.x incluse) interrogent encore : il répond
 * désormais HTTP 410, donc `pnpm audit` échoue par erreur d'infrastructure,
 * indépendamment de toute vulnérabilité réelle.
 *
 * Ce script conserve exactement la même politique que l'ancien step :
 *   - périmètre : dépendances de production uniquement (les devDependencies,
 *     outils de build, sont exclues — cf. docs/audit-dependances-v1.0.0.md) ;
 *   - seuil : échec (exit 1) dès une advisory `high` ou `critical` ;
 *   - source : la base d'advisories npm, via le nouvel endpoint « bulk »
 *     officiel (…/-/npm/v1/security/advisories/bulk), celui qu'utilise
 *     `npm audit`.
 *
 * Aucune dépendance externe : Node >= 18 suffit (fetch global, top-level await).
 *
 * Remédiation d'une CVE détectée : override `pnpm.overrides` documenté (comme
 * auparavant), JAMAIS la suppression de ce garde-fou.
 *
 * Codes de sortie : 0 = OK, 1 = advisory high/critical trouvée, 2 = erreur
 * (endpoint injoignable, réponse inattendue) — l'erreur casse aussi la CI,
 * pour ne jamais « passer » un audit qui n'a pas réellement pu s'exécuter.
 */
import { execSync } from "node:child_process";

const SEVERITY = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const THRESHOLD = SEVERITY.high;
const BULK_ENDPOINT =
  "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

// 1. Arbre des dépendances de production (tout le monorepo), aplati en
//    { nom: [versions installées] }.
const output = execSync("pnpm ls --prod --depth Infinity --json --recursive", {
  encoding: "utf8",
  maxBuffer: 128 * 1024 * 1024,
});

const packages = {};
const collect = (deps) => {
  if (!deps) return;
  for (const [name, info] of Object.entries(deps)) {
    // On ignore les paquets workspace locaux (version « link:… » ou autre
    // non numérique) : ils ne sont pas sur le registre npm.
    if (info.version && /^\d/.test(info.version)) {
      (packages[name] ??= new Set()).add(info.version);
    }
    collect(info.dependencies);
    collect(info.optionalDependencies);
  }
};
for (const project of JSON.parse(output)) {
  collect(project.dependencies);
  collect(project.optionalDependencies);
}

const body = Object.fromEntries(
  Object.entries(packages).map(([name, versions]) => [name, [...versions]]),
);
console.log(
  `Audit de ${Object.keys(body).length} paquets de production (seuil : high+).`,
);

// 2. Interrogation de l'endpoint bulk officiel.
const response = await fetch(BULK_ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
if (!response.ok) {
  console.error(
    `Erreur : l'endpoint d'audit npm a répondu HTTP ${response.status}.`,
  );
  process.exit(2);
}
const advisories = await response.json();

// 3. Filtrage sur le seuil de sévérité.
const findings = [];
for (const [name, list] of Object.entries(advisories)) {
  for (const advisory of list) {
    if ((SEVERITY[advisory.severity] ?? 0) >= THRESHOLD) {
      findings.push({ name, ...advisory });
    }
  }
}

if (findings.length === 0) {
  console.log(
    "OK : aucune advisory high/critical dans les dépendances de production.",
  );
  process.exit(0);
}

console.error(`\nÉCHEC : ${findings.length} advisory high/critical.\n`);
for (const f of findings) {
  console.error(`  [${f.severity}] ${f.name} ${f.vulnerable_versions ?? ""}`);
  console.error(`      ${f.title}`);
  console.error(`      ${f.url}`);
}
console.error(
  "\nRemédiation : override `pnpm.overrides` documenté " +
    "(cf. docs/audit-dependances-v1.0.0.md), pas la suppression du garde-fou.",
);
process.exit(1);
