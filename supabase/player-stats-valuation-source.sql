alter table public.player_stats add column if not exists valuation_source text;
comment on column public.player_stats.valuation_source is 'Explicit external valuation source. federation preserves official valuation instead of recomputing it from incomplete box scores.';
