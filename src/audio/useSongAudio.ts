import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { SongAudio } from '../types/database'

const BUCKET = 'song-audio'

export interface AudioSettings {
  bpm: number
  bars: number
  beatsPerBar: number
  downbeatOffsetSeconds: number
}

export function useSongAudio(songId: string | undefined, userId: string | undefined) {
  const [versions, setVersions] = useState<SongAudio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const current = versions.find((v) => v.is_current) ?? null

  const load = useCallback(async () => {
    if (!songId) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('song_audio')
      .select('*')
      .eq('song_id', songId)
      .order('version_number', { ascending: false })

    if (err) setError(err.message)
    else setVersions(data ?? [])

    setLoading(false)
  }, [songId])

  useEffect(() => {
    load()
  }, [load])

  const uploadVersion = useCallback(
    async (file: File, settings: AudioSettings) => {
      if (!songId || !userId) return
      setError(null)

      const nextVersion = (versions[0]?.version_number ?? 0) + 1
      const storagePath = `${userId}/${songId}/v${nextVersion}.wav`

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
        contentType: file.type || 'audio/wav',
      })
      if (uploadErr) {
        setError(uploadErr.message)
        return
      }

      if (versions.length > 0) {
        const { error: clearErr } = await supabase
          .from('song_audio')
          .update({ is_current: false })
          .eq('song_id', songId)
        if (clearErr) {
          setError(clearErr.message)
          return
        }
      }

      const { data, error: insertErr } = await supabase
        .from('song_audio')
        .insert({
          song_id: songId,
          storage_path: storagePath,
          bpm: settings.bpm,
          bars: settings.bars,
          beats_per_bar: settings.beatsPerBar,
          downbeat_offset_seconds: settings.downbeatOffsetSeconds,
          version_number: nextVersion,
          is_current: true,
        })
        .select()
        .single()

      if (insertErr || !data) {
        // Undo: drop the orphaned file and put the previous version back as current.
        await supabase.storage.from(BUCKET).remove([storagePath])
        const previous = versions.find((v) => v.is_current)
        if (previous) await supabase.from('song_audio').update({ is_current: true }).eq('id', previous.id)
        setError(insertErr?.message ?? 'Could not save the uploaded audio')
        return
      }

      setVersions((prev) => [data, ...prev.map((v) => ({ ...v, is_current: false }))])
    },
    [songId, userId, versions],
  )

  const updateCurrentSettings = useCallback(
    async (patch: Partial<AudioSettings>) => {
      if (!current) return
      const dbPatch: Partial<SongAudio> = {}
      if (patch.bpm !== undefined) dbPatch.bpm = patch.bpm
      if (patch.bars !== undefined) dbPatch.bars = patch.bars
      if (patch.beatsPerBar !== undefined) dbPatch.beats_per_bar = patch.beatsPerBar
      if (patch.downbeatOffsetSeconds !== undefined) {
        dbPatch.downbeat_offset_seconds = patch.downbeatOffsetSeconds
      }

      const { error: err } = await supabase.from('song_audio').update(dbPatch).eq('id', current.id)
      if (err) {
        setError(err.message)
        return
      }
      setVersions((prev) => prev.map((v) => (v.id === current.id ? { ...v, ...dbPatch } : v)))
    },
    [current],
  )

  const restoreVersion = useCallback(
    async (versionId: string) => {
      if (!songId) return
      const { error: clearErr } = await supabase
        .from('song_audio')
        .update({ is_current: false })
        .eq('song_id', songId)
      if (clearErr) {
        setError(clearErr.message)
        return
      }
      const { error: setErr } = await supabase
        .from('song_audio')
        .update({ is_current: true })
        .eq('id', versionId)
      if (setErr) {
        setError(setErr.message)
        return
      }
      setVersions((prev) => prev.map((v) => ({ ...v, is_current: v.id === versionId })))
    },
    [songId],
  )

  const deleteVersion = useCallback(
    async (versionId: string) => {
      const target = versions.find((v) => v.id === versionId)
      if (!target) return

      const { error: storageErr } = await supabase.storage.from(BUCKET).remove([target.storage_path])
      if (storageErr) {
        setError(storageErr.message)
        return
      }
      const { error: deleteErr } = await supabase.from('song_audio').delete().eq('id', versionId)
      if (deleteErr) {
        setError(deleteErr.message)
        return
      }

      const remaining = versions.filter((v) => v.id !== versionId)
      if (target.is_current && remaining.length > 0) {
        const newCurrent = remaining[0]
        const { error: promoteErr } = await supabase
          .from('song_audio')
          .update({ is_current: true })
          .eq('id', newCurrent.id)
        if (promoteErr) setError(promoteErr.message)
        setVersions(remaining.map((v) => (v.id === newCurrent.id ? { ...v, is_current: true } : v)))
      } else {
        setVersions(remaining)
      }
    },
    [versions],
  )

  const downloadAudioBlob = useCallback(async (storagePath: string): Promise<Blob | null> => {
    const { data, error: err } = await supabase.storage.from(BUCKET).download(storagePath)
    if (err) {
      setError(err.message)
      return null
    }
    return data
  }, [])

  return {
    versions,
    current,
    loading,
    error,
    uploadVersion,
    updateCurrentSettings,
    restoreVersion,
    deleteVersion,
    downloadAudioBlob,
  }
}
