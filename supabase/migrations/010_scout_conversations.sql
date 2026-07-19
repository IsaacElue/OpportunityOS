-- Phase: persistent recent conversation context for Scout.

create table public.scout_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scout_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.scout_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index scout_conversations_organization_user_updated_idx
  on public.scout_conversations (organization_id, user_id, updated_at desc);
create index scout_messages_conversation_created_idx
  on public.scout_messages (conversation_id, created_at desc);

create trigger scout_conversations_updated_at
  before update on public.scout_conversations
  for each row execute procedure public.set_updated_at();

alter table public.scout_conversations enable row level security;
alter table public.scout_messages enable row level security;

create policy "scout_conversations_select_member" on public.scout_conversations for select using (
  public.is_org_member(organization_id)
);

create policy "scout_messages_select_member" on public.scout_messages for select using (
  exists (
    select 1
    from public.scout_conversations c
    where c.id = conversation_id
      and public.is_org_member(c.organization_id)
  )
);
