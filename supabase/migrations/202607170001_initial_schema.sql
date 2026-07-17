-- OpportunityOS foundation. This migration creates the approved data model only;
-- it intentionally does not schedule ingestion or invoke any AI provider.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.founder_preferences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  industries text[] not null default '{}',
  buyer_types text[] not null default '{}',
  geography text,
  risk_appetite text check (risk_appetite in ('low', 'medium', 'high')),
  goals text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(industries) <= 3),
  check (cardinality(buyer_types) <= 3),
  check (cardinality(goals) <= 3)
);

create table public.source_connectors (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('reddit', 'hacker_news', 'github_issues', 'job_postings')),
  enabled boolean not null default false,
  terms_url text,
  retention_policy jsonb not null default '{}'::jsonb,
  rate_limit_config jsonb not null default '{}'::jsonb,
  health_status text not null default 'disabled' check (health_status in ('disabled', 'healthy', 'degraded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.source_connectors (key, health_status) values
  ('reddit', 'disabled'), ('hacker_news', 'disabled'), ('github_issues', 'disabled'), ('job_postings', 'disabled');

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.source_connectors(id) on delete restrict,
  idempotency_key text not null unique,
  scope jsonb not null default '{}'::jsonb,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  cursor_in text,
  cursor_out text,
  started_at timestamptz,
  completed_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_accepted integer not null default 0 check (records_accepted >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.source_connectors(id) on delete restrict,
  external_id text not null,
  canonical_url text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  author_ref text,
  title text,
  content_excerpt text,
  content_storage_path text,
  content_hash text not null,
  language text,
  deleted_at timestamptz,
  retention_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (connector_id, external_id)
);
create unique index source_documents_canonical_url_unique on public.source_documents (canonical_url) where canonical_url is not null;
create index source_documents_connector_published_idx on public.source_documents (connector_id, published_at desc);
create index source_documents_retention_idx on public.source_documents (retention_expires_at) where retention_expires_at is not null;

create table public.source_document_versions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  content_hash text not null,
  storage_path text,
  fetched_at timestamptz not null default now(),
  change_reason text,
  unique (source_document_id, content_hash)
);

create table public.document_rejections (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  external_id text,
  reason_code text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null unique references public.source_documents(id) on delete cascade,
  signal_type text not null check (signal_type in ('pain', 'hiring', 'technology_shift', 'workaround')),
  problem_statement text,
  actor text,
  buyer_hint text,
  workflow text,
  workaround text,
  pain_indicators jsonb not null default '{}'::jsonb,
  industry_tags text[] not null default '{}',
  classification_status text not null default 'pending' check (classification_status in ('pending', 'accepted', 'rejected', 'needs_review')),
  classifier_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.signal_embeddings (
  signal_id uuid not null references public.signals(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  primary key (signal_id, embedding_model, content_hash)
);

create table public.opportunity_clusters (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  title text,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'candidate' check (status in ('candidate', 'qualified', 'rejected', 'published')),
  representative_signal_id uuid references public.signals(id) on delete set null,
  created_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now()
);

create table public.cluster_memberships (
  cluster_id uuid not null references public.opportunity_clusters(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  similarity numeric(5,4) check (similarity between 0 and 1),
  assigned_by text not null check (assigned_by in ('automatic', 'manual')),
  created_at timestamptz not null default now(),
  primary key (cluster_id, signal_id)
);

create table public.cluster_assessments (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.opportunity_clusters(id) on delete cascade,
  score_version text not null,
  evidence_strength numeric(5,2) not null check (evidence_strength between 0 and 100),
  pain_strength numeric(5,2) not null check (pain_strength between 0 and 100),
  buyer_clarity numeric(5,2) not null check (buyer_clarity between 0 and 100),
  workaround_strength numeric(5,2) not null check (workaround_strength between 0 and 100),
  momentum numeric(5,2) not null check (momentum between 0 and 100),
  ai_advantage numeric(5,2) not null check (ai_advantage between 0 and 100),
  commercial_signal numeric(5,2) not null check (commercial_signal between 0 and 100),
  saturation_penalty numeric(5,2) not null default 0 check (saturation_penalty between 0 and 100),
  confidence numeric(5,2) not null check (confidence between 0 and 100),
  total_score numeric(5,2) not null check (total_score between 0 and 100),
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index cluster_assessments_cluster_created_idx on public.cluster_assessments (cluster_id, created_at desc);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  filters jsonb not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  stage text not null default 'brief_created',
  progress smallint not null default 0 check (progress between 0 and 100),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_detail text,
  unique (organization_id, idempotency_key)
);
create index scans_organization_requested_idx on public.scans (organization_id, requested_at desc);
create index scans_status_idx on public.scans (status, requested_at asc);

create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_fingerprint text not null,
  output_fingerprint text,
  token_in integer check (token_in >= 0),
  token_out integer check (token_out >= 0),
  cost_usd numeric(12,6) check (cost_usd >= 0),
  latency_ms integer check (latency_ms >= 0),
  status text not null check (status in ('started', 'completed', 'failed')),
  trace_id text,
  created_at timestamptz not null default now()
);

create table public.founder_opportunity_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  cluster_id uuid references public.opportunity_clusters(id) on delete set null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'verified', 'published', 'withheld', 'superseded')),
  title text not null,
  problem text,
  buyer jsonb not null default '{}'::jsonb,
  current_workaround text,
  ai_advantage text,
  mvp_suggestion text,
  validation_experiment jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  confidence_rationale text,
  unknowns jsonb not null default '[]'::jsonb,
  model_run_id uuid references public.model_runs(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, cluster_id, version)
);
create index founder_reports_organization_published_idx on public.founder_opportunity_reports (organization_id, published_at desc);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.founder_opportunity_reports(id) on delete cascade,
  section text not null check (section in ('problem', 'evidence', 'buyer', 'current_workaround', 'ai_advantage', 'mvp_suggestion', 'validation_experiment', 'confidence')),
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  signal_id uuid references public.signals(id) on delete set null,
  claim_text text,
  excerpt text,
  excerpt_start integer check (excerpt_start >= 0),
  excerpt_end integer check (excerpt_end >= excerpt_start),
  evidence_role text not null check (evidence_role in ('primary', 'corroborating', 'counterevidence')),
  created_at timestamptz not null default now()
);
create index report_evidence_report_idx on public.report_evidence (report_id, section);

create table public.scan_reports (
  scan_id uuid not null references public.scans(id) on delete cascade,
  report_id uuid not null references public.founder_opportunity_reports(id) on delete cascade,
  rank smallint not null check (rank > 0),
  included_reason text,
  primary key (scan_id, report_id),
  unique (scan_id, rank)
);

create table public.saved_reports (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.founder_opportunity_reports(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (organization_id, report_id)
);

create table public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.founder_opportunity_reports(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  outcome text check (outcome in ('investigating', 'customer_interviews', 'rejected', 'building')),
  reason_code text,
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create table public.validation_experiments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid references public.founder_opportunity_reports(id) on delete set null,
  hypothesis text not null,
  method text not null,
  success_criterion text not null,
  status text not null default 'planned' check (status in ('planned', 'running', 'completed', 'cancelled')),
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  idempotency_key text not null,
  payload_ref text,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, idempotency_key)
);
create index jobs_status_scheduled_idx on public.jobs (status, scheduled_at);

create table public.job_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('started', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  trace_id text,
  unique (job_id, attempt_number)
);

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null,
  quantity numeric(12,3) not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id text,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = auth.uid());
$$;

create or replace function public.is_org_owner(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare organization_id uuid; workspace_name text;
begin
  insert into public.profiles (id, display_name) values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  workspace_name := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'My') || '''s workspace';
  insert into public.organizations (name, created_by) values (workspace_name, new.id) returning id into organization_id;
  insert into public.organization_members (organization_id, user_id, role) values (organization_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger preferences_updated_at before update on public.founder_preferences for each row execute procedure public.set_updated_at();
create trigger connectors_updated_at before update on public.source_connectors for each row execute procedure public.set_updated_at();
create trigger signals_updated_at before update on public.signals for each row execute procedure public.set_updated_at();
create trigger reports_updated_at before update on public.founder_opportunity_reports for each row execute procedure public.set_updated_at();
create trigger validation_experiments_updated_at before update on public.validation_experiments for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.founder_preferences enable row level security;
alter table public.scans enable row level security;
alter table public.founder_opportunity_reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.scan_reports enable row level security;
alter table public.saved_reports enable row level security;
alter table public.report_feedback enable row level security;
alter table public.validation_experiments enable row level security;
alter table public.source_connectors enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.source_documents enable row level security;
alter table public.source_document_versions enable row level security;
alter table public.document_rejections enable row level security;
alter table public.signals enable row level security;
alter table public.signal_embeddings enable row level security;
alter table public.opportunity_clusters enable row level security;
alter table public.cluster_memberships enable row level security;
alter table public.cluster_assessments enable row level security;
alter table public.model_runs enable row level security;
alter table public.jobs enable row level security;
alter table public.job_attempts enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations_select_member" on public.organizations for select using (public.is_org_member(id));
create policy "organizations_update_owner" on public.organizations for update using (public.is_org_owner(id)) with check (public.is_org_owner(id));
create policy "members_select_member" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "preferences_select_member" on public.founder_preferences for select using (public.is_org_member(organization_id));
create policy "preferences_insert_owner" on public.founder_preferences for insert with check (public.is_org_owner(organization_id));
create policy "preferences_update_owner" on public.founder_preferences for update using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));
create policy "scans_select_member" on public.scans for select using (public.is_org_member(organization_id));
create policy "scans_insert_member" on public.scans for insert with check (public.is_org_member(organization_id) and requested_by = auth.uid());
create policy "reports_select_member" on public.founder_opportunity_reports for select using (public.is_org_member(organization_id));
create policy "report_evidence_select_member" on public.report_evidence for select using (exists (select 1 from public.founder_opportunity_reports r where r.id = report_id and public.is_org_member(r.organization_id)));
create policy "scan_reports_select_member" on public.scan_reports for select using (exists (select 1 from public.scans s where s.id = scan_id and public.is_org_member(s.organization_id)));
create policy "saved_reports_select_member" on public.saved_reports for select using (public.is_org_member(organization_id));
create policy "saved_reports_insert_member" on public.saved_reports for insert with check (public.is_org_member(organization_id));
create policy "saved_reports_delete_member" on public.saved_reports for delete using (public.is_org_member(organization_id));
create policy "feedback_select_member" on public.report_feedback for select using (public.is_org_member(organization_id));
create policy "feedback_insert_member" on public.report_feedback for insert with check (public.is_org_member(organization_id));
create policy "experiments_select_member" on public.validation_experiments for select using (public.is_org_member(organization_id));
create policy "experiments_insert_member" on public.validation_experiments for insert with check (public.is_org_member(organization_id));
create policy "experiments_update_member" on public.validation_experiments for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_owner(uuid) from public;
grant execute on function public.is_org_member(uuid), public.is_org_owner(uuid) to authenticated;
