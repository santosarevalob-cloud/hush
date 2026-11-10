import { useEffect, useState } from 'react'
import { getSuggestions } from '../lib/datamuse'
import type { DatamuseWord, RhymeSuggestions } from '../lib/datamuse'

interface RhymePopupProps {
  word: string
  x: number
  y: number
  onSelect: (word: string) => void
  onClose: () => void
}

function WordList({
  title,
  words,
  onSelect,
}: {
  title: string
  words: DatamuseWord[]
  onSelect: (word: string) => void
}) {
  if (words.length === 0) return null
  return (
    <div className="mb-2">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-1">
        {words.slice(0, 10).map((w) => (
          <button
            key={w.word}
            type="button"
            onClick={() => onSelect(w.word)}
            className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-sm text-slate-200 transition hover:border-accent hover:bg-accent hover:text-slate-950"
          >
            {w.word}
          </button>
        ))}
      </div>
    </div>
  )
}

const EMPTY: RhymeSuggestions = { rhymes: [], nearRhymes: [], similar: [] }

export function RhymePopup({ word, x, y, onSelect, onClose }: RhymePopupProps) {
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<RhymeSuggestions>(EMPTY)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSuggestions(word).then((result) => {
      if (!cancelled) {
        setSuggestions(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [word])

  const width = 280
  const maxHeight = 320
  const left = Math.min(Math.max(x - width / 2, 8), window.innerWidth - width - 8)
  const top = Math.min(y + 16, Math.max(8, window.innerHeight - maxHeight - 8))

  const nothingFound =
    !loading &&
    suggestions.rhymes.length === 0 &&
    suggestions.nearRhymes.length === 0 &&
    suggestions.similar.length === 0

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[280px] overflow-y-auto rounded-xl glass-solid border border-white/14 p-3 shadow-2xl shadow-black/50"
        style={{ left, top, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">"{word}"</span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading suggestions…</p>
        ) : (
          <>
            <WordList title="Rhymes" words={suggestions.rhymes} onSelect={onSelect} />
            <WordList title="Slant rhymes" words={suggestions.nearRhymes} onSelect={onSelect} />
            <WordList title="Similar words" words={suggestions.similar} onSelect={onSelect} />
            {nothingFound && <p className="text-sm text-slate-500">No suggestions found.</p>}
          </>
        )}
      </div>
    </>
  )
}
