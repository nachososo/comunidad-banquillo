create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text not null,
  body text not null,
  cover_url text,
  category text not null default 'Club',
  author text,
  published boolean not null default false,
  featured boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_posts add column if not exists author text;

alter table public.news_posts enable row level security;

drop policy if exists news_posts_public_read on public.news_posts;
drop policy if exists news_posts_admin_read on public.news_posts;
drop policy if exists news_posts_admin_write on public.news_posts;

create policy news_posts_public_read on public.news_posts
for select
to anon, authenticated
using (published = true);

create policy news_posts_admin_read on public.news_posts
for select
to authenticated
using (public.current_user_role() = 'admin');

create policy news_posts_admin_write on public.news_posts
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-images',
  'news-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_images_public_read on storage.objects;
drop policy if exists news_images_admin_read on storage.objects;
create policy news_images_admin_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_images_admin_insert on storage.objects;
create policy news_images_admin_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_images_admin_update on storage.objects;
create policy news_images_admin_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
)
with check (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_images_admin_delete on storage.objects;
create policy news_images_admin_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
);
