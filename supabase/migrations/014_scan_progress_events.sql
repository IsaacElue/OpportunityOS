-- Persist the observable investigation timeline without replacing the scan's
-- current progress snapshot. Each row represents a real runner transition.
create table public.scan_progress_events (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  stage text not null,
  message text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  opportunity_count integer not null default 0 check (opportunity_count >= 0),
  created_at timestamptz not null default now()
);

create index scan_progress_events_scan_created_idx
  on public.scan_progress_events (scan_id, created_at asc);

alter table public.scan_progress_events enable row level security;

create policy "scan_progress_events_select_member"
  on public.scan_progress_events for select using (
    exists (
      select 1
      from public.scans s
      where s.id = public.scan_progress_events.scan_id
        and public.is_org_member(s.organization_id)
    )
  );
