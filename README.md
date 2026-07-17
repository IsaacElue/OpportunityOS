# OpportunityOS

Evidence-backed founder research for early-stage B2B SaaS founders.

## Milestone 1

This repository currently implements the SaaS shell only:

- landing page and premium UI foundation;
- Supabase email/password authentication;
- personal workspaces and Row Level Security;
- founder-preference onboarding;
- durable scan-brief creation;
- Founder Opportunity Report placeholders.

It intentionally does **not** ingest Reddit, Hacker News, GitHub Issues, or job postings; it does not invoke an AI provider or generate reports.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure Supabase as described in [supabase/README.md](supabase/README.md), then apply the migration before creating accounts.

## Architecture

- `src/app`: Next.js App Router pages and thin HTTP routes.
- `src/components`: UI and feature components.
- `src/lib/supabase`: browser/server/session helpers.
- `supabase/migrations`: versioned database and RLS foundation.

The next milestone should add durable jobs and source ingestion behind adapters. It must not be implemented inside browser routes or synchronous scan requests.
