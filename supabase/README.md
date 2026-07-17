# Supabase setup

1. Create a Supabase project and enable Email auth in the dashboard.
2. Add the local and production URLs to **Authentication → URL Configuration**. Include `http://localhost:3000/auth/callback` for local development.
3. Copy `.env.example` to `.env.local` and set the project URL and publishable key. The service-role key is reserved for a future worker and is never exposed to browser code.
4. Apply `migrations/202607170001_initial_schema.sql` and then `migrations/202607170002_harden_auth_lifecycle.sql` through the Supabase CLI or SQL Editor.

The migration creates a personal organization when an auth user is created. If users existed before it was applied, backfill their profile and organization membership before enabling the application.

`source_connectors` are deliberately disabled. This milestone does not collect source content, enqueue jobs, or call a model.

The current milestone requires only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is reserved for a future server-only worker and is not read by the browser, route handlers, or environment helper.

For an authenticated RLS check, use the transaction checklist in `tests/rls-verification.sql` with two test users and two personal organizations. Do not run those checks as `service_role`, because that role bypasses RLS by design.
