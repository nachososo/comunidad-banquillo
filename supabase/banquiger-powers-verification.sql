-- Integration fixtures run in a rolled-back transaction. No test accounts,
-- teams, points, cards, match results or statistics survive this script.
begin;
create temporary table power_verification(check_name text) on commit drop;
do $$
declare u uuid[]; t uuid[] := '{}'; team_id uuid; ids jsonb; first_round jsonb; next_round jsonb; ranking jsonb; state jsonb; power jsonb; targets jsonb; card jsonb; i int; j int; picked jsonb; rejected boolean;
begin
  -- Exclude real participants only inside this rolled-back fixture transaction.
  update public.banquiger_teams set created_at=now()+interval '1 year' where season='2026-2027';
  u:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  for i in 1..4 loop
    insert into auth.users(id,email) values(u[i],'powers-verification-'||u[i]||'@example.invalid');
    update public.profiles set role=case when i=1 then 'admin' else 'member' end where id=u[i];
  end loop;
  perform set_config('request.jwt.claim.sub',u[1]::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u[1],'role','authenticated')::text,true);
  select r into first_round from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean order by (r->>'matchId')::int limit 1;
  select r into next_round from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and (r->>'matchId')::int>(first_round->>'matchId')::int order by (r->>'matchId')::int limit 1;
  with catalog as (select p from public.game_data d,jsonb_array_elements(d.payload) p where d.key='banquiger:players'), starters as (select distinct on (p->>'position') p from catalog order by p->>'position',p->>'id'), full_roster as (select p,0 n from starters union all select p,1 n from (select p from catalog where p->>'id' not in (select p->>'id' from starters) limit 2) b)
  select jsonb_agg(p->>'id' order by n,p->>'position',p->>'id') into ids from full_roster;
  for i in 1..4 loop
    insert into public.banquiger_teams(user_id,season,name,selected_ids,selected_match_id,created_at) values(u[i],'2026-2027','Powers verification '||i,ids,(first_round->>'matchId')::bigint,now()-interval '1 day') returning id into team_id;
    t:=array_append(t,team_id);
  end loop;
  update public.game_data set payload=(select jsonb_agg(case when r->>'id'=first_round->>'id' then r||jsonb_build_object('deadline',now()-interval '1 second') else r end) from jsonb_array_elements(payload) r) where key='banquiger:rounds';
  update public.matches set status='finished' where id=(first_round->>'matchId')::bigint;
  insert into public.player_stats(match_id,player_id,points,minutes) values((first_round->>'matchId')::bigint,(select id from public.players where team='masculine' limit 1),0,'00:00');
  select jsonb_agg(jsonb_build_object('id',t[n]::text,'points',100-n,'selectedIds',ids,'lineupSlots',(select lineup_slots from public.banquiger_teams where id=t[n])) order by n) into ranking from generate_series(1,4) n;
  state:=public.banquiger_finalize_round(first_round->>'name',ranking);
  if jsonb_array_length(state->'inventory')<>3 or jsonb_array_length(state->'results')<>1 then raise exception 'Rewards not assigned to three final-round losers'; end if;
  state:=public.banquiger_finalize_round(first_round->>'name',ranking);
  if jsonb_array_length(state->'inventory')<>3 or (select total_points from public.banquiger_teams where id=t[4])<>96 then raise exception 'Duplicate settlement'; end if;
  insert into power_verification values('Final settlement is idempotent; exactly three cards are awarded');
  perform set_config('request.jwt.claim.sub',u[4]::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u[4],'role','authenticated')::text,true);
  if jsonb_array_length(public.banquiger_read_league()->'inventory')<>1 then raise exception 'Other managers can read private hands'; end if;
  insert into power_verification values('Managers can read only their own inventory');
  perform set_config('request.jwt.claim.sub',u[4]::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u[4],'role','authenticated')::text,true);
  for power in select p from public.game_data d,jsonb_array_elements(d.payload) p where d.key='banquiger:powers' loop
    card:=jsonb_build_object('instanceId','verification-card','powerId',power->>'id','power',power,'sourceTeamId',t[4]::text,'round',next_round->>'name','status','available','eligibleTeamIds',to_jsonb(t[1:3]));
    update public.game_data set payload=jsonb_set(jsonb_set(payload,'{inventory}',jsonb_build_array(card)),'{uses}','[]') where key='banquiger:league-v2';
    targets:='[]';
    for j in 1..(power->>'rivalCount')::int loop
      select coalesce(jsonb_agg(id),'[]'::jsonb) into picked from jsonb_array_elements(ids) with ordinality a(id,n) where (power->>'count')::int<>7 and n>case when (power->>'bench')::boolean then 5 else 0 end and n<=case when (power->>'bench')::boolean then 5 else 0 end+(power->>'count')::int;
      targets:=targets||jsonb_build_array(jsonb_build_object('teamId',case when power->>'type'='positive' then t[4] else t[j] end,'playerIds',picked));
    end loop;
    state:=public.banquiger_use_card('verification-card',targets);
    if jsonb_array_length(state->'uses')<>1 or state->'inventory'->0->>'status'<>'used' then raise exception 'Power activation failed: %',power->>'id'; end if;
    rejected:=false;
    begin perform public.banquiger_use_card('verification-card',targets); exception when others then rejected:=true; end;
    if not rejected then raise exception 'Repeated card use allowed'; end if;
  end loop;
  insert into power_verification values('All 32 powers accept valid targets and reject repeat activation');
  -- Same payload but a different signed-in user cannot activate someone else's card.
  update public.game_data set payload=jsonb_set(jsonb_set(payload,'{inventory}',jsonb_build_array(card)),'{uses}','[]') where key='banquiger:league-v2';
  perform set_config('request.jwt.claim.sub',u[2]::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u[2],'role','authenticated')::text,true);
  rejected:=false;
  begin perform public.banquiger_use_card('verification-card',targets); exception when others then rejected:=true; end;
  if not rejected then raise exception 'Foreign card allowed'; end if;
  insert into power_verification values('Foreign cards are rejected');
  perform set_config('request.jwt.claim.sub',u[4]::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u[4],'role','authenticated')::text,true);
  rejected:=false;
  begin update public.banquiger_teams set total_points=999 where id=t[4]; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Forged points allowed'; end if;
  insert into power_verification values('Normal users cannot forge standings');
  update public.game_data set payload=(select jsonb_agg(case when r->>'id'=next_round->>'id' then r||jsonb_build_object('deadline',now()-interval '1 second') else r end) from jsonb_array_elements(payload) r) where key='banquiger:rounds';
  rejected:=false;
  begin perform public.banquiger_use_card('verification-card',targets); exception when others then rejected:=true; end;
  if not rejected then raise exception 'Expired card allowed'; end if;
  rejected:=false;
  begin update public.banquiger_teams set selected_ids='[]',selected_match_id=(next_round->>'matchId')::bigint where id=t[4]; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Closed roster edit allowed'; end if;
  insert into power_verification values('Expired cards and roster edits after kickoff are rejected');
  if has_function_privilege('anon','public.banquiger_use_card(text,jsonb)','EXECUTE') or has_function_privilege('anon','public.banquiger_finalize_round(text,jsonb)','EXECUTE') then raise exception 'Anonymous execution allowed'; end if;
  insert into power_verification values('Anonymous roles cannot call either mutation API');
end $$;
select * from power_verification;
rollback;
