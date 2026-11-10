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
  // Label on the left, borderless value on the right; the field only shows a frame on hover/focus.
  const fieldClass =
    'w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/10 focus:border-accent/60'
  const rowClass = 'grid grid-cols-[4.5rem_minmax(0,1fr)] items-center border-b border-white/8 py-0.5 text-sm'
  const labelClass = 'text-slate-500'

  return (
    <div>
      <label className={rowClass}>
        <span className={labelClass}>Status</span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SongStatus)}
          className={`${fieldClass} cursor-pointer text-accent`}
          style={{ textAlignLast: 'right' }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-slate-900 text-slate-100">
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className={rowClass}>
        <span className={labelClass}>Mood</span>
        <input value={mood} onChange={(e) => onMoodChange(e.target.value)} placeholder="happy" className={fieldClass} />
      </label>
      <label className={rowClass}>
        <span className={labelClass}>Genre</span>
        <input value={genre} onChange={(e) => onGenreChange(e.target.value)} placeholder="pop" className={fieldClass} />
      </label>
      <label className={rowClass}>
        <span className={labelClass}>Key</span>
        <input
          value={musicalKey}
          onChange={(e) => onMusicalKeyChange(e.target.value)}
          placeholder="C major"
          className={fieldClass}
        />
      </label>
      <label className={rowClass}>
        <span className={labelClass}>BPM</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={bpm}
          onChange={(e) => onBpmChange(e.target.value)}
          placeholder="120"
          className={fieldClass}
        />
      </label>
    </div>
  )
}
