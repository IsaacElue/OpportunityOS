-- Manual RLS verification checklist for a Supabase SQL editor or CI database.
-- Run this with two test users (USER_A_ID, USER_B_ID) and their organization IDs.
-- The authenticated role must never be replaced with service_role for these checks.

-- 1. Set the JWT subject to USER_A_ID in a transaction:
-- select set_config('request.jwt.claim.sub', 'USER_A_ID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);

-- 2. These should return USER_A's rows only:
-- select id from public.profiles;
-- select id from public.organizations;
-- select organization_id from public.organization_members;
-- select id from public.scans;
-- select organization_id from public.founder_preferences;

-- 3. This should return zero rows when filtering USER_B's organization:
-- select id from public.scans where organization_id = 'USER_B_ORGANIZATION_ID';
-- select organization_id from public.founder_preferences where organization_id = 'USER_B_ORGANIZATION_ID';

-- 4. This insert must fail with an RLS violation (or return no row):
-- insert into public.scans (organization_id, requested_by, idempotency_key, filters, status, stage)
-- values ('USER_B_ORGANIZATION_ID', 'USER_A_ID', 'rls-test', '{}'::jsonb, 'queued', 'brief_created');

-- 5. Reset the transaction and repeat with USER_B. Cross-organization reads must
-- remain empty in both directions. The owner trigger itself runs as definer,
-- while application queries run with the authenticated user's RLS context.
