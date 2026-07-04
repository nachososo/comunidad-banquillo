-- Fixes for Supabase Security Advisor warnings.
-- Run this after the main schema if the project already exists in Supabase.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
for insert to anon, authenticated
with check (
  status = 'new'
  and length(trim(name)) between 2 and 120
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and length(trim(reason)) between 10 and 3000
);

-- The leaked password protection warning is a Supabase Auth dashboard setting:
-- Authentication > Sign In / Providers > Password > Leaked password protection.
