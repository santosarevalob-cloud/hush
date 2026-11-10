import { useState } from 'react'
import { parseYouTubeId } from '../lib/youtube'

interface BeatPlayerProps {
  beatUrl: string | null
  onChange: (url: string | null) => void
}

export function BeatPlayer({ beatUrl, onChange }: BeatPlayerProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const videoId = beatUrl ? parseYouTubeId(beatUrl) : null

  function startEditing() {
    setDraft(beatUrl ?? '')
    setError(false)
    setEditing(true)
  }

  function submit() {
    if (!draft.trim()) return
    if (!parseYouTubeId(draft)) {
      setError(true)
      return
    }
    onChange(draft.trim())
    setDraft('')
    setEditing(false)
  }

  async function copyLink() {
    if (!beatUrl) return
    try {
      await navigator.clipboard.writeText(beatUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked; the link is still visible to select by hand
    }
  }

  if (videoId && !editing) {
    const linkClass = 'text-xs text-slate-500 transition hover:text-accent'
    return (
      <div>
        {/* Wide and short on desktop so YouTube shows its full control bar (long seek bar). */}
        <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black md:aspect-auto md:h-52">
          {/* playlist=<id> is what makes loop=1 work for a single video */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?loop=1&playlist=${videoId}&playsinline=1&rel=0`}
            title="Beat"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <a
            href={beatUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate text-xs text-slate-400 transition hover:text-accent"
            title="Open on YouTube"
          >
            {beatUrl}
          </a>
          <button type="button" onClick={copyLink} className={`${linkClass} ml-auto shrink-0`}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={startEditing} className={`${linkClass} shrink-0`}>
            Change
          </button>
        </div>
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
      <div className="flex gap-2">
        <input
          aria-label="Beat link"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(false)
          }}
          autoFocus={editing}
          placeholder="Paste a YouTube beat link"
          inputMode="url"
          className="min-w-0 flex-1 rounded-lg glass-input border border-white/12 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-accent/60"
        />
        <button
          type="submit"
          className="rounded-lg border border-white/12 px-3 text-sm text-slate-300 transition hover:border-accent/60 hover:text-accent"
        >
          Save
        </button>
        {editing && (
          <>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-1 text-sm text-slate-500 transition hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setEditing(false)
              }}
              className="px-1 text-sm text-slate-500 transition hover:text-red-400"
            >
              Remove
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">That isn't a YouTube link. Copy it from the Share button.</p>}
    </form>
  )
}
