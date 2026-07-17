-- Phase 3.4: deterministic opportunity scoring dimensions.

alter table public.opportunities
  add column pain_score integer check (pain_score between 0 and 100),
  add column frequency_score integer check (frequency_score between 0 and 100),
  add column intent_score integer check (intent_score between 0 and 100),
  add column market_score integer check (market_score between 0 and 100),
  add column competition_gap_score integer check (competition_gap_score between 0 and 100),
  add column confidence_score integer check (confidence_score between 0 and 100);
