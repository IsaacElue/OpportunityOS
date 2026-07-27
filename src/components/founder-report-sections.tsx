type FounderReportValues = {
  problem: string | null;
  evidence_summary: string | null;
  buyer_profile: string | null;
  existing_workarounds: string | null;
  ai_advantage: string | null;
  mvp_suggestion: string | null;
  validation_experiment: string | null;
  confidence_score: number | null;
};

const sections = [
  ["Problem", "problem"],
  ["Evidence Summary", "evidence_summary"],
  ["Buyer Profile", "buyer_profile"],
  ["Existing Workarounds", "existing_workarounds"],
  ["AI Advantage", "ai_advantage"],
  ["MVP Suggestion", "mvp_suggestion"],
  ["Validation Experiment", "validation_experiment"]
] as const;

export function FounderReportSections({ report }: { report: FounderReportValues }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {sections.map(([label, key]) => <ReportSection key={key} label={label} content={report[key] as string | null} />)}
    <ReportSection label="Confidence Score" content={report.confidence_score == null ? null : String(report.confidence_score)} />
  </div>;
}

function ReportSection({ label, content }: { label: string; content: string | null }) {
  return <section className="rounded-lg bg-white/[0.04] p-4">
    <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{label}</h3>
    <p className="mt-2 text-sm leading-6">{content?.trim() || "Not available"}</p>
  </section>;
}
