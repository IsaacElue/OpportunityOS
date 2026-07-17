-- Phase 4.7.1: persisted opportunity reports derived from source-backed opportunities.

create table public.opportunity_reports (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  problem text,
  evidence_summary text,
  buyer_profile text,
  existing_workarounds text,
  ai_advantage text,
  mvp_suggestion text,
  validation_experiment text,
  confidence_score integer check (confidence_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunity_reports_opportunity_idx on public.opportunity_reports (opportunity_id);

create trigger opportunity_reports_updated_at
  before update on public.opportunity_reports
  for each row execute procedure public.set_updated_at();

alter table public.opportunity_reports enable row level security;

create policy "opportunity_reports_select_member" on public.opportunity_reports for select using (
  exists (
    select 1
    from public.scan_opportunities so
    join public.scans s on s.id = so.scan_id
    where so.opportunity_id = public.opportunity_reports.opportunity_id
      and public.is_org_member(s.organization_id)
  )
);
