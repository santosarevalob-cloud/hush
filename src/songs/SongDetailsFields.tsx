import type { SongStatus } from '../types/database'

const STATUS_OPTIONS: SongStatus[] = ['idea', 'in-progress', 'finished']

interface SongDetailsFieldsProps {
  status: SongStatus
  mood: string
  genre: string
  musicalKey: string
  bpm: string
  onStatusChange: (value: SongStatus) => void
  onMoodChange: (value: string) => void
  onGenreChange: (value: string) => void
  onMusicalKeyChange: (value: string) => void
  onBpmChange: (value: string) => void
}

export function SongDetailsFields({
  status,
  mood,
  genre,
  musicalKey,
  bpm,
  onStatusChange,
  onMoodChange,
  onGenreChange,
  onMusicalKeyChange,
  onBpmChange,
}: SongDetailsFieldsProps) {
  const fieldClass =
    'w-24 rounded-lg glass-input border border-white/12 px-2 py-1 text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15'

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <label className="flex items-center gap-1">
        Status
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SongStatus)}
          className={fieldClass}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-slate-900 text-slate-100">
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        Mood
        <input
          value={mood}
          onChange={(e) => onMoodChange(e.target.value)}
          placeholder="e.g. happy"
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-1">
        Genre
        <input
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          placeholder="e.g. pop"
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-1">
        Key
        <input
          value={musicalKey}
          onChange={(e) => onMusicalKeyChange(e.target.value)}
          placeholder="e.g. C major"
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-1">
        BPM
        <input
          type="number"
          min={1}
          value={bpm}
          onChange={(e) => onBpmChange(e.target.value)}
          className={`${fieldClass} w-20`}
        />
      </label>
    </div>
  )
}
