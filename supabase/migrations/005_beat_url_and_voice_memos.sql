-- Migration: YouTube beat link per song + voice memos.
-- Safe to re-run.

alter table songs add column if not exists beat_url text;

create table if not exists song_memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  storage_path text not null,
  duration_seconds double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists song_memos_song_id_idx on song_memos(song_id);

alter table song_memos enable row level security;

drop policy if exists "song_memos_owner_access" on song_memos;
create policy "song_memos_owner_access" on song_memos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private bucket. Files live at `{user_id}/{song_id}/{memo_id}.{ext}`.
insert into storage.buckets (id, name, public)
values ('song-memos', 'song-memos', false)
on conflict (id) do nothing;

drop policy if exists "song_memos_bucket_owner_access" on storage.objects;
create policy "song_memos_bucket_owner_access" on storage.objects
  for all using (
    bucket_id = 'song-memos' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'song-memos' and (storage.foldername(name))[1] = auth.uid()::text
  );
