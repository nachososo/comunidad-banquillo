create table if not exists public.site_content (
  key text primary key,
  section text not null check (section in ('quick_links', 'social', 'sponsor', 'home_highlights', 'home_intro', 'home_cards', 'footer_text')),
  label text not null,
  href text not null,
  type text not null default 'internal' check (type in ('text', 'internal', 'instagram', 'youtube', 'twitch', 'website')),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content drop constraint if exists site_content_section_check;
alter table public.site_content add constraint site_content_section_check
  check (section in ('quick_links', 'social', 'sponsor', 'home_highlights', 'home_intro', 'home_cards', 'footer_text'));
alter table public.site_content drop constraint if exists site_content_type_check;
alter table public.site_content add constraint site_content_type_check
  check (type in ('text', 'internal', 'instagram', 'youtube', 'twitch', 'website'));

alter table public.site_content enable row level security;

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content for select using (true);

drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write on public.site_content for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
