import { useState } from 'react'
import { parseYouTubeId } from '../lib/youtube'

interface BeatPlayerProps {
  beatUrl: string | null
  onChange: (url: string | null) => void
}

export function BeatPlayer({ beatUrl, onChange }: BeatPlayerProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const videoId = beatUrl ? parseYouTubeId(beatUrl) : null

  function submit() {
    if (!draft.trim()) return
    if (!parseYouTubeId(draft)) {
      setError(true)
      return
    }
    onChange(draft.trim())
    setDraft('')
  }

  if (videoId) {
    return (
      <div>
        <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* playlist=<id> is what makes loop=1 work for a single video */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?loop=1&playlist=${videoId}&playsinline=1&rel=0`}
            title="Beat"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 text-xs text-slate-500 transition hover:text-slate-200"
        >
          Change beat
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor="beat-url" className="mb-1 block text-xs text-slate-500">
        Beat
      </label>
      <input
        id="beat-url"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setError(false)
        }}
        onBlur={submit}
        placeholder="Paste a YouTube link"
        inputMode="url"
        className="w-full rounded-lg glass-input border border-white/12 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-accent/60"
      />
      {error && <p className="mt-1 text-xs text-red-400">That isn't a YouTube link. Copy it from the Share button.</p>}
    </form>
  )
}
