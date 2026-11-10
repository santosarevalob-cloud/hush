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
    async (patch: Partial<Song>) => {
      if (!songId) return
      const { error: err } = await supabase.from('songs').update(patch).eq('id', songId)
      if (err) {
        setError(err.message)
        return
      }
      setSong((prev) => (prev ? { ...prev, ...patch } : prev))
    },
    [songId],
  )

  const saveTitle = useCallback((title: string) => saveFields({ title }), [saveFields])
  const saveLyrics = useCallback((lyrics: string) => saveFields({ lyrics }), [saveFields])

  return { song, loading, error, saveTitle, saveLyrics, saveFields }
}
