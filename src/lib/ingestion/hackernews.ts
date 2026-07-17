import type { EvidenceItem } from "@/lib/ingestion/types";

const HACKER_NEWS_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date";

type HackerNewsHit = {
  title?: string | null;
  story_title?: string | null;
  story_text?: string | null;
  url?: string | null;
  story_url?: string | null;
  author?: string | null;
  points?: number | null;
  created_at?: string | null;
};

type HackerNewsSearchResponse = {
  hits?: HackerNewsHit[];
};

function publishedAt(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Fetch the most recent Hacker News stories matching a query. */
export async function fetchHackerNewsEvidence(query: string, limit = 20): Promise<EvidenceItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("A Hacker News search query is required.");

  const url = new URL(HACKER_NEWS_SEARCH_URL);
  url.searchParams.set("query", normalizedQuery);
  url.searchParams.set("tags", "story");
  url.searchParams.set("hitsPerPage", String(Math.min(Math.max(limit, 1), 100)));

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Hacker News search failed with status ${response.status}.`);
  }

  const payload = await response.json() as HackerNewsSearchResponse;

  return (payload.hits ?? []).flatMap((hit) => {
    const title = hit.title?.trim() || hit.story_title?.trim();
    if (!title) return [];

    return [{
      title,
      content: hit.story_text?.trim() || title,
      url: hit.url?.trim() || hit.story_url?.trim() || undefined,
      author: hit.author?.trim() || undefined,
      sourceType: "story",
      platform: "hacker_news",
      engagementScore: Math.max(0, hit.points ?? 0),
      publishedAt: publishedAt(hit.created_at)
    }];
  });
}
