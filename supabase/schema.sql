-- Songwriting app — v1 schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- Shared trigger: keeps `updated_at` current on every update, on every table.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- songs
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  lyrics text not null default '',
  status text not null default 'idea' check (status in ('idea', 'in-progress', 'finished')),
  mood text,
  genre text,
  musical_key text,
  bpm int,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists songs_set_updated_at on songs;
create trigger songs_set_updated_at
  before update on songs
  for each row execute function set_updated_at();

alter table songs enable row level security;

drop policy if exists "songs_owner_access" on songs;
create policy "songs_owner_access" on songs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- tags + song_tags (freeform, many-to-many)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

alter table tags enable row level security;

drop policy if exists "tags_owner_access" on tags;
create policy "tags_owner_access" on tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists song_tags (
  song_id uuid not null references songs(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (song_id, tag_id)
);

alter table song_tags enable row level security;

-- song_tags has no user_id of its own; ownership is proven via its parent song.
drop policy if exists "song_tags_owner_access" on song_tags;
create policy "song_tags_owner_access" on song_tags
  for all using (
    exists (select 1 from songs where songs.id = song_tags.song_id and songs.user_id = auth.uid())
  ) with check (
    exists (select 1 from songs where songs.id = song_tags.song_id and songs.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────
-- song_audio (versioned: one row per uploaded WAV; the current one drives
-- playback. Used starting Phase 3.)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists song_audio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  storage_path text not null,
  bpm int not null,
  downbeat_offset_seconds double precision not null default 0,
  bars int not null default 4,
  beats_per_bar int not null default 4,
  version_number int not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists song_audio_song_id_idx on song_audio(song_id);

-- At most one "current" version per song.
create unique index if not exists song_audio_one_current_per_song
  on song_audio(song_id) where is_current;

drop trigger if exists song_audio_set_updated_at on song_audio;
create trigger song_audio_set_updated_at
  before update on song_audio
  for each row execute function set_updated_at();

alter table song_audio enable row level security;

drop policy if exists "song_audio_owner_access" on song_audio;
create policy "song_audio_owner_access" on song_audio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: private bucket for WAV uploads.
-- Files are expected at `{user_id}/{song_id}/v{version_number}.wav`.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('song-audio', 'song-audio', false, 2147483648) -- 2GB
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "song_audio_bucket_owner_access" on storage.objects;
create policy "song_audio_bucket_owner_access" on storage.objects
  for all using (
    bucket_id = 'song-audio' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'song-audio' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: public bucket for cover images.
-- Files are expected at `{user_id}/{song_id}/cover.jpg`. Anyone can read;
-- only the owning user can write/replace/delete, same folder-based check
-- as the private song-audio bucket above.
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- YouTube beat link + voice memos (migration 005)
-- ─────────────────────────────────────────────────────────────────────────

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
