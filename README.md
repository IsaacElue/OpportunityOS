# OpportunityOS

**An AI research teammate that turns real founder pain into evidence-backed startup opportunities.**

## The problem

Founders don't have too few ideas — they have too little reliable signal. Existing idea-generation tools generate generic suggestions, lean on shallow market assumptions, and stop at "here's an idea" without showing their work or helping you decide what to do next.

## The solution

OpportunityOS is not an idea generator. It's an AI opportunity research employee — **Scout** — that continuously investigates real developer and founder communities, detects repeated pain rather than one-off complaints, and turns that evidence into ranked, source-linked opportunity reports.

Ask Scout to investigate a market or problem, and it:

1. Searches live founder and developer communities for real discussion.
2. Collects and deduplicates evidence so the same pain isn't double-counted.
3. Extracts a specific problem, affected persona, and severity from each signal.
4. Groups repeated signals into a single corroborated opportunity, not a stack of one-off guesses.
5. Scores and ranks opportunities by evidence strength, not vibes.
6. Generates a Founder Opportunity Report — problem, buyer, existing workarounds, AI advantage, MVP suggestion, and a validation experiment — every claim traceable back to its source.
7. Explains its reasoning and confidence, and says plainly when the evidence isn't strong enough to recommend anything.

## Product philosophy

- **Evidence first.** No invented market sizes, no fabricated competitors. Every claim traces back to a real, inspectable source.
- **Honesty over false confidence.** If the evidence doesn't support a high-confidence opportunity, Scout says so instead of publishing a weak report.
- **A teammate, not a dashboard.** Conversational, opinionated, and founder-focused — Scout investigates, remembers your preferences, and tells you what it's noticing, not just what it found.

## How it works today

- **Frontend:** Next.js 15, TypeScript, Tailwind, Supabase Auth with organization-scoped Row Level Security.
- **Evidence sources:** Hacker News and GitHub Issues, with more sources planned.
- **Intelligence:** OpenAI-backed structured extraction, deduplication, scoring, and report generation, orchestrated as a resumable pipeline so long-running research survives serverless request limits.
- **Scout:** a conversational research agent with persistent memory, objectives, and live investigation timelines, reasoning over each founder's actual research context rather than canned responses.

## Status

Active MVP development. The core pipeline — investigate, collect evidence, extract, score, and report — runs end to end. Current focus is reliability and evidence quality before expanding to more sources, deeper agentic tool use, and founder-facing report/workspace management.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure Supabase as described in [supabase/README.md](supabase/README.md), then apply migrations in order before creating accounts.

## Architecture

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: UI and feature components.
- `src/lib/ingestion`: evidence source connectors (Hacker News, GitHub).
- `src/lib/intelligence`: opportunity extraction, deduplication, scoring.
- `src/lib/reports`: founder opportunity report generation.
- `src/lib/scans`: resumable research pipeline orchestration.
- `src/lib/scout`: Scout's brain, memory, objectives, tools, and conversation handling.
- `supabase/migrations`: versioned database schema and RLS policies.
