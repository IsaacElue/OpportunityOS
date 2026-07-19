-- Persistent, organization-scoped objectives for Scout.

create table public.scout_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  created_by uuid not null references auth.users(id),
  title text not null,
  goal text not null,
  preferences jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scout_objectives_organization_idx on public.scout_objectives (organization_id);
create index scout_objectives_created_by_idx on public.scout_objectives (created_by);
create index scout_objectives_status_idx on public.scout_objectives (status);

create trigger scout_objectives_updated_at
  before update on public.scout_objectives
  for each row execute procedure public.set_updated_at();

alter table public.scout_objectives enable row level security;

create policy "scout_objectives_select_member" on public.scout_objectives for select using (
  public.is_org_member(organization_id)
);
