import { useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { countLineSyllables } from '../lib/syllables'
import { endRhymeKeys, rhymeKey, splitLastWord } from '../lib/rhymes'
import { RecordMode } from './RecordMode'
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

const SYLLABLES_KEY = 'hush:show-syllables'

function readShowSyllables(): boolean {
  try {
    return localStorage.getItem(SYLLABLES_KEY) !== 'false'
  } catch {
    return true
  }
}

interface LyricsEditorProps {
  title: string
  content: string
  onContentChange: (content: string) => void
  onSave: (content: string) => Promise<boolean>
  // Rendered beside the lyrics box (desktop) so it lines up with the box, not the toolbar.
  aside?: ReactNode
}

export function LyricsEditor({ title, content, onContentChange, onSave, aside }: LyricsEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [popup, setPopup] = useState<{ word: string; start: number; end: number; x: number; y: number } | null>(
    null,
  )
  const [fontSize, setFontSize] = useState(readStoredFontSize)
  const [showSyllables, setShowSyllables] = useState(readShowSyllables)
  const [recordMode, setRecordMode] = useState(false)

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

  function toggleSyllables() {
    setShowSyllables((prev) => {
      try {
        localStorage.setItem(SYLLABLES_KEY, String(!prev))
      } catch {
        // ignore
      }
      return !prev
    })
  }

  // Grow the textarea to fit its text, so the page scrolls instead of the box and
  // the syllable counts (an overlay) stay lined up with each line.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    function fit() {
      if (!el) return
      const scrollY = window.scrollY
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
      window.scrollTo(0, scrollY) // the brief 'auto' height would otherwise jump the page
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [content, fontSize, showSyllables])

  const { status, queue } = useAutosave(onSave, 1000)

  function handleChange(value: string) {
    onContentChange(value)
    queue(value)
  }

  function openRhymesAt(caret: number, x: number, y: number) {
    const found = getWordAtCaret(content, caret)
    setPopup(found ? { ...found, x, y } : null)
  }

  function handleDoubleClick(event: MouseEvent<HTMLTextAreaElement>) {
    openRhymesAt(event.currentTarget.selectionStart, event.clientX, event.clientY)
  }

  function handleRhymesButton(event: MouseEvent<HTMLButtonElement>) {
    const caret = textareaRef.current?.selectionStart ?? 0
    const rect = event.currentTarget.getBoundingClientRect()
    openRhymesAt(caret, rect.left + rect.width / 2, rect.bottom)
  }

  function handleSelectSuggestion(suggestion: string) {
    if (!popup) return
    const cased = matchCase(popup.word, suggestion)
    const newContent = content.slice(0, popup.start) + cased + content.slice(popup.end)
    handleChange(newContent)
    setPopup(null)
  }

  const toolClass =
    'rounded-lg border border-white/12 px-2.5 py-1 text-xs text-slate-300 transition hover:border-accent/60 hover:text-accent disabled:opacity-30'
  const textPadding = `px-4 py-4 ${showSyllables ? 'pr-12' : ''}`
  const lineHeight = `${fontSize * 1.625}px`
  const lines = content.split('\n')
  const rhymingKeys = endRhymeKeys(lines)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 md:pr-[18.5rem]">
        <button
          type="button"
          onClick={() => adjustFontSize(-2)}
          disabled={fontSize <= MIN_FONT_SIZE}
          aria-label="Smaller text"
          className={toolClass}
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => adjustFontSize(2)}
          disabled={fontSize >= MAX_FONT_SIZE}
          aria-label="Bigger text"
          className={toolClass}
        >
          A+
        </button>
        <button
          type="button"
          onClick={toggleSyllables}
          aria-pressed={showSyllables}
          className={`${toolClass} ${showSyllables ? 'border-accent/70 text-accent' : ''}`}
        >
          Syllables
        </button>
        <button type="button" onClick={handleRhymesButton} className={toolClass} title="Rhymes for the word at your cursor (or double-click a word)">
          Rhymes
        </button>
        <button type="button" onClick={() => setRecordMode(true)} className={toolClass}>
          Record mode
        </button>
        <span className="ml-auto">
          <SaveIndicator status={status} />
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onDoubleClick={handleDoubleClick}
            style={{ fontSize: `${fontSize}px`, lineHeight }}
            // Text is transparent here; the overlay below draws it (so rhymes can be colored).
            className={`block min-h-[60vh] w-full resize-none overflow-hidden rounded-2xl glass-surface border border-white/10 ${textPadding} text-transparent caret-slate-100 selection:bg-accent/30 outline-none transition placeholder:text-slate-500 focus:border-accent/50`}
            placeholder="Write your lyrics here…"
          />
          {/* Overlay: same text, same wrapping as the textarea, drawn on top of it.
              Colors end-of-line rhymes and holds the syllable counts. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent ${textPadding} text-slate-100 select-none`}
            style={{ fontSize: `${fontSize}px`, lineHeight }}
          >
            {lines.map((line, i) => {
              const last = splitLastWord(line)
              const rhymes = last && rhymingKeys.has(rhymeKey(last.word))
              return (
                <div key={i} className="relative">
                  {rhymes ? (
                    <>
                      {last.before}
                      <span className="text-accent">{last.word}</span>
                      {last.after}
                    </>
                  ) : (
                    line || ' '
                  )}
                  {showSyllables && line.trim() && (
                    <span className="absolute -right-10 top-0 w-8 text-right text-xs text-slate-500" style={{ lineHeight }}>
                      {countLineSyllables(line)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {aside}
      </div>
      {popup && (
        <RhymePopup
          word={popup.word}
          x={popup.x}
          y={popup.y}
          onSelect={handleSelectSuggestion}
          onClose={() => setPopup(null)}
        />
      )}
      {recordMode && <RecordMode title={title} lyrics={content} onClose={() => setRecordMode(false)} />}
    </div>
  )
}
