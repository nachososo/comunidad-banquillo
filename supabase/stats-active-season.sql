+-- Temporada activa de la App de estadísticas.
create table if not exists public.stats_settings (
  id text primary key check (id = 'global'),
  active_season text not null default '2025-2026'
    check (active_season ~ '^[0-9]{4}-[0-9]{4}$'),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.stats_settings (id, active_season)
values ('global', '2025-2026')
on conflict (id) do nothing;

alter table public.stats_settings enable row level security;

drop policy if exists stats_settings_authenticated_read on public.stats_settings;
create policy stats_settings_authenticated_read on public.stats_settings
for select to authenticated
using (true);

drop policy if exists stats_settings_admin_write on public.stats_settings;
create policy stats_settings_admin_write on public.stats_settings
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

