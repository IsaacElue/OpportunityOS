const MAX_SEARCH_QUERY_LENGTH = 140;

/**
 * Composes a keyword-style search query for Hacker News/GitHub from filter
 * fields and free-text hints. Reddit and Hacker News search unstructured
 * keyword phrases, not natural-language sentences, so a naive concatenation
 * of overlapping fields (e.g. an industry name repeated inside a founder's
 * raw message) reliably returns zero hits even when relevant evidence
 * exists. Words are deduplicated case-insensitively and the result is capped
 * so it stays keyword-shaped.
 */
export function buildSearchQuery(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const words = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return words.join(" ").slice(0, MAX_SEARCH_QUERY_LENGTH).trim();
}
