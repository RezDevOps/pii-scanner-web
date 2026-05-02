/**
 * Parseur HTML — zéro dépendance runtime.
 *
 * Utilise `DOMParser` (disponible nativement en navigateur, fourni par
 * `happy-dom` en environnement de test Vitest). Parcourt l'arbre DOM en
 * profondeur en ignorant `<script>`, `<style>`, `<noscript>` et les
 * commentaires (qui ne sont pas du contenu visible et risqueraient de
 * remonter du code embarqué comme des findings).
 *
 * Émet un `TextChunk` par nœud texte non-vide, avec un `path` reflétant
 * le chemin DOM jusqu'au parent (ex. `body > main > p[2]`). Cette
 * granularité permet à l'UI v0.3 de pointer l'occurrence à l'utilisateur
 * « titre principal », « 3ᵉ paragraphe », etc.
 *
 * Pas d'extraction des attributs (`alt`, `title`, `aria-label`) : les PII
 * y sont rares en pratique, et les inclure ferait exploser le bruit. Sera
 * réévalué si retours utilisateur le demandent.
 */
import type { FileFormat } from "../types.js";
import type { FileParser, ParserInput, TextChunk } from "./types.js";

/**
 * Tags dont le contenu textuel est ignoré : ce ne sont pas du texte
 * éditorial mais du code ou du contenu inactif.
 */
const SKIPPED_TAGS: ReadonlySet<string> = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
]);

/**
 * Constantes Node Types — équivalentes à `Node.TEXT_NODE` etc., mais
 * recopiées en littéraux pour ne pas dépendre du runtime DOM dans la
 * couche type. (En navigateur et en happy-dom, les constantes existent
 * et ont les mêmes valeurs.)
 */
const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

/** Sous-ensemble structural des `Node` DOM utilisé par le parseur. */
interface MinimalNode {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly nodeValue: string | null;
  readonly childNodes: ArrayLike<MinimalNode>;
  readonly parentNode: MinimalNode | null;
}

/**
 * Parseur HTML statique (pas de fetch des sous-ressources, pas
 * d'exécution du JS embarqué — `DOMParser` ne le fait pas non plus).
 */
export const htmlParser: FileParser = {
  format: "html",
  async *parse(input: ParserInput): AsyncIterable<TextChunk> {
    const html = await input.text();
    if (typeof DOMParser === "undefined") {
      throw new Error(
        "DOMParser indisponible : l'environnement n'est pas un navigateur ni happy-dom. " +
          "Ajouter `// @vitest-environment happy-dom` en tête du fichier de test si besoin.",
      );
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    // `doc.documentElement` peut être null sur du HTML très dégradé
    // (chaîne vide). On échoue silencieusement (zéro chunk) plutôt que
    // de lever — c'est cohérent avec « un fichier vide produit zéro
    // finding » qui est la sémantique des autres parseurs.
    const root = doc.documentElement as unknown as MinimalNode | null;
    if (!root) {
      return;
    }
    yield* walk(root);
  },
};

/** Liste blanche des formats traités par ce parseur. */
export const HTML_PARSER_FORMATS: ReadonlyArray<FileFormat> = ["html"];

/**
 * Parcourt récursivement l'arbre DOM en profondeur (DFS pré-ordre) et
 * émet les nœuds texte non-vides. Le path est calculé paresseusement à
 * la première émission d'un nœud texte sous un parent donné — évite de
 * concaténer le path pour les nombreux nœuds texte « blancs » filtrés.
 */
async function* walk(root: MinimalNode): AsyncIterable<TextChunk> {
  // Pile : { node, indexInParent }
  // On itère récursivement par fonction interne pour que le path
  // s'accumule naturellement le long de la descente.
  yield* walkNode(root, "");
}

async function* walkNode(
  node: MinimalNode,
  parentPath: string,
): AsyncIterable<TextChunk> {
  if (node.nodeType === NODE_TYPE_ELEMENT) {
    const tag = node.nodeName.toUpperCase();
    if (SKIPPED_TAGS.has(tag)) {
      return;
    }
    const myPath = appendPath(parentPath, tag, node);
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) {
        continue;
      }
      yield* walkNode(child, myPath);
    }
    return;
  }
  if (node.nodeType === NODE_TYPE_TEXT) {
    const value = node.nodeValue ?? "";
    // Filtrer les nœuds purement blancs (indentation HTML) : ils
    // gonflent le rapport sans valeur ajoutée. On émet dès qu'il y a
    // un caractère non-espace.
    if (!/\S/.test(value)) {
      return;
    }
    // `exactOptionalPropertyTypes` interdit `path: undefined` en
    // littéral : on omet la propriété quand le path est vide
    // (texte directement sous le root, cas dégénéré).
    yield parentPath ? { text: value, path: parentPath } : { text: value };
  }
  // Autres types (commentaires nodeType=8, document fragments…) : on
  // ignore.
}

/**
 * Calcule un path lisible : `body > main > p[2]`. L'index entre crochets
 * n'est ajouté que s'il existe au moins un frère du même tag, pour
 * garder les paths courts dans les cas simples (`html > body > h1`).
 */
function appendPath(
  parentPath: string,
  tag: string,
  node: MinimalNode,
): string {
  const segment = tag.toLowerCase();
  const occurrence = computeOccurrence(node, tag);
  const annotated = occurrence === null ? segment : `${segment}[${occurrence}]`;
  return parentPath ? `${parentPath} > ${annotated}` : annotated;
}

/**
 * Retourne `null` si `node` est le seul enfant de son parent portant ce
 * tag (path court), sinon son index 1-based parmi les frères du même tag.
 */
function computeOccurrence(node: MinimalNode, tag: string): number | null {
  const parent = node.parentNode;
  if (!parent) {
    return null;
  }
  const siblings = parent.childNodes;
  let total = 0;
  let myIndex = 0;
  for (let i = 0; i < siblings.length; i++) {
    const sib = siblings[i];
    if (!sib || sib.nodeType !== NODE_TYPE_ELEMENT) {
      continue;
    }
    if (sib.nodeName.toUpperCase() === tag) {
      total++;
      if (sib === node) {
        myIndex = total;
      }
    }
  }
  return total > 1 ? myIndex : null;
}
