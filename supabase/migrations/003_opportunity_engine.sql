-- Phase 3.1: Opportunity Intelligence Engine foundation.
-- pgvector is enabled by the initial schema migration.

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  platform text,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sources_type_platform_idx on public.sources (type, platform);
create index sources_created_at_idx on public.sources (created_at desc);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  title text,
  content text not null,
  author text,
  engagement_score integer not null default 0,
  published_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (engagement_score >= 0)
);
create index evidence_source_published_idx on public.evidence (source_id, published_at desc);
create index evidence_published_at_idx on public.evidence (published_at desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text,
  problem text,
  persona text,
  industry text,
  description text,
  opportunity_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_score_created_idx on public.opportunities (opportunity_score desc nulls last, created_at desc);
create index opportunities_industry_idx on public.opportunities (industry) where industry is not null;

create table public.opportunity_evidence (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  primary key (opportunity_id, evidence_id)
);
create index opportunity_evidence_evidence_idx on public.opportunity_evidence (evidence_id);

create trigger sources_updated_at
  before update on public.sources
  for each row execute procedure public.set_updated_at();

create trigger evidence_updated_at
  before update on public.evidence
  for each row execute procedure public.set_updated_at();

create trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute procedure public.set_updated_at();

alter table public.sources enable row level security;
alter table public.evidence enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_evidence enable row level security;
