alter table public.news_posts add column if not exists video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-videos',
  'news-videos',
  true,
  262144000,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_videos_admin_read on storage.objects;
create policy news_videos_admin_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'news-videos'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_videos_admin_insert on storage.objects;
create policy news_videos_admin_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'news-videos'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_videos_admin_update on storage.objects;
create policy news_videos_admin_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'news-videos'
  and public.current_user_role() = 'admin'
)
with check (
  bucket_id = 'news-videos'
  and public.current_user_role() = 'admin'
);

drop policy if exists news_videos_admin_delete on storage.objects;
create policy news_videos_admin_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'news-videos'
  and public.current_user_role() = 'admin'
);
