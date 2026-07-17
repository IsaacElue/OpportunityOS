-- Phase 3.5: link discovered opportunities to their originating scans.

create table public.scan_opportunities (
  scan_id uuid not null references public.scans(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scan_id, opportunity_id)
);
create index scan_opportunities_opportunity_idx on public.scan_opportunities (opportunity_id);

alter table public.scan_opportunities enable row level security;
