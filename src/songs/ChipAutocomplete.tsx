import { useState } from 'react'
import type { KeyboardEvent } from 'react'

interface ChipAutocompleteProps {
  selected: string[]
  suggestions: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  allowCreate: boolean
  placeholder?: string
}

export function ChipAutocomplete({
  selected,
  suggestions,
  onAdd,
  onRemove,
  allowCreate,
  placeholder,
}: ChipAutocompleteProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const selectedLower = new Set(selected.map((s) => s.toLowerCase()))
  const matches = suggestions.filter(
    (s) =>
      !selectedLower.has(s.toLowerCase()) &&
      (input === '' || s.toLowerCase().includes(input.toLowerCase())),
  )

  function commit(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const exact = suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase())
    if (exact) {
      onAdd(exact)
    } else if (allowCreate) {
      onAdd(trimmed)
    } else {
      return
    }
    setInput('')
    setShowSuggestions(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(input)
    } else if (event.key === 'Backspace' && input === '' && selected.length > 0) {
      onRemove(selected[selected.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-lg glass-input border border-white/12 p-1.5">
        {selected.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-sm text-slate-200"
          >
            {name}
            <button
              type="button"
              onClick={() => onRemove(name)}
              className="text-slate-500 hover:text-red-400"
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-100 outline-none"
        />
      </div>
      {showSuggestions && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg glass-solid border border-white/14 shadow-xl shadow-black/40">
          {matches.slice(0, 20).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s)}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
