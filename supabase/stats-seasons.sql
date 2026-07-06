-- Catálogo de temporadas compartido por calendario y App de estadísticas.
create table if not exists public.stats_seasons (
  id text primary key
    check (id ~ '^[0-9]{4}-[0-9]{4}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.stats_seasons (id)
select distinct season
from public.matches
where season ~ '^[0-9]{4}-[0-9]{4}$'
on conflict (id) do nothing;

insert into public.stats_seasons (id)
values ('2025-2026')
on conflict (id) do nothing;

alter table public.stats_seasons enable row level security;

drop policy if exists stats_seasons_authenticated_read on public.stats_seasons;
create policy stats_seasons_authenticated_read on public.stats_seasons
for select to authenticated
using (true);

drop policy if exists stats_seasons_admin_write on public.stats_seasons;
create policy stats_seasons_admin_write on public.stats_seasons
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
