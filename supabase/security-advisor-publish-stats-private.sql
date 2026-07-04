create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

do $$
begin
  if to_regprocedure('private.publish_official_stats_session(uuid,bigint,integer,integer,jsonb)') is null
     and to_regprocedure('public.publish_official_stats_session(uuid,bigint,integer,integer,jsonb)') is not null then
    alter function public.publish_official_stats_session(uuid, bigint, integer, integer, jsonb)
      set schema private;
  end if;
end
$$;

revoke execute on function private.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) from public, anon;
grant execute on function private.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) to authenticated;

create or replace function public.publish_official_stats_session(
  p_session_id uuid,
  p_match_id bigint,
  p_our_score integer,
  p_rival_score integer,
  p_stats jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.publish_official_stats_session(
    p_session_id,
    p_match_id,
    p_our_score,
    p_rival_score,
    p_stats
  )
$$;

revoke execute on function public.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) from public, anon;
grant execute on function public.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) to authenticated;
