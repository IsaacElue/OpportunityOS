-- Persistent, organization-scoped autonomous execution history for Scout.

create table public.scout_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  objective_id uuid not null references public.scout_objectives(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  steps_completed integer not null default 0 check (steps_completed >= 0),
  tools_used jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scout_executions_organization_created_idx
  on public.scout_executions (organization_id, created_at desc);
create index scout_executions_objective_idx on public.scout_executions (objective_id);
create index scout_executions_status_idx on public.scout_executions (status);

create trigger scout_executions_updated_at
  before update on public.scout_executions
  for each row execute procedure public.set_updated_at();

alter table public.scout_executions enable row level security;

create policy "scout_executions_select_member" on public.scout_executions for select using (
  public.is_org_member(organization_id)
);
