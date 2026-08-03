-- Let a scan's execution resume across multiple short invocations instead of
-- running the entire pipeline inside one HTTP request. Holds the in-flight
-- evidence list and processing cursors between /execute calls; cleared once
-- the scan reaches a terminal status.
alter table public.scans
  add column scan_state jsonb;
