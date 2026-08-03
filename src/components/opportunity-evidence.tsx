import { ExternalLink } from "lucide-react";

export type OpportunityEvidenceItem = {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  engagementScore: number;
  publishedAt: string | null;
  source: { type: string; platform: string | null; url: string | null } | null;
};

export function OpportunityEvidence({ evidence }: { evidence: OpportunityEvidenceItem[] }) {
  if (evidence.length === 0) return null;

  return <details className="group mt-5 border-t border-white/10 pt-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
      <span>Inspect supporting evidence</span>
      <span className="rounded-md bg-brand/10 px-2 py-1 text-xs text-brand">{evidence.length} {evidence.length === 1 ? "source" : "sources"}</span>
    </summary>
    <div className="mt-3 space-y-3">
      {evidence.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-medium">{item.title || "Untitled discussion"}</h4>
            <p className="mt-1 text-xs text-muted">{item.source?.platform || item.source?.type || "Evidence source"}{item.author ? ` · ${item.author}` : ""}{item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}</p>
          </div>
          <span className="shrink-0 rounded-md bg-white/[0.05] px-2 py-1 text-xs text-muted">Engagement {item.engagementScore}</span>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{item.content}</p>
        {item.source?.url ? <a href={item.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-[#c2ffda] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">
          Open original source <ExternalLink className="size-3.5" />
        </a> : null}
      </article>)}
    </div>
  </details>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Published date unavailable";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}
