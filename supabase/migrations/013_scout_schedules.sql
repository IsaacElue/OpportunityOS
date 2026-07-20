-- Persistent, organization-scoped schedule definitions for Scout objectives.

create table public.scout_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  objective_id uuid not null references public.scout_objectives(id),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  next_run_at timestamptz not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scout_schedules_organization_due_idx
  on public.scout_schedules (organization_id, next_run_at)
  where enabled;
create index scout_schedules_objective_idx on public.scout_schedules (objective_id);

create trigger scout_schedules_updated_at
  before update on public.scout_schedules
  for each row execute procedure public.set_updated_at();

alter table public.scout_schedules enable row level security;

create policy "scout_schedules_select_member" on public.scout_schedules for select using (
  public.is_org_member(organization_id)
);
