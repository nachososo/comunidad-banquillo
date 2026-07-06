-- Restore user-management access for administrators without exposing the
-- SECURITY DEFINER role helper through the public schema.

grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_role()) = 'admin'
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');
