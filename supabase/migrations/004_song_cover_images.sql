-- Migration: song cover images.
-- Adds songs.cover_image_url, a public "song-covers" storage bucket, and
-- storage policies (anyone can read; only the owner can write/replace/delete,
-- enforced the same way as the private song-audio bucket, by the first
-- folder segment matching your user id).
-- Run this once in the Supabase SQL editor.

alter table songs add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public)
values ('song-covers', 'song-covers', true)
on conflict (id) do update set public = true;

drop policy if exists "song_covers_public_read" on storage.objects;
create policy "song_covers_public_read" on storage.objects
  for select using (bucket_id = 'song-covers');

drop policy if exists "song_covers_owner_write" on storage.objects;
create policy "song_covers_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'song-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "song_covers_owner_update" on storage.objects;
create policy "song_covers_owner_update" on storage.objects
  for update using (
    bucket_id = 'song-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "song_covers_owner_delete" on storage.objects;
create policy "song_covers_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'song-covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
