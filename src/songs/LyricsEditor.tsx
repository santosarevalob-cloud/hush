import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useAutosave } from '../hooks/useAutosave'
import { RhymePopup } from './RhymePopup'
import { SaveIndicator } from './SaveIndicator'

interface WordAtCaret {
  word: string
  start: number
  end: number
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z']/.test(ch)
}

function getWordAtCaret(text: string, caretIndex: number): WordAtCaret | null {
  let start = caretIndex
  let end = caretIndex

  if (!isWordChar(text[caretIndex])) {
    if (isWordChar(text[caretIndex - 1])) {
      start = caretIndex - 1
      end = caretIndex - 1
    } else {
      return null
    }
  }

  while (start > 0 && isWordChar(text[start - 1])) start--
  while (end < text.length - 1 && isWordChar(text[end + 1])) end++

  return { word: text.slice(start, end + 1), start, end: end + 1 }
}

function matchCase(source: string, target: string): string {
  if (!source || !target) return target
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return target.toUpperCase()
  }
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1)
  }
  return target
}

const FONT_SIZE_KEY = 'songwriting:lyrics-font-size'
const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 28
const DEFAULT_FONT_SIZE = 16

function readStoredFontSize(): number {
  try {
    const stored = Number(localStorage.getItem(FONT_SIZE_KEY))
    if (stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE) return stored
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall back to default
  }
  return DEFAULT_FONT_SIZE
}

interface LyricsEditorProps {
  content: string
  onContentChange: (content: string) => void
  onSave: (content: string) => Promise<boolean>
}

export function LyricsEditor({ content, onContentChange, onSave }: LyricsEditorProps) {
  const [popup, setPopup] = useState<{ word: string; start: number; end: number; x: number; y: number } | null>(
    null,
  )
  const [fontSize, setFontSize] = useState(readStoredFontSize)

  function adjustFontSize(delta: number) {
    setFontSize((prev) => {
      const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta))
      try {
        localStorage.setItem(FONT_SIZE_KEY, String(next))
      } catch {
        // ignore — preference just won't persist
      }
      return next
    })
  }

  const { status, queue } = useAutosave(onSave, 1000)

  function handleChange(value: string) {
    onContentChange(value)
    queue(value)
  }

  function handleClick(event: MouseEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget
    const caret = textarea.selectionStart
    const found = getWordAtCaret(textarea.value, caret)
    if (!found) {
      setPopup(null)
      return
    }
    setPopup({ ...found, x: event.clientX, y: event.clientY })
  }

  function handleSelectSuggestion(suggestion: string) {
    if (!popup) return
    const cased = matchCase(popup.word, suggestion)
    const newContent = content.slice(0, popup.start) + cased + content.slice(popup.end)
    handleChange(newContent)
    setPopup(null)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-slate-500">Text size</span>
          <button
            type="button"
            onClick={() => adjustFontSize(-2)}
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Decrease text size"
            className="rounded border border-white/12 bg-white/5 px-2 py-0.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
          >
            A−
          </button>
          <span className="w-10 text-center text-xs text-slate-400">{fontSize}px</span>
          <button
            type="button"
            onClick={() => adjustFontSize(2)}
            disabled={fontSize >= MAX_FONT_SIZE}
            aria-label="Increase text size"
            className="rounded border border-white/12 bg-white/5 px-2 py-0.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
          >
            A+
          </button>
        </div>
        <SaveIndicator status={status} />
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onClick={handleClick}
        rows={20}
        style={{ fontSize: `${fontSize}px` }}
        className="w-full resize-y rounded-2xl glass-surface border border-white/10 px-4 py-4 leading-relaxed text-slate-100 shadow-inner shadow-black/30 outline-none transition placeholder:text-slate-500 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
        placeholder="Write your lyrics here…"
      />
      {popup && (
        <RhymePopup
          word={popup.word}
          x={popup.x}
          y={popup.y}
          onSelect={handleSelectSuggestion}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
