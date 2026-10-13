create or replace function banquiger_private.lineup(p_ids jsonb,p_catalog jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
with recursive candidates as (
  select ids.id,ids.n::int as ordinal,p->>'position' as primary_position,
    jsonb_build_array(p->>'position') || coalesce(p->'secondaryPositions','[]'::jsonb) as eligible
  from jsonb_array_elements_text(p_ids) with ordinality ids(id,n)
  join jsonb_array_elements(p_catalog) p on p->>'id'=ids.id
), assignments(step,used,choices,slots,filled,secondary) as (
  select 0,'{}'::text[],'{}'::int[],'{}'::jsonb,0,0
  union all
  select a.step+1,
    case when c.id is null then a.used else array_append(a.used,c.id) end,
    array_append(a.choices,coalesce(c.ordinal,999)),
    a.slots || case when c.id is null then '{}'::jsonb else jsonb_build_object((array['Base','Escolta','Alero','Ala-Pívot','Pívot'])[a.step+1],c.id) end,
    a.filled+case when c.id is null then 0 else 1 end,
    a.secondary+case when c.id is not null and c.primary_position<>(array['Base','Escolta','Alero','Ala-Pívot','Pívot'])[a.step+1] then 1 else 0 end
  from assignments a cross join lateral (
    select c.id,c.ordinal,c.primary_position from candidates c
      where c.eligible ? (array['Base','Escolta','Alero','Ala-Pívot','Pívot'])[a.step+1] and not c.id=any(a.used)
    union all select null::text,null::int,null::text
  ) c where a.step<5
)
select slots from assignments where step=5 order by filled desc,secondary asc,choices asc limit 1;
$$;
revoke all on function banquiger_private.lineup(jsonb,jsonb) from public,anon,authenticated;

create or replace function banquiger_private.roster_guard() returns trigger language plpgsql security definer set search_path = '' as $$
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
  if TG_OP = 'UPDATE' and new.selected_ids is not distinct from old.selected_ids and new.selected_match_id is not distinct from old.selected_match_id then return new; end if;
  select r into v_round from public.game_data d, jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and not coalesce((r->>'scored')::boolean,false) order by (r->>'matchId')::bigint limit 1;
  if v_round is null or now() >= (v_round->>'deadline')::timestamptz or new.selected_match_id is distinct from (v_round->>'matchId')::bigint then raise exception 'El mercado de esta jornada está cerrado.'; end if;
  if jsonb_typeof(new.selected_ids) <> 'array' or jsonb_array_length(new.selected_ids)>7 or (select count(distinct x) from jsonb_array_elements_text(new.selected_ids) x) <> jsonb_array_length(new.selected_ids) then raise exception 'Plantilla no válida.'; end if;
  select payload into v_catalog from public.game_data where key='banquiger:players';
  if exists(select 1 from jsonb_array_elements_text(new.selected_ids) x where not exists(select 1 from jsonb_array_elements(v_catalog) p where p->>'id'=x and coalesce((p->>'active')::boolean,true))) then raise exception 'Jugador no disponible en el mercado.'; end if;
  if jsonb_array_length(new.selected_ids)=7 and (select count(*) from jsonb_object_keys(banquiger_private.lineup(new.selected_ids,v_catalog)))<>5 then raise exception 'Completa las cinco posiciones titulares.'; end if;
  select coalesce((select id::text from public.banquiger_teams where user_id=new.user_id and season=new.season),new.id::text) into v_team_id;
  select payload into v_state from public.game_data where key='banquiger:league-v2' for update;
  v_state := jsonb_set(v_state,array['snapshots',v_round->>'name'],coalesce(v_state->'snapshots'->(v_round->>'name'),'{}'::jsonb));
  v_path := array['snapshots',v_round->>'name',v_team_id];
  v_state := jsonb_set(v_state,v_path,new.selected_ids);
  update public.game_data set payload=v_state,updated_at=now() where key='banquiger:league-v2';
  return new;
end $$;
revoke all on function banquiger_private.roster_guard() from public,anon,authenticated;
drop trigger if exists banquiger_roster_guard on public.banquiger_teams;
create trigger banquiger_roster_guard before insert or update or delete on public.banquiger_teams for each row execute function banquiger_private.roster_guard();

create or replace function banquiger_private.use_card(p_instance text,p_targets jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_state jsonb; v_card jsonb; v_power jsonb; v_round jsonb; v_target jsonb; v_team public.banquiger_teams; v_owner public.banquiger_teams; v_use jsonb; v_ids jsonb; v_allowed jsonb; v_catalog jsonb; v_seen text[] := '{}'; v_index int;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para usar una carta.'; end if;
  select payload into v_state from public.game_data where key='banquiger:league-v2' for update;
  select c into v_card from jsonb_array_elements(v_state->'inventory') c where c->>'instanceId'=p_instance;
  select * into v_owner from public.banquiger_teams where id::text=v_card->>'sourceTeamId' and user_id=auth.uid() and season='2026-2027';
  if v_owner.id is null or v_card->>'status'<>'available' then raise exception 'Esta carta no está disponible.'; end if;
  select r into v_round from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and r->>'name'=v_card->>'round';
  if v_round is null or now()>=(v_round->>'deadline')::timestamptz or coalesce((v_round->>'scored')::boolean,false) then raise exception 'La carta ha caducado.'; end if;
  if exists(select 1 from jsonb_array_elements(v_state->'uses') u where u->>'round'=v_card->>'round' and u->>'sourceTeamId'=v_owner.id::text) then raise exception 'Solo puedes utilizar una carta por jornada.'; end if;
  -- Freeze the awarded definition: later admin edits cannot change a delivered card.
  v_power := v_card->'power';
  if jsonb_typeof(p_targets)<>'array' or jsonb_array_length(p_targets)<>(v_power->>'rivalCount')::int then raise exception 'Completa todos los objetivos.'; end if;
  v_allowed := v_card->'eligibleTeamIds';
  select payload into v_catalog from public.game_data where key='banquiger:players';
  for v_target in select * from jsonb_array_elements(p_targets) loop
    if (v_target->>'teamId')=any(v_seen) then raise exception 'Elige equipos distintos.'; end if;
    v_seen := array_append(v_seen,v_target->>'teamId');
    select * into v_team from public.banquiger_teams where id::text=v_target->>'teamId' and season=v_owner.season;
    if v_team.id is null or (v_power->>'type'='positive' and v_team.id<>v_owner.id) or (v_power->>'type'='negative' and not v_allowed ? v_team.id::text) then raise exception 'El rival debe haber quedado por delante de ti.'; end if;
    v_ids:=v_target->'playerIds';
    if jsonb_typeof(v_ids)<>'array' or (v_power->>'count'<>'7' and jsonb_array_length(v_ids)<>(v_power->>'count')::int) or (select count(distinct x) from jsonb_array_elements_text(v_ids) x)<>jsonb_array_length(v_ids) then raise exception 'Número de jugadores no válido.'; end if;
    if exists(select 1 from jsonb_array_elements_text(v_ids) x where not v_team.selected_ids ? x) then raise exception 'El jugador no pertenece a esa plantilla.'; end if;
    if coalesce((v_power->>'bench')::boolean,false) or coalesce((v_power->>'starterOnly')::boolean,false) then
      -- Use the same maximum matching as the browser for starter/bench eligibility.
      for v_index in 0..jsonb_array_length(v_ids)-1 loop
        if (not exists(select 1 from jsonb_each_text(banquiger_private.lineup(v_team.selected_ids,v_catalog)) slots where slots.value=v_ids->>v_index)) is distinct from coalesce((v_power->>'bench')::boolean,false) then raise exception 'Este poder requiere un titular o suplente específico.'; end if;
      end loop;
    end if;
  end loop;
  v_use := jsonb_build_object('id',gen_random_uuid()::text,'round',v_card->>'round','powerId',v_power->>'id','powerName',v_power->>'name','power',v_power,'sourceTeamId',v_owner.id::text,'sourceTeamName',v_owner.name,'targets',p_targets,'usedAt',now());
  v_state := jsonb_set(v_state,'{uses}',(v_state->'uses')||jsonb_build_array(v_use));
  select jsonb_agg(case when c->>'instanceId'=p_instance then c||'{"status":"used"}'::jsonb else c end) into v_ids from jsonb_array_elements(v_state->'inventory') c;
  v_state := jsonb_set(v_state,'{inventory}',v_ids);
  update public.game_data set payload=v_state,updated_at=now() where key='banquiger:league-v2';
  return banquiger_private.read_league();
end $$;
revoke all on function banquiger_private.use_card(text,jsonb) from public,anon;
grant execute on function banquiger_private.use_card(text,jsonb) to authenticated;
create or replace function public.banquiger_use_card(p_instance text,p_targets jsonb) returns jsonb language sql security invoker set search_path='' as $$ select banquiger_private.use_card(p_instance,p_targets) $$;
revoke all on function public.banquiger_use_card(text,jsonb) from public,anon;
grant execute on function public.banquiger_use_card(text,jsonb) to authenticated;


-- Activate the agreed pairs for existing market players; future admin edits use
-- positionsVersion=2, including an explicitly empty secondary position.
update public.game_data set payload=(select jsonb_agg(case when p->>'positionsVersion'='2' then p else p || jsonb_build_object('positionsVersion',2,'secondaryPositions',jsonb_build_array(case p->>'position' when 'Base' then 'Escolta' when 'Escolta' then 'Base' when 'Alero' then 'Escolta' when 'Ala-Pívot' then 'Pívot' when 'Pívot' then 'Ala-Pívot' end)) end) from jsonb_array_elements(payload) p),updated_at=now() where key='banquiger:players';
