-- Migration: raise the per-file size limit on the song-audio bucket.
-- Supabase defaults new buckets to 50MB, which is too small for full-length
-- WAV exports. This raises it to 2GB (comfortably above any single file you'd
-- realistically upload); your total free-tier storage quota, not this
-- setting, is the real ceiling to watch (see supabase/migrations/002... note
-- and the app's Phase 3 plan for context).
-- Run this once in the Supabase SQL editor.

update storage.buckets
set file_size_limit = 2147483648  -- 2GB, in bytes
where id = 'song-audio';
