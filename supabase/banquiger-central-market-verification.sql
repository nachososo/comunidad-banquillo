begin;
select set_config('request.jwt.claim.sub','3cf31456-f1ff-4724-92ed-d5cd186c7fa2',true);
-- All fixture changes and market calculations are rolled back.
update public.game_data set payload=(select jsonb_agg(case p->>'id'
 when '101' then p||'{"avgValuation":-2}'::jsonb
 when '104' then p||'{"avgValuation":4}'::jsonb
 when '109' then p||'{"avgValuation":-3}'::jsonb
 when '114' then p||'{"avgValuation":9}'::jsonb
 when '117' then p||'{"avgValuation":-100}'::jsonb
 when '201' then p||'{"price":0.8}'::jsonb else p end order by n)
 from jsonb_array_elements(payload) with ordinality x(p,n)) where key='banquiger:players';
update public.player_stats set minutes=null where match_id=22 and player_id=114;
update public.player_stats set minutes='00:00' where match_id=22 and player_id=117;
do $$ declare first_state jsonb; second_state jsonb; latest jsonb; begin
 first_state:=public.banquiger_refresh_market_prices();
 second_state:=public.banquiger_refresh_market_prices();
 if first_state is distinct from second_state then raise exception 'Double processing changed market'; end if;
 latest:=first_state->'history'->-1;
 if (first_state->'prices'->>'101')::numeric<>0.5 then raise exception 'Positive threshold failed'; end if;
 if (first_state->'prices'->>'104')::numeric<>0.7 then raise exception 'Stable performance failed'; end if;
 if (first_state->'prices'->>'109')::numeric<>0.4 then raise exception 'Negative threshold failed'; end if;
 if (first_state->'prices'->>'102')::numeric<>0.4 then raise exception 'Manual starting price/absence failed'; end if;
 if (first_state->'prices'->>'105')::numeric<>0.3 then raise exception 'Minimum price failed'; end if;
 if (first_state->'prices'->>'201')::numeric<>0.8 then raise exception 'Other team price changed'; end if;
 if (first_state->'prices'->>'114')::numeric<>1.3 or latest->'attendance'->>'114'<>'true' then raise exception 'Untimed appearance failed'; end if;
 if (first_state->'prices'->>'117')::numeric<>0.5 or latest->'attendance'->>'117'<>'false' then raise exception 'DNP row treated as appearance'; end if;
 if (latest->'referenceValuations'->>'101')::numeric<>-2 then raise exception 'Reference includes current match'; end if;
 if (select count(*) from jsonb_array_elements(first_state->'history') h where h->>'matchId'='22' and h->>'kind'='match')<>1 then raise exception 'Repeated history entry'; end if;
 if has_function_privilege('anon','public.banquiger_refresh_market_prices()','execute') then raise exception 'Anonymous mutation allowed'; end if;
end $$;
select '{"price_cases_passed":true,"idempotency":true,"attendance":true,"minimum":true,"team_scope":true,"reference_before_match":true,"anonymous_denied":true}'::jsonb as verification;
rollback;
