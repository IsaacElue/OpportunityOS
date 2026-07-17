-- Phase 4.5: human-readable scan progress and execution counters.
-- `status` and `completed_at` are already part of public.scans; their
-- existing defaults and lifecycle remain unchanged.

alter table public.scans
  add column if not exists progress_stage text,
  add column if not exists progress_message text,
  add column if not exists evidence_count integer not null default 0 check (evidence_count >= 0),
  add column if not exists opportunity_count integer not null default 0 check (opportunity_count >= 0);
