-- All accounts, teams, catalogs and deadlines are rolled back.
begin;
create temporary table lineup_verification(check_name text) on commit drop;
do $$
declare u uuid:=gen_random_uuid(); team_id uuid; ids jsonb; slots jsonb; changed jsonb; round jsonb; catalog jsonb; rejected boolean; state jsonb;
begin
  insert into auth.users(id,email) values(u,'lineup-verification-'||u||'@example.invalid');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  select r into round from public.game_data d,jsonb_array_elements(d.payload) r where d.key='banquiger:rounds' and (r->>'automatic')::boolean and not coalesce((r->>'scored')::boolean,false) order by (r->>'matchId')::bigint limit 1;
  select jsonb_agg(jsonb_build_object('id','lineup-test-'||n,'position','Pívot','secondaryPositions',jsonb_build_array('Ala-Pívot'),'active',true,'positionsVersion',2)),jsonb_agg('lineup-test-'||n) into catalog,ids from generate_series(1,7) n;
  update public.game_data set payload=payload||catalog where key='banquiger:players';
  insert into public.banquiger_teams(user_id,season,name,selected_ids,selected_match_id) values(u,'2026-2027','Lineup verification',ids,(round->>'matchId')::bigint) returning id,lineup_slots into team_id,slots;
  if jsonb_array_length(slots)<>7 or (select count(*) from jsonb_object_keys(banquiger_private.lineup(ids,catalog,slots)))<>5 then raise exception 'Interior roster failed'; end if;
  insert into lineup_verification values('Seven interior players can fill all five starter slots');
  changed:=jsonb_set(jsonb_set(slots,'{0}',slots->5),'{5}',slots->0);
  update public.banquiger_teams set lineup_slots=changed where id=team_id;
  select payload into state from public.game_data where key='banquiger:league-v2';
  if state->'lineups'->(round->>'name')->(team_id::text) is distinct from changed then raise exception 'Position swap was not snapshotted'; end if;
  if (select selected_ids from public.banquiger_teams where id=team_id) is distinct from ids then raise exception 'Moving changed the roster'; end if;
  insert into lineup_verification values('Starter/bench swaps persist and freeze without changing recruited IDs');
  rejected:=false;
  begin update public.banquiger_teams set lineup_slots=jsonb_set(changed,'{1}',changed->0) where id=team_id; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Duplicate player allowed'; end if;
  rejected:=false;
  begin update public.banquiger_teams set lineup_slots=jsonb_set(changed,'{1}','"unknown-player"') where id=team_id; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Foreign player allowed'; end if;
  insert into lineup_verification values('Duplicate and foreign players are rejected');
  update public.game_data set payload=(select jsonb_agg(case when r->>'name'=round->>'name' then r||jsonb_build_object('deadline',now()-interval '1 second') else r end) from jsonb_array_elements(payload) r) where key='banquiger:rounds';
  rejected:=false;
  begin update public.banquiger_teams set lineup_slots=slots where id=team_id; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Closed lineup edit allowed'; end if;
  insert into lineup_verification values('Position-only changes are rejected after kickoff');
end $$;
select * from lineup_verification;
rollback;
