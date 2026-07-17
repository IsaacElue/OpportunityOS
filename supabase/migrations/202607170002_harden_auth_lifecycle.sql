-- Make the auth trigger safe to re-run during retries or account migration.
-- A Supabase auth user is the ownership root; one personal organization is
-- created per user and membership is never duplicated.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  workspace_name text;
  display_name text;
begin
  display_name := nullif(new.raw_user_meta_data ->> 'display_name', '');
  workspace_name := coalesce(display_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'My') || '''s workspace';

  insert into public.profiles (id, display_name)
    values (new.id, display_name)
    on conflict (id) do update set display_name = coalesce(excluded.display_name, public.profiles.display_name);

  select o.id into workspace_id
    from public.organizations o
    where o.created_by = new.id
    order by o.created_at asc
    limit 1;

  if workspace_id is null then
    insert into public.organizations (name, created_by)
      values (workspace_name, new.id)
      returning id into workspace_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
    values (workspace_id, new.id, 'owner')
    on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
