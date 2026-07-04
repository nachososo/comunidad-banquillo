-- Ejecutar una vez en Supabase SQL Editor para activar persistencia global
-- de Banquiger y 18-0 sin borrar los datos existentes.

revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

create table if not exists public.game_data (
  key text primary key,
  game text not null check (game in ('banquiger', 'eighteen-zero')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_game_data (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  game text not null check (game in ('banquiger', 'eighteen-zero')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.game_data enable row level security;
alter table public.user_game_data enable row level security;
alter table public.banquiger_teams add column if not exists selected_ids jsonb not null default '[]'::jsonb;
alter table public.banquiger_teams add column if not exists selected_match_id bigint references public.matches(id) on delete set null;
alter table public.banquiger_teams add column if not exists manager_name text;

drop policy if exists game_data_public_read on public.game_data;
create policy game_data_public_read on public.game_data for select to anon, authenticated using (true);
drop policy if exists game_data_admin_insert on public.game_data;
create policy game_data_admin_insert on public.game_data for insert to authenticated with check (public.current_user_role() = 'admin');
drop policy if exists game_data_admin_update on public.game_data;
create policy game_data_admin_update on public.game_data for update to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
drop policy if exists game_data_admin_delete on public.game_data;
create policy game_data_admin_delete on public.game_data for delete to authenticated using (public.current_user_role() = 'admin');

drop policy if exists user_game_data_owner_select on public.user_game_data;
create policy user_game_data_owner_select on public.user_game_data for select to authenticated using (user_id = auth.uid());
drop policy if exists user_game_data_owner_insert on public.user_game_data;
create policy user_game_data_owner_insert on public.user_game_data for insert to authenticated with check (user_id = auth.uid());
drop policy if exists user_game_data_owner_update on public.user_game_data;
create policy user_game_data_owner_update on public.user_game_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_game_data_owner_delete on public.user_game_data;
create policy user_game_data_owner_delete on public.user_game_data for delete to authenticated using (user_id = auth.uid());

drop policy if exists banquiger_teams_owner_select on public.banquiger_teams;
create policy banquiger_teams_owner_select on public.banquiger_teams for select to authenticated using (user_id = auth.uid() or public.current_user_role() = 'admin');
drop policy if exists banquiger_teams_owner_insert on public.banquiger_teams;
create policy banquiger_teams_owner_insert on public.banquiger_teams for insert to authenticated with check (user_id = auth.uid());
drop policy if exists banquiger_teams_owner_update on public.banquiger_teams;
create policy banquiger_teams_owner_update on public.banquiger_teams for update to authenticated using (user_id = auth.uid() or public.current_user_role() = 'admin') with check (user_id = auth.uid() or public.current_user_role() = 'admin');
