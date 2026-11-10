-- Migration: replace verse/chorus/bridge sections with one lyrics box per song.
-- Run this once in the Supabase SQL editor.

alter table songs add column if not exists lyrics text not null default '';

-- Carry over anything already typed into the old sections, in order.
update songs s
set lyrics = coalesce((
  select string_agg(ss.content, E'\n\n' order by ss.position)
  from song_sections ss
  where ss.song_id = s.id
), '')
where lyrics = '';

drop table if exists song_sections;
