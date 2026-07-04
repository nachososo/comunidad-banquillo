create or replace function public.publish_official_stats_session(
  p_session_id uuid,
  p_match_id bigint,
  p_our_score integer,
  p_rival_score integer,
  p_stats jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.stats_sessions%rowtype;
  v_stat jsonb;
  v_player_id bigint;
begin
  select * into v_session
  from public.stats_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Sesión de estadísticas no encontrada.';
  end if;

  if v_session.created_by <> auth.uid() and public.current_user_role() <> 'admin' then
    raise exception 'No puedes publicar esta sesión.';
  end if;

  if public.current_user_role() <> 'admin' and not exists (
    select 1 from public.stats_permissions
    where user_id = auth.uid() and can_capture = true
  ) then
    raise exception 'Tu permiso de anotador no está activo.';
  end if;

  if v_session.mode <> 'connected' or v_session.match_id is distinct from p_match_id then
    raise exception 'La sesión no está conectada con este partido oficial.';
  end if;

  if not exists (
    select 1 from public.matches
    where id = p_match_id and team = v_session.team
  ) then
    raise exception 'El partido no pertenece al equipo seleccionado.';
  end if;

  if jsonb_typeof(p_stats) <> 'array' then
    raise exception 'Las estadísticas recibidas no son válidas.';
  end if;

  for v_stat in select value from jsonb_array_elements(p_stats)
  loop
    v_player_id := nullif(v_stat->>'player_id', '')::bigint;

    if not exists (
      select 1
      from jsonb_array_elements_text(coalesce(v_session.payload->'rosterIds', '[]'::jsonb)) roster_id
      where roster_id.value = v_player_id::text
    ) then
      raise exception 'El jugador % no pertenece a la convocatoria guardada.', v_player_id;
    end if;

    if not exists (
      select 1 from public.players
      where id = v_player_id and team = v_session.team and active = true
    ) then
      raise exception 'El jugador % no está activo en la plantilla seleccionada.', v_player_id;
    end if;
  end loop;

  delete from public.player_stats where match_id = p_match_id;

  for v_stat in select value from jsonb_array_elements(p_stats)
  loop
    v_player_id := (v_stat->>'player_id')::bigint;
    insert into public.player_stats (
      match_id, player_id, minutes, points, field_goals, three_pointers, free_throws,
      offensive_rebounds, defensive_rebounds, fouls, steals, turnovers, blocks, assists, valuation
    ) values (
      p_match_id,
      v_player_id,
      nullif(v_stat->>'minutes', ''),
      coalesce((v_stat->>'points')::integer, 0),
      nullif(v_stat->>'field_goals', ''),
      nullif(v_stat->>'three_pointers', ''),
      nullif(v_stat->>'free_throws', ''),
      coalesce((v_stat->>'offensive_rebounds')::integer, 0),
      coalesce((v_stat->>'defensive_rebounds')::integer, 0),
      coalesce((v_stat->>'fouls')::integer, 0),
      coalesce((v_stat->>'steals')::integer, 0),
      coalesce((v_stat->>'turnovers')::integer, 0),
      coalesce((v_stat->>'blocks')::integer, 0),
      coalesce((v_stat->>'assists')::integer, 0),
      coalesce((v_stat->>'valuation')::numeric, 0)
    )
    on conflict (match_id, player_id) do update set
      minutes = excluded.minutes,
      points = excluded.points,
      field_goals = excluded.field_goals,
      three_pointers = excluded.three_pointers,
      free_throws = excluded.free_throws,
      offensive_rebounds = excluded.offensive_rebounds,
      defensive_rebounds = excluded.defensive_rebounds,
      fouls = excluded.fouls,
      steals = excluded.steals,
      turnovers = excluded.turnovers,
      blocks = excluded.blocks,
      assists = excluded.assists,
      valuation = excluded.valuation;
  end loop;

  update public.matches
  set our_score = p_our_score,
      rival_score = p_rival_score,
      status = 'finished',
      updated_at = now()
  where id = p_match_id;

  update public.stats_sessions
  set status = 'synced', updated_at = now()
  where id = p_session_id;
end;
$$;

revoke all on function public.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) from public, anon;
grant execute on function public.publish_official_stats_session(uuid, bigint, integer, integer, jsonb) to authenticated;
