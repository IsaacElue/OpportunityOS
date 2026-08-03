const MAX_SEARCH_QUERY_LENGTH = 140;

function toWords(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Composes a keyword-style search query for Hacker News/GitHub. Reddit and
 * Hacker News search unstructured keyword phrases, not natural-language
 * sentences, so a naive concatenation of overlapping fields (e.g. an
 * industry name repeated inside a founder's raw message) reliably returns
 * zero hits even when relevant evidence exists. Words are deduplicated
 * case-insensitively and the result is capped so it stays keyword-shaped.
 *
 * `hints` (a founder's actual message, e.g. from chat) take priority over
 * `defaults` (onboarding preferences like industry/geography): searching
 * with both every time means an onboarding default having nothing to do
 * with what was actually asked (e.g. "Real estate" ahead of a message about
 * developer tooling) dilutes or zeroes out the results. Defaults are used
 * only when there is no specific hint to search on instead.
 */
export function buildSearchQuery({
  hints,
  defaults = []
}: {
  hints: Array<string | null | undefined>;
  defaults?: Array<string | null | undefined>;
}): string {
  const hintWords = toWords(hints);
  const words = hintWords.length > 0 ? hintWords : toWords(defaults);

  return words.join(" ").slice(0, MAX_SEARCH_QUERY_LENGTH).trim();
}
