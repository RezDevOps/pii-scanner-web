/**
 * Icon registry — Material Symbols Outlined embarquées en inline SVG.
 *
 * **Pourquoi `addSvgIconLiteral` plutôt que `addSvgIcon(url)` ?**
 *
 * La Content Security Policy de l'app (cf. `src/index.html`) durcit
 * `connect-src 'none'` pour matérialiser la promesse souveraineté
 * (aucun `fetch`/`XHR`/`WebSocket` runtime, donc aucune exfiltration de
 * données possible, par construction).
 * Or `MatIconRegistry.addSvgIcon(url)` charge le SVG via `HttpClient` —
 * même vers la même origine, cette requête XHR est bloquée par
 * `connect-src 'none'`.
 *
 * On embarque donc les SVG en **string literals** dans ce module, et on
 * les enregistre via `addSvgIconLiteral`. Avantages :
 *   - zéro fetch runtime, CSP intacte ;
 *   - SVG bundlés dans le chunk principal (≈ 4 KB total après gzip) ;
 *   - icônes disponibles synchronement, pas de flash sans icône au boot.
 *
 * **Provenance des SVG**
 *
 * Copies directes de `@material-symbols/svg-400/outlined/` (variante
 * `wght 400`, taille graphique `48dp`, viewBox `0 -960 960 960`),
 * distribuées sous Apache 2.0 par Google. Source de vérité humainement
 * lisible : `apps/pii-scanner-web/public/icons/*.svg` (mêmes fichiers,
 * conservés versionnés à des fins d'audit). Procédure de mise à jour :
 * cf. `public/icons/README.md`.
 *
 * Le `fill="currentColor"` injecté sur chaque `<path>` permet à
 * `<mat-icon svgIcon="…">` d'hériter de la couleur du texte parent
 * (Material Material Icons font fonctionne ainsi nativement, mais les
 * SVG bruts conservent leur `fill` noir par défaut).
 */
import { inject, provideAppInitializer } from "@angular/core";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";

/**
 * Catalogue des icônes embarquées. La clef est le nom utilisé côté
 * template via `[svgIcon]` ou `svgIcon`. Toute icône ajoutée ici DOIT
 * également être copiée dans `public/icons/<nom>.svg` (audit).
 */
const ICONS: Readonly<Record<string, string>> = Object.freeze({
  cloud_upload: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M250-160q-86 0-148-62T40-370q0-78 49.5-137.5T217-579q20-97 94-158.5T482-799q113 0 189.5 81.5T748-522v24q72-2 122 46.5T920-329q0 69-50 119t-119 50H510q-24 0-42-18t-18-42v-258l-83 83-43-43 156-156 156 156-43 43-83-83v258h241q45 0 77-32t32-77q0-45-32-77t-77-32h-63v-84q0-89-60.5-153T478-739q-89 0-150 64t-61 153h-19q-62 0-105 43.5T100-371q0 62 43.93 106.5T250-220h140v60H250Zm230-290Z"/></svg>`,
  schedule: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"/></svg>`,
  autorenew: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M196-331q-20-36-28-72.5t-8-74.5q0-131 94.5-225.5T480-798h43l-80-80 39-39 149 149-149 149-40-40 79-79h-41q-107 0-183.5 76.5T220-478q0 29 5.5 55t13.5 49l-43 43ZM476-40 327-189l149-149 39 39-80 80h45q107 0 183.5-76.5T740-479q0-29-5-55t-15-49l43-43q20 36 28.5 72.5T800-479q0 131-94.5 225.5T480-159h-45l80 80-39 39Z"/></svg>`,
  check_circle: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M503.5-289.48q9.5-9.48 9.5-23.5t-9.48-23.52q-9.48-9.5-23.5-9.5t-23.52 9.48q-9.5 9.48-9.5 23.5t9.48 23.52q9.48 9.5 23.5 9.5t23.52-9.48ZM453-433h60v-253h-60v253Zm27.27 353q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z"/></svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M320-242 80-482l242-242 43 43-199 199 197 197-43 43Zm318 2-43-43 199-199-197-197 43-43 240 240-242 242Z"/></svg>`,
  article: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M277-279h275v-60H277v60Zm0-171h406v-60H277v60Zm0-171h406v-60H277v60Zm-97 501q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm0-600v600-600Z"/></svg>`,
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path fill="currentColor" d="M0-360v-240h48v89h108v-89h48v240h-48v-103H48v103H0Zm316 0v-192h-70v-48h188v48h-70v192h-48Zm160 0v-206q0-15 9.5-24.5T510-600h200q15 0 24.5 9.5T744-566v206h-48v-192h-62v150h-48v-150h-62v192h-48Zm326 0v-240h48v192h110v48H802Z"/></svg>`,
});

/**
 * Provider standalone à câbler dans `app.config.ts`. À l'init de l'app,
 * enregistre chaque SVG du catalogue dans le `MatIconRegistry` global,
 * de sorte que tous les `<mat-icon svgIcon="cloud_upload">` (etc.)
 * rendent le bon glyphe sans avoir à charger Material Icons depuis
 * Google Fonts ni faire de requête HTTP au runtime.
 */
export function provideMaterialIcons() {
  return provideAppInitializer(() => {
    const registry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);

    for (const [name, svg] of Object.entries(ICONS)) {
      // `bypassSecurityTrustHtml` est sûr ici : on inline du SVG dont on
      // contrôle 100 % la source (copies versionnées de Material Symbols,
      // pas d'entrée utilisateur). Audit : `public/icons/<nom>.svg`.
      registry.addSvgIconLiteral(name, sanitizer.bypassSecurityTrustHtml(svg));
    }
  });
}

/**
 * Liste publique des noms d'icônes enregistrés — utile aux tests qui
 * veulent vérifier l'inventaire (cf. `icon-registry.spec.ts`).
 */
export const REGISTERED_ICON_NAMES: readonly string[] = Object.freeze(
  Object.keys(ICONS),
);
