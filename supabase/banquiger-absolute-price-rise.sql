CREATE OR REPLACE FUNCTION banquiger_private.refresh_market_prices()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare catalog jsonb; state jsonb; fixture record; p jsonb; updated_catalog jsonb; s public.player_stats;
  player_key text; prior numeric; next_price numeric; reference numeric; val numeric; delta numeric; games int; played boolean;
  prices jsonb; previous_prices jsonb; changes jsonb; reference_values jsonb; valuations jsonb; attendance jsonb; dirty boolean:=false;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'admin' then raise exception 'Solo administración puede actualizar los precios.'; end if;
  select payload into catalog from public.game_data where key='banquiger:players' for update;
  select payload into state from public.game_data where key='banquiger:market-state' for update;
  if catalog is null or state is null then raise exception 'Falta el catálogo o el registro del mercado.'; end if;
  for fixture in
    select m.id,m.match_date from public.matches m
    where m.team='masculine' and m.season='2026-2027' and m.status='finished'
      and exists(select 1 from public.player_stats recorded_stats where recorded_stats.match_id=m.id)
      and exists(select 1 from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and r->>'matchId'=m.id::text and coalesce((r->>'scored')::boolean,false))
    order by m.match_date,m.match_time,m.id
  loop
    if exists(select 1 from jsonb_array_elements(coalesce(state->'history','[]'::jsonb)) h where h->>'matchId'=fixture.id::text and coalesce(h->>'kind','match')='match') then continue; end if;
    prices:='{}'; previous_prices:='{}'; changes:='{}'; reference_values:='{}'; valuations:='{}'; attendance:='{}'; updated_catalog:='[]';
    for p in select * from jsonb_array_elements(catalog) loop
      player_key:=p->>'id';
      prior:=coalesce((p->>'price')::numeric,(state->'prices'->>player_key)::numeric,0.3);
      next_price:=prior; delta:=0;
      if p->>'team'='masculine' and coalesce((p->>'active')::boolean,true) then
        select * into s from public.player_stats where match_id=fixture.id and player_id::text=player_key;
        played:=s.player_id is not null and (s.minutes is null or btrim(s.minutes) not in ('00:00','0:00','-',''));
        reference:=coalesce((p->>'avgValuation')::numeric,0); val:=0;
        if played then
          if s.valuation_source in ('federation','federation-direct') and s.valuation is not null then val:=s.valuation;
          else
            val:=s.points+coalesce(s.offensive_rebounds,0)+coalesce(s.defensive_rebounds,0)+coalesce(s.assists,0)+coalesce(s.steals,0)+coalesce(s.blocks,0)-coalesce(s.turnovers,0)-coalesce(s.fouls,0)
              -case when s.field_goals ~ '^[0-9]+-[0-9]+$' then greatest(0,split_part(s.field_goals,'-',2)::int-split_part(s.field_goals,'-',1)::int) else 0 end
              -case when s.free_throws ~ '^[0-9]+-[0-9]+$' then greatest(0,split_part(s.free_throws,'-',2)::int-split_part(s.free_throws,'-',1)::int) else 0 end;
          end if;
        end if;
        delta:=case when not played then -0.1 when val>=15 or val-reference>=2 then 0.1 when val-reference<=-5 then -0.1 else 0 end;
        next_price:=greatest(0.3,round(prior+delta,1)); delta:=next_price-prior;
        reference_values:=jsonb_set(reference_values,array[player_key],to_jsonb(reference));
        valuations:=jsonb_set(valuations,array[player_key],case when played then to_jsonb(val) else 'null'::jsonb end);
        attendance:=jsonb_set(attendance,array[player_key],to_jsonb(played));
        if played then
          games:=coalesce((p->>'games')::int,0);
          p:=p||jsonb_build_object('avgValuation',(reference*games+val)/(games+1),'games',games+1,'lastValuation',val);
        end if;
      end if;
      prices:=jsonb_set(prices,array[player_key],to_jsonb(next_price));
      previous_prices:=jsonb_set(previous_prices,array[player_key],to_jsonb(prior));
      changes:=jsonb_set(changes,array[player_key],to_jsonb(delta));
      p:=p||jsonb_build_object('price',next_price,'previousPrice',prior,'lastPriceChange',delta,'lastMatchId',fixture.id);
      updated_catalog:=updated_catalog||jsonb_build_array(p);
    end loop;
    catalog:=updated_catalog;
    state:=state||jsonb_build_object('lastProcessedMatchId',fixture.id,'prices',prices,'previousPrices',previous_prices,'changes',changes,'rulesVersion',3,
      'history',coalesce(state->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('kind','match','rules',jsonb_build_object('riseAbsolute',15,'riseRelative',2,'dropRelative',-5),'matchId',fixture.id,'date',fixture.match_date,'processedAt',now(),'prices',prices,'previousPrices',previous_prices,'changes',changes,'referenceValuations',reference_values,'valuations',valuations,'attendance',attendance)));
    dirty:=true;
  end loop;
  if dirty then
    update public.game_data set payload=catalog,updated_at=now() where key='banquiger:players';
    update public.game_data set payload=state,updated_at=now() where key='banquiger:market-state';
  end if;
  return state;
end $function$
;
