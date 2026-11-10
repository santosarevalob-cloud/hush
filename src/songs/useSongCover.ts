import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const BUCKET = 'song-covers'

export function useSongCover(songId: string, userId: string | undefined) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadCover = useCallback(
    async (blob: Blob): Promise<string | null> => {
      if (!userId) return null
      setUploading(true)
      setError(null)

      const path = `${userId}/${songId}/cover.jpg`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (uploadErr) {
        setError(uploadErr.message)
        setUploading(false)
        return null
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      // Cache-bust so replacing a cover doesn't keep showing the old image at the same URL.
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`

      const { error: saveErr } = await supabase
        .from('songs')
        .update({ cover_image_url: publicUrl })
        .eq('id', songId)
      setUploading(false)
      if (saveErr) {
        setError(saveErr.message)
        return null
      }

      return publicUrl
    },
    [songId, userId],
  )

  return { uploadCover, uploading, error }
}
