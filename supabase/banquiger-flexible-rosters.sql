CREATE OR REPLACE FUNCTION banquiger_private.roster_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_round jsonb; v_state jsonb; v_path text[]; v_team_id text; v_catalog jsonb;
begin
  if TG_OP = 'DELETE' then
    if public.current_user_role() <> 'admin' then raise exception 'El equipo conserva su historial de jornadas.'; end if;
    return old;
  end if;
  if public.current_user_role() <> 'admin' and ((TG_OP='INSERT' and new.total_points <> 0) or (TG_OP='UPDATE' and new.total_points is distinct from old.total_points)) then
    raise exception 'La puntuación solo se actualiza al publicar la jornada.';
  end if;
  if new.season <> '2026-2027' then return new; end if;
  if TG_OP = 'UPDATE' and new.selected_ids is not distinct from old.selected_ids and new.selected_match_id is not distinct from old.selected_match_id and new.lineup_slots is not distinct from old.lineup_slots then return new; end if;
  select r into v_round from public.game_data d, jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and not coalesce((r->>'scored')::boolean,false) order by (r->>'matchId')::bigint limit 1;
  if v_round is null or now() >= (v_round->>'deadline')::timestamptz or new.selected_match_id is distinct from (v_round->>'matchId')::bigint then raise exception 'El mercado de esta jornada está cerrado.'; end if;
  if jsonb_typeof(new.selected_ids) <> 'array' or jsonb_array_length(new.selected_ids)>7 or (select count(distinct x) from jsonb_array_elements_text(new.selected_ids) x) <> jsonb_array_length(new.selected_ids) then raise exception 'Plantilla no válida.'; end if;
  select payload into v_catalog from public.game_data where key='banquiger:players';
  if exists(select 1 from jsonb_array_elements_text(new.selected_ids) x where not exists(select 1 from jsonb_array_elements(v_catalog) p where p->>'id'=x and coalesce((p->>'active')::boolean,true))) then raise exception 'Jugador no disponible en el mercado.'; end if;
  if new.lineup_slots is null or (TG_OP='UPDATE' and new.selected_ids is distinct from old.selected_ids and new.lineup_slots is not distinct from old.lineup_slots) then
    new.lineup_slots:=banquiger_private.full_slots(new.selected_ids,v_catalog);
  end if;
  if jsonb_typeof(new.lineup_slots)<>'array' or jsonb_array_length(new.lineup_slots)<>7 then raise exception 'Alineación no válida.'; end if;
  if exists(select 1 from jsonb_array_elements(new.lineup_slots) x where jsonb_typeof(x) not in ('string','null')) or
    (select count(*) from jsonb_array_elements_text(new.lineup_slots) x where x is not null)<>jsonb_array_length(new.selected_ids) or
    (select count(distinct x) from jsonb_array_elements_text(new.lineup_slots) x where x is not null)<>jsonb_array_length(new.selected_ids) or
    exists(select 1 from jsonb_array_elements_text(new.lineup_slots) x where x is not null and not new.selected_ids ? x) then raise exception 'Cada jugador debe aparecer una sola vez en su plantilla.'; end if;
  if jsonb_array_length(new.selected_ids)>=5 and (select count(*) from jsonb_object_keys(banquiger_private.lineup(new.selected_ids,v_catalog,new.lineup_slots)))<>5 then raise exception 'Completa las cinco posiciones titulares.'; end if;
  select coalesce((select id::text from public.banquiger_teams where user_id=new.user_id and season=new.season),new.id::text) into v_team_id;
  select payload into v_state from public.game_data where key='banquiger:league-v2' for update;
  v_state := jsonb_set(v_state,array['snapshots',v_round->>'name'],coalesce(v_state->'snapshots'->(v_round->>'name'),'{}'::jsonb));
  v_path := array['snapshots',v_round->>'name',v_team_id];
  v_state := jsonb_set(v_state,v_path,new.selected_ids);
  v_state:=jsonb_set(v_state,'{lineups}',coalesce(v_state->'lineups','{}'::jsonb));
  v_state:=jsonb_set(v_state,array['lineups',v_round->>'name'],coalesce(v_state->'lineups'->(v_round->>'name'),'{}'::jsonb));
  v_state:=jsonb_set(v_state,array['lineups',v_round->>'name',v_team_id],new.lineup_slots);
  update public.game_data set payload=v_state,updated_at=now() where key='banquiger:league-v2';
  return new;
end $function$
;
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
  if exists(select 1 from jsonb_array_elements(v_state->'results') r where r->>'round'=p_round) then return v_state; end if;
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
  return v_state;
end $function$
;
