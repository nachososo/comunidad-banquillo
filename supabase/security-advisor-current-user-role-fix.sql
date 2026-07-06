-- Removes Security Advisor warnings for public.current_user_role().
-- This keeps admin checks in RLS policies without exposing the SECURITY DEFINER function.

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or (select private.current_user_role()) = 'admin'
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');

drop policy if exists players_admin_write on public.players;
create policy players_admin_write on public.players for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists player_stats_admin_write on public.player_stats;
create policy player_stats_admin_write on public.player_stats for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists contact_messages_admin_update on public.contact_messages;
create policy contact_messages_admin_update on public.contact_messages for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write on public.site_content for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists banquiger_teams_owner_write on public.banquiger_teams;
create policy banquiger_teams_owner_write on public.banquiger_teams
for all using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists banquiger_rosters_owner_write on public.banquiger_rosters;
create policy banquiger_rosters_owner_write on public.banquiger_rosters
for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or exists (
    select 1 from public.banquiger_teams
    where banquiger_teams.id = banquiger_rosters.team_id
      and banquiger_teams.user_id = auth.uid()
  )
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or exists (
    select 1 from public.banquiger_teams
    where banquiger_teams.id = banquiger_rosters.team_id
      and banquiger_teams.user_id = auth.uid()
  )
);

revoke execute on function public.current_user_role() from public, anon, authenticated;
