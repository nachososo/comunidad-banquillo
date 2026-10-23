create or replace function banquiger_private.refresh_market_prices() returns jsonb
language plpgsql security definer set search_path='' as $$
declare catalog jsonb; state jsonb; fixture record; p jsonb; updated_catalog jsonb; s public.player_stats;
  player_key text; prior numeric; next_price numeric; reference numeric; val numeric; delta numeric; games int; played boolean;
  prices jsonb; previous_prices jsonb; changes jsonb; reference_values jsonb; valuations jsonb; attendance jsonb; dirty boolean:=false;
begin
  if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Solo administración puede actualizar los precios.'; end if;
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
            val:=s.points+coalesce(s.offensive_rebounds,0)+coalesce(s.defensive_rebounds,0)+coalesce(s.assists,0)+coalesce(s.steals,0)+coalesce(s.blocks,0)-coalesce(s.turnovers,0)
              -case when s.field_goals ~ '^[0-9]+-[0-9]+$' then greatest(0,split_part(s.field_goals,'-',2)::int-split_part(s.field_goals,'-',1)::int) else 0 end
              -case when s.free_throws ~ '^[0-9]+-[0-9]+$' then greatest(0,split_part(s.free_throws,'-',2)::int-split_part(s.free_throws,'-',1)::int) else 0 end;
          end if;
        end if;
        delta:=case when not played then -0.1 when val-reference>=2 then 0.1 when val-reference<=-2 then -0.1 else 0 end;
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
    state:=state||jsonb_build_object('lastProcessedMatchId',fixture.id,'prices',prices,'previousPrices',previous_prices,'changes',changes,'rulesVersion',2,
      'history',coalesce(state->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('kind','match','matchId',fixture.id,'date',fixture.match_date,'processedAt',now(),'prices',prices,'previousPrices',previous_prices,'changes',changes,'referenceValuations',reference_values,'valuations',valuations,'attendance',attendance)));
    dirty:=true;
  end loop;
  if dirty then
    update public.game_data set payload=catalog,updated_at=now() where key='banquiger:players';
    update public.game_data set payload=state,updated_at=now() where key='banquiger:market-state';
  end if;
  return state;
end $$;
revoke all on function banquiger_private.refresh_market_prices() from public,anon,authenticated;
grant execute on function banquiger_private.refresh_market_prices() to authenticated;
create or replace function public.banquiger_refresh_market_prices() returns jsonb language sql security invoker set search_path='' as $$ select banquiger_private.refresh_market_prices() $$;
revoke all on function public.banquiger_refresh_market_prices() from public,anon;
grant execute on function public.banquiger_refresh_market_prices() to authenticated;
CREATE OR REPLACE FUNCTION banquiger_private.finalize_round(p_round text, p_ranking jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_state jsonb; v_round jsonb; v_next jsonb; v_entry jsonb; v_card jsonb; v_catalog jsonb; v_history jsonb; v_choices jsonb; v_power jsonb; v_rank int; v_n int; v_roll float; v_tier text; v_sign text; v_odds int[]; v_eligible jsonb; v_team public.banquiger_teams; v_snapshots jsonb; v_lineups jsonb;
begin
  if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Solo administración puede publicar una jornada.'; end if;
  select payload into v_state from public.game_data where key='banquiger:league-v2' for update;
  if exists(select 1 from jsonb_array_elements(v_state->'results') r where r->>'round'=p_round) then perform banquiger_private.refresh_market_prices(); return v_state; end if;
  select r into v_round from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and r->>'name'=p_round;
  if v_round is null or now()<(v_round->>'deadline')::timestamptz or not exists(select 1 from public.matches where id=(v_round->>'matchId')::bigint and status='finished') or not exists(select 1 from public.player_stats where match_id=(v_round->>'matchId')::bigint) then raise exception 'Publica primero el resultado y las estadísticas oficiales.'; end if;
  if exists(select 1 from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and (r->>'matchId')::bigint<(v_round->>'matchId')::bigint and not coalesce((r->>'scored')::boolean,false)) then raise exception 'Publica primero las jornadas anteriores.'; end if;
  if jsonb_typeof(p_ranking)<>'array' then raise exception 'Clasificación no válida.'; end if;
  v_n:=jsonb_array_length(p_ranking);
  if (select count(distinct x->>'id') from jsonb_array_elements(p_ranking) x)<>v_n then raise exception 'Hay equipos duplicados.'; end if;
  if v_n<>(select count(*) from public.banquiger_teams t where season='2026-2027' and created_at<(v_round->>'deadline')::timestamptz and jsonb_array_length(coalesce(v_state->'snapshots'->p_round->(t.id::text),t.selected_ids)) between 5 and 7) then raise exception 'Actualiza la lista de equipos antes de publicar.'; end if;
  v_snapshots:=coalesce(v_state->'snapshots'->p_round,'{}'::jsonb);
  v_lineups:=coalesce(v_state->'lineups'->p_round,'{}'::jsonb);
  for v_entry in select * from jsonb_array_elements(p_ranking) loop
    select * into v_team from public.banquiger_teams where id::text=v_entry->>'id' and season='2026-2027' and created_at<(v_round->>'deadline')::timestamptz;
    if v_team.id is null or v_entry->'selectedIds' is distinct from coalesce(v_snapshots->(v_team.id::text),v_team.selected_ids) then raise exception 'La alineación no coincide con la registrada.'; end if;
    if v_entry->'lineupSlots' is distinct from coalesce(v_lineups->(v_team.id::text),v_team.lineup_slots) then raise exception 'Los puestos no coinciden con la alineación registrada.'; end if;
    update public.banquiger_teams set total_points=total_points+(v_entry->>'points')::numeric where id=v_team.id;
    v_lineups:=jsonb_set(v_lineups,array[v_team.id::text],v_entry->'lineupSlots');
    v_snapshots:=jsonb_set(v_snapshots,array[v_team.id::text],v_entry->'selectedIds');
  end loop;
  v_state:=jsonb_set(v_state,array['snapshots',p_round],v_snapshots);
  v_state:=jsonb_set(v_state,'{lineups}',coalesce(v_state->'lineups','{}'::jsonb));
  v_state:=jsonb_set(v_state,array['lineups',p_round],v_lineups);
  v_state:=jsonb_set(v_state,'{results}',(v_state->'results')||jsonb_build_array(jsonb_build_object('round',p_round,'ranking',p_ranking,'publishedAt',now())));
  select r into v_next from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and (r->>'matchId')::bigint>(v_round->>'matchId')::bigint order by (r->>'matchId')::bigint limit 1;
  select payload into v_catalog from public.game_data where key='banquiger:powers';
  if v_n>=4 and v_next is not null then
    for v_rank in v_n-2..v_n loop
      v_entry:=p_ranking->(v_rank-1);
      v_odds:=case when v_rank=v_n then array[48,32,15,5] when v_rank=v_n-1 then array[56,30,11,3] else array[64,26,8,2] end;
      v_roll:=random()*100;
      v_tier:=case when v_roll<v_odds[1] then 'common' when v_roll<v_odds[1]+v_odds[2] then 'rare' when v_roll<100-v_odds[4] then 'epic' else 'legendary' end;
      v_sign:=case when random()<0.6 then 'positive' else 'negative' end;
      select coalesce(jsonb_agg(x->>'powerId'),'[]'::jsonb) into v_history from (select c from jsonb_array_elements(v_state->'inventory') with ordinality i(c,n) where c->>'sourceTeamId'=v_entry->>'id' order by n desc limit 3) h(x);
      select coalesce(jsonb_agg(p),'[]'::jsonb) into v_choices from jsonb_array_elements(v_catalog) p where p->>'rarity'=v_tier and p->>'type'=v_sign and coalesce((p->>'active')::boolean,true) and not v_history ? (p->>'id') and (v_sign='positive' or (p->>'rivalCount')::int<=v_rank-1);
      -- Disabled catalogs cannot strand a recipient: use any active eligible card.
      if jsonb_array_length(v_choices)=0 then select coalesce(jsonb_agg(p),'[]'::jsonb) into v_choices from jsonb_array_elements(v_catalog) p where coalesce((p->>'active')::boolean,true) and (p->>'type'='positive' or (p->>'rivalCount')::int<=v_rank-1) and not v_history ? (p->>'id'); end if;
      if jsonb_array_length(v_choices)=0 then continue; end if;
      v_power:=v_choices->floor(random()*jsonb_array_length(v_choices))::int;
      select coalesce(jsonb_agg(x->>'id'),'[]'::jsonb) into v_eligible from jsonb_array_elements(p_ranking) with ordinality r(x,n) where n<v_rank;
      v_card:=jsonb_build_object('instanceId',gen_random_uuid()::text,'powerId',v_power->>'id','power',v_power,'round',v_next->>'name','sourceTeamId',v_entry->>'id','status','available','awardedPosition',v_rank,'eligibleTeamIds',v_eligible,'awardedAt',now());
      v_state:=jsonb_set(v_state,'{inventory}',(v_state->'inventory')||jsonb_build_array(v_card));
    end loop;
  end if;
  update public.game_data set payload=v_state,updated_at=now() where key='banquiger:league-v2';
  update public.game_data set payload=(select jsonb_agg(case when r->>'name'=p_round then r||'{"scored":true,"status":"closed"}'::jsonb else r end) from jsonb_array_elements(payload) r),updated_at=now() where key='banquiger:rounds';
  perform banquiger_private.refresh_market_prices();
  return v_state;
end $function$
;
