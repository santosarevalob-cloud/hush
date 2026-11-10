-- Migration: replace the Phase-1 song_audio shape (one row per song) with
-- one row per uploaded version. The table has never actually been used yet,
-- so this is a clean replace, not a data migration.
-- Run this once in the Supabase SQL editor.

drop table if exists song_audio;

create table song_audio (
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

create index song_audio_song_id_idx on song_audio(song_id);

create unique index song_audio_one_current_per_song
  on song_audio(song_id) where is_current;

create trigger song_audio_set_updated_at
  before update on song_audio
  for each row execute function set_updated_at();

alter table song_audio enable row level security;

create policy "song_audio_owner_access" on song_audio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
