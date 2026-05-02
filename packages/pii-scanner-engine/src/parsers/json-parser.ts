/**
 * Parseur JSON : parse l'intégralité du fichier puis émet une `TextChunk`
 * par valeur de type `string` rencontrée lors d'un parcours récursif.
 *
 * Choix v0.2.0 : pas de streaming JSON. JSON.parse natif est très rapide
 * et la stratégie streaming (Oboe.js, clarinet…) introduit ~30 kB +
 * une dépendance. Tant qu'on cible des fichiers bureautiques (cf. cadrage
 * § 4.2), le coût mémoire d'un parse complet reste acceptable. Streaming
 * sera réévalué avec `ndjson` plein-flux en v0.3+ si un cas usage le
 * justifie.
 *
 * Le `path` produit est de la forme `users[3].email` (tableaux entre
 * crochets, propriétés en notation pointée). Permet à l'UI d'afficher
 * « Email détecté dans `users[3].email` » sans ambiguïté.
 */
import type { FileParser, ParserInput, TextChunk } from "./types.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Échappe un nom de propriété pour qu'il reste lisible dans `path`. */
function formatProperty(key: string): string {
  // Identifiant ECMAScript-like : pas d'espace, pas de point, pas de
  // crochet, ne commence pas par un chiffre. Sinon, notation crochets
  // avec quotes.
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }
  return `[${JSON.stringify(key)}]`;
}

/**
 * Parcourt récursivement la valeur JSON et émet les chaînes via le
 * générateur. Itératif sur une pile pour éviter de saturer le stack
 * sur des structures profondes.
 */
function* walk(root: JsonValue): IterableIterator<TextChunk> {
  type Frame = { value: JsonValue; path: string };
  const stack: Frame[] = [{ value: root, path: "$" }];
  while (stack.length > 0) {
    const frame = stack.pop();
    // `pop()` ne renvoie undefined que si stack est vide, ce que la
    // condition while interdit ; le ! est sûr mais on garde la garde
    // pour satisfaire noUncheckedIndexedAccess.
    if (frame === undefined) {
      continue;
    }
    const { value, path } = frame;
    if (typeof value === "string") {
      yield { text: value, path };
      continue;
    }
    if (value === null || typeof value !== "object") {
      // number, boolean, null : pas de PII textuelle à scanner.
      continue;
    }
    if (Array.isArray(value)) {
      // Empile en ordre inverse pour préserver l'ordre de visite à
      // gauche-à-droite quand on dépile.
      for (let i = value.length - 1; i >= 0; i--) {
        const child = value[i];
        if (child !== undefined) {
          stack.push({ value: child, path: `${path}[${i}]` });
        }
      }
      continue;
    }
    // Objet : on empile dans l'ordre inverse des clés pour que le
    // dépilement respecte `Object.keys` (utile pour rendre les tests
    // déterministes).
    const keys = Object.keys(value);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      if (key === undefined) {
        continue;
      }
      const child = value[key];
      if (child !== undefined) {
        stack.push({ value: child, path: `${path}${formatProperty(key)}` });
      }
    }
  }
}

export const jsonParser: FileParser = {
  format: "json",
  async *parse(input: ParserInput): AsyncIterable<TextChunk> {
    const raw = await input.text();
    let root: JsonValue;
    try {
      // Cast acceptable : JSON.parse renvoie any, mais notre walker
      // gère explicitement string / number / boolean / null / array /
      // object (les seuls types JSON valides). Toute valeur non-JSON
      // serait bloquée par JSON.parse en amont.
      root = JSON.parse(raw) as JsonValue;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Le fichier « ${input.name} » n'est pas un JSON valide : ${message}`,
      );
    }
    yield* walk(root);
  },
};
