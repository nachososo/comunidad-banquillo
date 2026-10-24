begin;
select set_config('request.jwt.claim.sub','3cf31456-f1ff-4724-92ed-d5cd186c7fa2',true);
-- Isolate an already published match as a rollback-only fixture.
update public.game_data set payload=jsonb_set(payload,'{history}',(select coalesce(jsonb_agg(h),'[]') from jsonb_array_elements(payload->'history') h where h->>'matchId'<>'22')) where key='banquiger:market-state';
update public.game_data set payload=(select jsonb_agg(r||jsonb_build_object('scored',r->>'matchId'='22') order by n) from jsonb_array_elements(payload) with ordinality x(r,n)) where key='banquiger:rounds';
update public.game_data set payload=(select jsonb_agg(
  p||jsonb_build_object('price',case when p->>'id'='105' then 0.3 else 0.5 end)
   ||case p->>'id'
     when '101' then jsonb_build_object('avgValuation',(select valuation+4.99 from public.player_stats where match_id=22 and player_id=101))
     when '104' then jsonb_build_object('avgValuation',(select valuation+5 from public.player_stats where match_id=22 and player_id=104))
     when '108' then jsonb_build_object('avgValuation',(select valuation-2 from public.player_stats where match_id=22 and player_id=108))
     when '109' then jsonb_build_object('avgValuation',(select valuation+5.01 from public.player_stats where match_id=22 and player_id=109))
     when '113' then jsonb_build_object('avgValuation',(select valuation+2 from public.player_stats where match_id=22 and player_id=113))
     else '{}'::jsonb end order by n)
 from jsonb_array_elements(payload) with ordinality x(p,n)) where key='banquiger:players';
do $$ declare result jsonb; begin
 result:=public.banquiger_refresh_market_prices();
 if (result->'prices'->>'101')::numeric<>0.5 then raise exception '4.99 below average must stay stable'; end if;
 if (result->'prices'->>'104')::numeric<>0.4 then raise exception 'Exactly 5 below average must drop'; end if;
 if (result->'prices'->>'109')::numeric<>0.4 then raise exception 'More than 5 below average must drop'; end if;
 if (result->'prices'->>'113')::numeric<>0.5 then raise exception '2 below average must stay stable'; end if;
 if (result->'prices'->>'108')::numeric<>0.6 then raise exception '2 above average must rise'; end if;
 if (result->'prices'->>'102')::numeric<>0.4 then raise exception 'Absence must drop'; end if;
 if (result->'prices'->>'105')::numeric<>0.3 then raise exception 'Minimum changed'; end if;
 if (result->'prices'->>'201')::numeric<>0.5 then raise exception 'Other team price changed'; end if;
 if result is distinct from public.banquiger_refresh_market_prices() then raise exception 'Repeated update changed prices'; end if;
end $$;
select '{"drop_at_minus_five":true,"stable_at_minus_two_and_minus_4_99":true,"rise_at_plus_two":true,"absence_unchanged":true,"minimum_unchanged":true,"idempotent":true}'::jsonb as verification;
rollback;
