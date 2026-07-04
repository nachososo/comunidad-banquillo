drop policy if exists news_images_public_read on storage.objects;
drop policy if exists news_images_admin_read on storage.objects;

create policy news_images_admin_read on storage.objects
for select
to authenticated
using (
  bucket_id = 'news-images'
  and public.current_user_role() = 'admin'
);
