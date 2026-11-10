import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { SongStatus } from '../types/database'
import { useSongList } from './useSongList'
import { ChipAutocomplete } from './ChipAutocomplete'
import { SongCard } from './SongCard'

const STATUS_OPTIONS: SongStatus[] = ['idea', 'in-progress', 'finished']

function distinctValues(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b))
}

export function SongListPage() {
  const navigate = useNavigate()
  const { songs, tags, songTags, loading, reload } = useSongList()
  const [creating, setCreating] = useState(false)

  const [titleQuery, setTitleQuery] = useState('')
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'AND' | 'OR'>('AND')
  const [statusFilter, setStatusFilter] = useState('')
  const [moodFilter, setMoodFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')

  const moodOptions = useMemo(() => distinctValues(songs.map((s) => s.mood)), [songs])
  const genreOptions = useMemo(() => distinctValues(songs.map((s) => s.genre)), [songs])
  const keyOptions = useMemo(() => distinctValues(songs.map((s) => s.musical_key)), [songs])

  const tagIdsBySongId = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const st of songTags) {
      if (!map.has(st.song_id)) map.set(st.song_id, new Set())
      map.get(st.song_id)!.add(st.tag_id)
    }
    return map
  }, [songTags])

  const tagNamesBySongId = useMemo(() => {
    const nameById = new Map(tags.map((t) => [t.id, t.name]))
    const map = new Map<string, string[]>()
    for (const [songId, tagIds] of tagIdsBySongId) {
      map.set(songId, Array.from(tagIds).map((id) => nameById.get(id) ?? '').filter(Boolean))
    }
    return map
  }, [tagIdsBySongId, tags])

  const filteredSongs = useMemo(() => {
    const selectedTagIds = selectedTagNames
      .map((name) => tags.find((t) => t.name === name)?.id)
      .filter((id): id is string => !!id)

    return songs.filter((song) => {
      if (titleQuery && !song.title.toLowerCase().includes(titleQuery.toLowerCase())) return false
      if (statusFilter && song.status !== statusFilter) return false
      if (moodFilter && song.mood !== moodFilter) return false
      if (genreFilter && song.genre !== genreFilter) return false
      if (keyFilter && song.musical_key !== keyFilter) return false
      if (bpmMin && (!song.bpm || song.bpm < Number(bpmMin))) return false
      if (bpmMax && (!song.bpm || song.bpm > Number(bpmMax))) return false

      if (selectedTagIds.length > 0) {
        const songTagIdSet = tagIdsBySongId.get(song.id) ?? new Set<string>()
        const matches =
          tagMode === 'AND'
            ? selectedTagIds.every((id) => songTagIdSet.has(id))
            : selectedTagIds.some((id) => songTagIdSet.has(id))
        if (!matches) return false
      }

      return true
    })
  }, [
    songs,
    tags,
    tagIdsBySongId,
    titleQuery,
    selectedTagNames,
    tagMode,
    statusFilter,
    moodFilter,
    genreFilter,
    keyFilter,
    bpmMin,
    bpmMax,
  ])

  async function handleNewSong() {
    setCreating(true)
    const { data, error } = await supabase.from('songs').insert({ title: 'Untitled' }).select().single()
    setCreating(false)
    if (!error && data) navigate(`/songs/${data.id}`)
  }

  const selectClass =
    'rounded-lg glass-input border border-white/12 px-2 py-1 text-sm text-slate-200 outline-none transition focus:border-accent/60'
  const optionClass = 'bg-slate-900 text-slate-100'

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-slate-100">Your songs</h2>
        <button
          type="button"
          onClick={handleNewSong}
          disabled={creating}
          className="rounded-lg bg-accent px-3 py-2 font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {creating ? 'Creating…' : '+ New Song'}
        </button>
      </div>

      <div className="mb-4 space-y-3 rounded-2xl glass border border-white/10 p-4 shadow-lg shadow-black/20">
        <input
          value={titleQuery}
          onChange={(e) => setTitleQuery(e.target.value)}
          placeholder="Search by title…"
          className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
        />

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ChipAutocomplete
              selected={selectedTagNames}
              suggestions={tags.map((t) => t.name)}
              onAdd={(name) => setSelectedTagNames((prev) => [...prev, name])}
              onRemove={(name) => setSelectedTagNames((prev) => prev.filter((n) => n !== name))}
              allowCreate={false}
              placeholder="Filter by tags…"
            />
          </div>
          {selectedTagNames.length >= 2 && (
            <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/12 text-xs">
              <button
                type="button"
                onClick={() => setTagMode('AND')}
                className={`px-2 py-1 transition ${tagMode === 'AND' ? 'bg-accent text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Has all
              </button>
              <button
                type="button"
                onClick={() => setTagMode('OR')}
                className={`px-2 py-1 transition ${tagMode === 'OR' ? 'bg-accent text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Has any
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="" className={optionClass}>All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className={optionClass}>
                {s}
              </option>
            ))}
          </select>
          <select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value)} className={selectClass}>
            <option value="" className={optionClass}>All moods</option>
            {moodOptions.map((m) => (
              <option key={m} value={m} className={optionClass}>
                {m}
              </option>
            ))}
          </select>
          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className={selectClass}>
            <option value="" className={optionClass}>All genres</option>
            {genreOptions.map((g) => (
              <option key={g} value={g} className={optionClass}>
                {g}
              </option>
            ))}
          </select>
          <select value={keyFilter} onChange={(e) => setKeyFilter(e.target.value)} className={selectClass}>
            <option value="" className={optionClass}>All keys</option>
            {keyOptions.map((k) => (
              <option key={k} value={k} className={optionClass}>
                {k}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={bpmMin}
            onChange={(e) => setBpmMin(e.target.value)}
            placeholder="BPM min"
            className="w-24 rounded-lg glass-input border border-white/12 px-2 py-1 text-sm text-slate-200 outline-none transition focus:border-accent/60"
          />
          <input
            type="number"
            value={bpmMax}
            onChange={(e) => setBpmMax(e.target.value)}
            placeholder="BPM max"
            className="w-24 rounded-lg glass-input border border-white/12 px-2 py-1 text-sm text-slate-200 outline-none transition focus:border-accent/60"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : songs.length === 0 ? (
        <p className="text-slate-400">No songs yet. Create your first one above.</p>
      ) : filteredSongs.length === 0 ? (
        <p className="text-slate-400">No songs match your search/filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              tagNames={tagNamesBySongId.get(song.id) ?? []}
              onClick={() => navigate(`/songs/${song.id}`)}
            />
          ))}
        </div>
      )}
      {!loading && (
        <button
          type="button"
          onClick={reload}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300"
        >
          Refresh
        </button>
      )}
    </div>
  )
}
