export interface DatamuseWord {
  word: string
  score?: number
}

export interface RhymeSuggestions {
  rhymes: DatamuseWord[]
  nearRhymes: DatamuseWord[]
  similar: DatamuseWord[]
}

const EMPTY_SUGGESTIONS: RhymeSuggestions = { rhymes: [], nearRhymes: [], similar: [] }

const cache = new Map<string, RhymeSuggestions>()

export function normalizeWord(raw: string): string {
  return raw.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/gi, '')
}

async function fetchWords(param: string, word: string): Promise<DatamuseWord[]> {
  const url = `https://api.datamuse.com/words?${param}=${encodeURIComponent(word)}&max=20`
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

export async function getSuggestions(rawWord: string): Promise<RhymeSuggestions> {
  const word = normalizeWord(rawWord)
  if (!word) return EMPTY_SUGGESTIONS

  const cached = cache.get(word)
  if (cached) return cached

  const [rhymes, nearRhymes, similar] = await Promise.all([
    fetchWords('rel_rhy', word),
    fetchWords('rel_nry', word),
    fetchWords('ml', word),
  ])

  const result: RhymeSuggestions = { rhymes, nearRhymes, similar }
  cache.set(word, result)
  return result
}
