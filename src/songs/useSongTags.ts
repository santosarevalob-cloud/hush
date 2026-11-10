import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tag } from '../types/database'

function normalizeTagName(raw: string): string {
  return raw.trim().toLowerCase()
}

export function useSongTags(songId: string | undefined) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [songTagIds, setSongTagIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!songId) return
    setLoading(true)
    setError(null)

    const [tagsRes, songTagsRes] = await Promise.all([
      supabase.from('tags').select('*').order('name'),
      supabase.from('song_tags').select('tag_id').eq('song_id', songId),
    ])

    if (tagsRes.error) setError(tagsRes.error.message)
    else setAllTags(tagsRes.data ?? [])

    if (songTagsRes.error) setError(songTagsRes.error.message)
    else setSongTagIds(new Set((songTagsRes.data ?? []).map((r) => r.tag_id)))

    setLoading(false)
  }, [songId])

  useEffect(() => {
    load()
  }, [load])

  const addTag = useCallback(
    async (rawName: string) => {
      if (!songId) return
      const name = normalizeTagName(rawName)
      if (!name) return

      let tagId: string
      const existing = allTags.find((t) => t.name === name)
      if (existing) {
        tagId = existing.id
      } else {
        const { data, error: insertErr } = await supabase.from('tags').insert({ name }).select().single()
        if (insertErr || !data) {
          setError(insertErr?.message ?? 'Could not create tag')
          return
        }
        tagId = data.id
        setAllTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }

      if (songTagIds.has(tagId)) return

      const { error: linkErr } = await supabase.from('song_tags').insert({ song_id: songId, tag_id: tagId })
      if (linkErr) {
        setError(linkErr.message)
        return
      }
      setSongTagIds((prev) => new Set(prev).add(tagId))
    },
    [songId, allTags, songTagIds],
  )

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!songId) return
      const { error: err } = await supabase
        .from('song_tags')
        .delete()
        .eq('song_id', songId)
        .eq('tag_id', tagId)
      if (err) {
        setError(err.message)
        return
      }
      setSongTagIds((prev) => {
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
    },
    [songId],
  )

  const tags = allTags.filter((t) => songTagIds.has(t.id))

  return {
    tags,
    allTagNames: allTags.map((t) => t.name),
    loading,
    error,
    addTag,
    removeTag: (name: string) => {
      const tag = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (tag) removeTag(tag.id)
    },
  }
}
