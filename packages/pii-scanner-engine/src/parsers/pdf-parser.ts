/**
 * Parseur PDF — extraction texte uniquement via **PDF.js**
 * (`pdfjs-dist`, build legacy).
 *
 * Stratégie : `getDocument({ data })` → boucle sur les pages →
 * `page.getTextContent()` retourne une liste de `TextItem` que l'on
 * rejoint en un texte de page (espace par défaut, saut de ligne quand
 * `hasEOL === true`). On émet **un `TextChunk` par page**, avec un
 * `path` = `page[N]` et `line = N`.
 *
 * Limitations volontaires :
 * - **Pas d'OCR.** Un PDF scanné (image dans une page) ne produit
 *   aucun texte. C'est cohérent avec le cadrage § 4.6 (OCR = v1.1).
 * - **Pas de rendu graphique.** On n'instancie pas de canvas, ce qui
 *   évite la dep native `canvas` côté Node tests.
 * - **`isEvalSupported: false`.** Désactive l'évaluation JS embarquée
 *   dans certains PDF (PDF.js fallback sur des chemins sûrs). Posture
 *   sécuritaire cohérente avec la promesse souveraineté.
 *
 * Choix de dépendance : voir `docs/adr/0006-pdfjs-pour-pdf.md`.
 *
 * Note technique : on importe la build `legacy/build/pdf.mjs` qui
 * fonctionne aussi bien en navigateur qu'en Node, sans dépendre de
 * `canvas` ni d'un Worker tant qu'on n'invoque pas le rendu.
 *
 * **Lazy-loading (v0.4.1)** : `pdfjs-dist` (~600 ko bundle, le plus
 * gros parseur binaire) est chargé via `import()` dynamique au premier
 * appel à `parse()`. Tant qu'on ne scanne pas un .pdf, le module
 * PDF.js ne pèse pas dans le bundle initial. Cf.
 * `docs/adr/0007-lazy-loading-parseurs-binaires.md`.
 */
import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

/**
 * Sous-ensemble de `TextItem` PDF.js consommé par le parseur. Recopié
 * en local plutôt qu'importé : les sous-chemins `pdfjs-dist/legacy/...`
 * n'exportent pas tous les types, et notre dépendance se limite à
 * `str` + `hasEOL`.
 */
interface PdfTextItem {
  readonly str: string;
  readonly hasEOL?: boolean;
}

/**
 * Module PDF.js chargé paresseusement. La promesse est mise en cache
 * pour qu'un second `parse()` réutilise la même instance — important
 * car PDF.js initialise des structures internes au premier import.
 */
let pdfjsModulePromise: Promise<
  typeof import("pdfjs-dist/legacy/build/pdf.mjs")
> | null = null;
function loadPdfjsModule(): Promise<
  typeof import("pdfjs-dist/legacy/build/pdf.mjs")
> {
  if (!pdfjsModulePromise) {
    // eslint-disable-next-line import/no-unresolved -- sous-chemin du package
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(
      (mod) => {
        // On désactive le worker explicitement : pour `getTextContent`,
        // le fallback monothread est suffisant. En spécifiant une
        // chaîne vide, PDF.js bascule sur le mode synchrone dans le
        // thread courant. Idempotent : si l'app caller a déjà
        // configuré une URL, on ne l'écrase pas.
        if (
          typeof mod.GlobalWorkerOptions !== "undefined" &&
          !mod.GlobalWorkerOptions.workerSrc
        ) {
          mod.GlobalWorkerOptions.workerSrc = "";
        }
        return mod;
      },
    );
  }
  return pdfjsModulePromise;
}

export const pdfParser: FileParser = {
  format: "pdf",
  async *parse(input: ParserInput): AsyncIterable<TextChunk> {
    const { getDocument } = await loadPdfjsModule();
    const buf = await input.arrayBuffer();
    const data = new Uint8Array(buf);
    const loadingTask = getDocument({
      data,
      isEvalSupported: false,
      // `useSystemFonts: false` empêche PDF.js de tenter de lire les
      // polices système sur disque — cohérent avec la posture zéro
      // accès au-delà du fichier reçu.
      useSystemFonts: false,
      disableFontFace: true,
      // Pas de log bruyants côté console.
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        try {
          const content = await page.getTextContent();
          const text = joinTextItems(content.items);
          if (text.length === 0) {
            continue;
          }
          yield {
            text,
            path: `page[${i}]`,
            line: i,
          };
        } finally {
          // Libère les ressources de la page (PDF.js conseille de
          // `cleanup()` ou de laisser le GC ; on ne bloque pas si
          // indisponible).
          if (typeof page.cleanup === "function") {
            page.cleanup();
          }
        }
      }
    } finally {
      // `destroy` libère la mémoire WASM + caches associés au document.
      await doc.destroy().catch(() => undefined);
    }
  },
};

/** Liste blanche des formats traités par ce parseur. */
export const PDF_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["pdf"];

/**
 * Pré-chauffe le module PDF.js sans déclencher de scan. Utile si l'UI
 * veut charger ce gros bundle en arrière-plan plutôt que d'attendre
 * le premier .pdf déposé (utilisateur le verra au survol d'un bouton
 * « importer un PDF »).
 *
 * @returns Une promesse résolue quand le module est en cache.
 */
export function preloadPdfParser(): Promise<void> {
  return loadPdfjsModule().then(() => undefined);
}

/**
 * Rejoint les `TextItem` d'une page en chaîne lisible.
 * Filtre les `TextMarkedContent` (qui n'ont pas de `str`).
 * Insère un saut de ligne après les items marqués `hasEOL`.
 */
function joinTextItems(items: ReadonlyArray<unknown>): string {
  const parts: string[] = [];
  for (const item of items) {
    const candidate = item as PdfTextItem;
    if (typeof candidate.str !== "string") {
      continue;
    }
    parts.push(candidate.str);
    if (candidate.hasEOL) {
      parts.push("\n");
    } else {
      parts.push(" ");
    }
  }
  // Trim final + collapse des doubles espaces produits par
  // l'alternance EOL / non-EOL.
  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
