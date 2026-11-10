import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Song, SongTag, Tag } from '../types/database'

export function useSongList() {
  const [songs, setSongs] = useState<Song[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [songTags, setSongTags] = useState<SongTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [songsRes, tagsRes, songTagsRes] = await Promise.all([
      supabase.from('songs').select('*').order('updated_at', { ascending: false }),
      supabase.from('tags').select('*').order('name'),
      supabase.from('song_tags').select('*'),
    ])

    if (songsRes.error) setError(songsRes.error.message)
    else setSongs(songsRes.data ?? [])

    if (tagsRes.error) setError(tagsRes.error.message)
    else setTags(tagsRes.data ?? [])

    if (songTagsRes.error) setError(songTagsRes.error.message)
    else setSongTags(songTagsRes.data ?? [])

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { songs, tags, songTags, loading, error, reload: load }
}
