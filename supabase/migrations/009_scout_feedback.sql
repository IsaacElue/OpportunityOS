-- Phase 5: explicit founder feedback for Scout learning.

create table public.scout_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  opportunity_id uuid not null references public.opportunities(id),
  feedback_type text not null,
  note text,
  created_at timestamptz not null default now()
);

create index scout_feedback_organization_idx on public.scout_feedback (organization_id);
create index scout_feedback_user_idx on public.scout_feedback (user_id);
create index scout_feedback_opportunity_idx on public.scout_feedback (opportunity_id);

alter table public.scout_feedback enable row level security;

create policy "scout_feedback_select_member" on public.scout_feedback for select using (
  public.is_org_member(organization_id)
);
