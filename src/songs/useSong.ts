import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Song } from '../types/database'

export function useSong(songId: string | undefined) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!songId) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase.from('songs').select('*').eq('id', songId).single()
    if (err) setError(err.message)
    else setSong(data)

    setLoading(false)
  }, [songId])

  useEffect(() => {
    load()
  }, [load])

  const saveFields = useCallback(
    async (patch: Partial<Song>): Promise<boolean> => {
      // Returns false on failure instead of setting `error`: `error` swaps the whole
      // editor for an error message, which would hide the unsaved text.
      if (!songId) return false
      const { error: err } = await supabase.from('songs').update(patch).eq('id', songId)
      if (err) return false
      setSong((prev) => (prev ? { ...prev, ...patch } : prev))
      return true
    },
    [songId],
  )

  const saveTitle = useCallback((title: string) => saveFields({ title }), [saveFields])
  const saveLyrics = useCallback((lyrics: string) => saveFields({ lyrics }), [saveFields])

  // Deletes the row first (song_tags/song_audio rows cascade), then its files.
  // If file cleanup fails the song is still gone; only storage space is wasted.
  const deleteSong = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!songId) return false
      const { data: audio } = await supabase.from('song_audio').select('storage_path').eq('song_id', songId)
      const { error: err } = await supabase.from('songs').delete().eq('id', songId)
      if (err) return false
      const audioPaths = (audio ?? []).map((a) => a.storage_path)
      if (audioPaths.length > 0) await supabase.storage.from('song-audio').remove(audioPaths)
      await supabase.storage.from('song-covers').remove([`${userId}/${songId}/cover.jpg`])
      return true
    },
    [songId],
  )

  return { song, loading, error, saveTitle, saveLyrics, saveFields, deleteSong }
}
