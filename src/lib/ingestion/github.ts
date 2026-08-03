import type { EvidenceItem } from "@/lib/ingestion/types";

const GITHUB_SEARCH_URL = "https://api.github.com/search/issues";

type GitHubIssue = {
  title?: string | null;
  body?: string | null;
  html_url?: string | null;
  user?: { login?: string | null } | null;
  comments?: number | null;
  reactions?: { total_count?: number | null } | null;
  created_at?: string | null;
  pull_request?: unknown;
};

type GitHubSearchResponse = {
  items?: GitHubIssue[];
};

function publishedAt(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Fetch public GitHub issues matching a query. Works unauthenticated at low
 * volume (10 search requests/min); GITHUB_TOKEN, if set, raises that to 30/min
 * and is sent automatically.
 */
export async function fetchGithubEvidence(query: string, limit = 20): Promise<EvidenceItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("A GitHub search query is required.");

  const url = new URL(GITHUB_SEARCH_URL);
  url.searchParams.set("q", `${normalizedQuery} type:issue`);
  url.searchParams.set("sort", "comments");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(Math.min(Math.max(limit, 1), 100)));

  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "OpportunityOS/0.1 evidence research",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    next: { revalidate: 300 }
  });
  if (!response.ok) {
    throw new Error(`GitHub search failed with status ${response.status}.`);
  }

  const payload = await response.json() as GitHubSearchResponse;

  return (payload.items ?? []).flatMap((issue) => {
    if (issue.pull_request) return [];
    const title = issue.title?.trim();
    if (!title) return [];

    return [{
      title,
      content: issue.body?.trim() || title,
      url: issue.html_url?.trim() || undefined,
      author: issue.user?.login?.trim() || undefined,
      sourceType: "issue",
      platform: "github",
      engagementScore: Math.max(0, (issue.comments ?? 0) + (issue.reactions?.total_count ?? 0)),
      publishedAt: publishedAt(issue.created_at)
    }];
  });
}
