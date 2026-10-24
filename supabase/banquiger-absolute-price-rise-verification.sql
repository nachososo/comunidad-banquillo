begin;
select set_config('request.jwt.claim.sub','3cf31456-f1ff-4724-92ed-d5cd186c7fa2',true);
update public.game_data set payload=jsonb_set(payload,'{history}',(select coalesce(jsonb_agg(h),'[]') from jsonb_array_elements(payload->'history') h where h->>'matchId'<>'23')) where key='banquiger:market-state';
update public.game_data set payload=(select jsonb_agg(r||jsonb_build_object('scored',r->>'matchId'='23') order by n) from jsonb_array_elements(payload) with ordinality x(r,n)) where key='banquiger:rounds';
update public.player_stats set field_goals='0-0',three_pointers='0-0',free_throws='0-0',offensive_rebounds=0,defensive_rebounds=0,assists=0,steals=0,blocks=0,turnovers=0,fouls=0,valuation_source='team-app',
 points=case player_id when 108 then 15 when 114 then 14 when 111 then 4 when 104 then 17 when 106 then 0 else points end
 where match_id=23;
update public.player_stats set minutes='00:00' where match_id=23 and player_id=102;
update public.game_data set payload=(select jsonb_agg(p||jsonb_build_object('price',0.5,'avgValuation',case p->>'id' when '108' then 20 when '114' then 14 when '111' then 2 when '104' then 10 when '106' then 5 else 0 end) order by n) from jsonb_array_elements(payload) with ordinality x(p,n)) where key='banquiger:players';
do $$ declare state jsonb; begin
 state:=public.banquiger_refresh_market_prices();
 if (state->'prices'->>'108')::numeric<>0.6 then raise exception '15 valuation must rise even below historic average'; end if;
 if (state->'prices'->>'114')::numeric<>0.5 then raise exception '14 valuation with no improvement must stay'; end if;
 if (state->'prices'->>'111')::numeric<>0.6 then raise exception 'Relative plus 2 must rise below 15'; end if;
 if (state->'prices'->>'104')::numeric<>0.6 then raise exception 'Both rise conditions must award only one 0.1 increase'; end if;
 if (state->'prices'->>'106')::numeric<>0.4 then raise exception 'Relative minus 5 must fall'; end if;
 if (state->'prices'->>'102')::numeric<>0.4 then raise exception 'DNP absence must fall'; end if;
 if (state->'prices'->>'201')::numeric<>0.5 then raise exception 'Other team must not change'; end if;
 if state is distinct from public.banquiger_refresh_market_prices() then raise exception 'Processing repeated'; end if;
end $$;
select '{"absolute_15":true,"relative_plus_2":true,"single_increase":true,"stable_under_threshold":true,"minus_5":true,"attendance":true,"idempotent":true}'::jsonb as verification;
rollback;
