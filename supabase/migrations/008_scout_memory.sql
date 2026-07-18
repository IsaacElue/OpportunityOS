-- Phase 5: organization-scoped memory for Scout.

create table public.scout_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  memory_type text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scout_memory_organization_idx on public.scout_memory (organization_id);
create index scout_memory_user_idx on public.scout_memory (user_id);
create index scout_memory_type_idx on public.scout_memory (memory_type);

create trigger scout_memory_updated_at
  before update on public.scout_memory
  for each row execute procedure public.set_updated_at();

alter table public.scout_memory enable row level security;

create policy "scout_memory_select_member" on public.scout_memory for select using (
  public.is_org_member(organization_id)
);
