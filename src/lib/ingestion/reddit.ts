import type { EvidenceItem } from "@/lib/ingestion/types";

const REDDIT_SEARCH_URL = "https://www.reddit.com/search.json";

type RedditPost = {
  title?: string | null;
  selftext?: string | null;
  permalink?: string | null;
  author?: string | null;
  score?: number | null;
  created_utc?: number | null;
};

type RedditSearchResponse = {
  data?: {
    children?: Array<{
      data?: RedditPost;
    }>;
  };
};

function publishedAt(value: number | null | undefined) {
  if (typeof value !== "number") return undefined;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Fetch public Reddit discussions matching a query across relevant subreddits. */
export async function fetchRedditEvidence(query: string, limit = 20): Promise<EvidenceItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("A Reddit search query is required.");

  const url = new URL(REDDIT_SEARCH_URL);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("type", "link");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  url.searchParams.set("raw_json", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OpportunityOS/0.1 evidence research"
    },
    next: { revalidate: 300 }
  });
  if (!response.ok) {
    throw new Error(`Reddit search failed with status ${response.status}.`);
  }

  const payload = await response.json() as RedditSearchResponse;

  return (payload.data?.children ?? []).flatMap(({ data }) => {
    const title = data?.title?.trim();
    if (!title) return [];

    return [{
      title,
      content: data?.selftext?.trim() || title,
      url: data?.permalink ? new URL(data.permalink, "https://www.reddit.com").toString() : undefined,
      author: data?.author?.trim() || undefined,
      sourceType: "discussion",
      platform: "reddit",
      engagementScore: Math.max(0, data?.score ?? 0),
      publishedAt: publishedAt(data?.created_utc)
    }];
  });
}
