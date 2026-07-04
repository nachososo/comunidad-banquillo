create table if not exists public.stats_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_capture boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stats_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  mode text not null default 'simple' check (mode in ('simple', 'connected')),
  team text not null check (team in ('masculine', 'feminine')),
  opponent text not null,
  match_id bigint references public.matches(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'captured', 'synced', 'reviewed', 'archived')),
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stats_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.stats_sessions(id) on delete cascade,
  player_id bigint,
  player_name text,
  action text not null,
  value numeric not null default 0,
  period text,
  happened_at timestamptz not null default now(),
  sort_order integer not null default 0,
  x numeric,
  y numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.stats_permissions enable row level security;
alter table public.stats_sessions enable row level security;
alter table public.stats_events enable row level security;

drop policy if exists stats_permissions_owner_or_admin_read on public.stats_permissions;
create policy stats_permissions_owner_or_admin_read on public.stats_permissions
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists stats_permissions_admin_write on public.stats_permissions;
create policy stats_permissions_admin_write on public.stats_permissions
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists stats_sessions_owner_or_admin_read on public.stats_sessions;
create policy stats_sessions_owner_or_admin_read on public.stats_sessions
for select to authenticated
using (
  created_by = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists stats_sessions_keeper_insert on public.stats_sessions;
create policy stats_sessions_keeper_insert on public.stats_sessions
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_user_role() = 'admin'
    or exists (
      select 1
      from public.stats_permissions
      where user_id = auth.uid()
        and can_capture = true
    )
  )
);

drop policy if exists stats_sessions_owner_or_admin_update on public.stats_sessions;
create policy stats_sessions_owner_or_admin_update on public.stats_sessions
for update to authenticated
using (
  created_by = auth.uid()
  or public.current_user_role() = 'admin'
)
with check (
  created_by = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists stats_events_session_owner_or_admin_read on public.stats_events;
create policy stats_events_session_owner_or_admin_read on public.stats_events
for select to authenticated
using (
  exists (
    select 1
    from public.stats_sessions
    where stats_sessions.id = stats_events.session_id
      and (
        stats_sessions.created_by = auth.uid()
        or public.current_user_role() = 'admin'
      )
  )
);

drop policy if exists stats_events_session_owner_insert on public.stats_events;
create policy stats_events_session_owner_insert on public.stats_events
for insert to authenticated
with check (
  exists (
    select 1
    from public.stats_sessions
    where stats_sessions.id = stats_events.session_id
      and stats_sessions.created_by = auth.uid()
  )
);

drop policy if exists stats_events_session_owner_or_admin_delete on public.stats_events;
create policy stats_events_session_owner_or_admin_delete on public.stats_events
for delete to authenticated
using (
  exists (
    select 1
    from public.stats_sessions
    where stats_sessions.id = stats_events.session_id
      and (
        stats_sessions.created_by = auth.uid()
        or public.current_user_role() = 'admin'
      )
  )
);

-- Configuración global de la App de estadísticas.
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
for select to authenticated using (true);

drop policy if exists stats_settings_admin_write on public.stats_settings;
create policy stats_settings_admin_write on public.stats_settings
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
