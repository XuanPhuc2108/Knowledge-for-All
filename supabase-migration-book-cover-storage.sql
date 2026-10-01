insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Book owners can upload covers" on storage.objects;
create policy "Book owners can upload covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Book owners can update covers" on storage.objects;
create policy "Book owners can update covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Book owners can delete covers" on storage.objects;
create policy "Book owners can delete covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile owners can upload avatars" on storage.objects;
create policy "Profile owners can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Profile owners can update avatars" on storage.objects;
create policy "Profile owners can update avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Profile owners can delete avatars" on storage.objects;
create policy "Profile owners can delete avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
