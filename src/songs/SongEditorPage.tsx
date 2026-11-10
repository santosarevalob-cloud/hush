import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useSong } from './useSong'
import { useSongTags } from './useSongTags'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { useAutosave } from '../hooks/useAutosave'
import { LyricsEditor } from './LyricsEditor'
import { SaveIndicator } from './SaveIndicator'
import { AudioPanel } from '../audio/AudioPanel'
import { SongDetailsFields } from './SongDetailsFields'
import { ChipAutocomplete } from './ChipAutocomplete'
import { CoverPicker } from './CoverPicker'
import type { Song, SongStatus } from '../types/database'

export function SongEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { song, loading, error, saveTitle, saveLyrics, saveFields, deleteSong } = useSong(id)
  const { tags, allTagNames, addTag, removeTag } = useSongTags(id)

  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)

  const [status, setStatus] = useState<SongStatus>('idea')
  const [mood, setMood] = useState('')
  const [genre, setGenre] = useState('')
  const [musicalKey, setMusicalKey] = useState('')
  const [bpm, setBpm] = useState('')

  useEffect(() => {
    if (song) {
      setTitle(song.title)
      setLyrics(song.lyrics)
      setStatus(song.status)
      setMood(song.mood ?? '')
      setGenre(song.genre ?? '')
      setMusicalKey(song.musical_key ?? '')
      setBpm(song.bpm ? String(song.bpm) : '')
      setCoverImageUrl(song.cover_image_url)
    }
    // Only re-sync from the server when a *different* song loads. Depending on
    // `song` itself would re-run this after every debounced save (saveFields
    // gives `song` a new object identity each time) and stomp whatever you're
    // still typing in another field with the stale pre-edit value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])

  const { status: titleStatus, queue: queueTitle } = useAutosave(saveTitle, 800)

  function handleTitleChange(value: string) {
    setTitle(value)
    queueTitle(value)
  }

  // Mood/genre/key/bpm share one timer, so edits are merged: typing in Mood then
  // Genre within 600ms must save both, not just the last one.
  const pendingDetailsRef = useRef<Partial<Song>>({})
  const flushDetails = useDebouncedCallback(() => {
    const patch = pendingDetailsRef.current
    pendingDetailsRef.current = {}
    saveFields(patch)
  }, 600)
  function debouncedSaveDetails(patch: Partial<Song>) {
    pendingDetailsRef.current = { ...pendingDetailsRef.current, ...patch }
    flushDetails()
  }

  async function handleDelete() {
    if (!song || !user) return
    if (!window.confirm(`Delete "${song.title || 'Untitled'}"? This can't be undone.`)) return
    if (await deleteSong(user.id)) navigate('/')
    else window.alert("Couldn't delete the song. Check your connection and try again.")
  }

  function handleStatusChange(value: SongStatus) {
    setStatus(value)
    saveFields({ status: value })
  }
  function handleMoodChange(value: string) {
    setMood(value)
    debouncedSaveDetails({ mood: value || null })
  }
  function handleGenreChange(value: string) {
    setGenre(value)
    debouncedSaveDetails({ genre: value || null })
  }
  function handleMusicalKeyChange(value: string) {
    setMusicalKey(value)
    debouncedSaveDetails({ musical_key: value || null })
  }
  function handleBpmChange(value: string) {
    setBpm(value)
    const parsed = Number(value)
    debouncedSaveDetails({ bpm: value && parsed > 0 ? parsed : null })
  }

  function handleAudioUploaded(audioBpm: number) {
    if (!bpm) {
      setBpm(String(audioBpm))
      saveFields({ bpm: audioBpm })
    }
  }

  if (loading) return <div className="p-4 text-slate-400">Loading…</div>
  if (error) return <div className="p-4 text-red-400">{error}</div>
  if (!song) return <div className="p-4 text-slate-400">Song not found.</div>

  return (
    <div className="mx-auto max-w-2xl p-4 pb-10">
      <Link to="/" className="text-sm text-slate-400 transition hover:text-slate-100">
        &larr; All songs
      </Link>

      <div className="mt-3 space-y-4 rounded-2xl glass border border-white/10 p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCoverPickerOpen(true)}
            className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-white/5 transition hover:border-fuchsia-400/60"
            aria-label="Change cover"
          >
            {coverImageUrl ? (
              <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                + Cover
              </div>
            )}
          </button>
          <div className="flex flex-1 items-center gap-2">
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-xl font-semibold text-slate-100 outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15"
            />
            <SaveIndicator status={titleStatus} />
          </div>
        </div>

        <SongDetailsFields
          status={status}
          mood={mood}
          genre={genre}
          musicalKey={musicalKey}
          bpm={bpm}
          onStatusChange={handleStatusChange}
          onMoodChange={handleMoodChange}
          onGenreChange={handleGenreChange}
          onMusicalKeyChange={handleMusicalKeyChange}
          onBpmChange={handleBpmChange}
        />

        <ChipAutocomplete
          selected={tags.map((t) => t.name)}
          suggestions={allTagNames}
          onAdd={addTag}
          onRemove={removeTag}
          allowCreate
          placeholder="Add tags…"
        />
      </div>

      {coverPickerOpen && (
        <CoverPicker
          songId={song.id}
          userId={user?.id}
          onClose={() => setCoverPickerOpen(false)}
          onSaved={(url) => {
            setCoverImageUrl(url)
            setCoverPickerOpen(false)
          }}
        />
      )}

      <div className="mt-4">
        <AudioPanel songId={song.id} onAudioUploaded={handleAudioUploaded} />
      </div>

      <div className="mt-4">
        <LyricsEditor
          content={lyrics}
          onContentChange={setLyrics}
          onSave={saveLyrics}
        />
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="mt-8 text-sm text-slate-500 transition hover:text-red-400"
      >
        Delete song
      </button>
    </div>
  )
}
