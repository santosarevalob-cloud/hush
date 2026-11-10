// shortcut: spelling-based rhyme key (night/twilight, wrote/floats/notes, day/they).
// Misses rhymes that are spelled very differently (through/blue) and can't tell
// "read" from "read"; swap for a pronunciation dictionary (CMUdict) if that matters.

const VOWEL_SOUNDS: Record<string, string> = {
  oa: 'o:', oe: 'o:', ow: 'o:',
  ai: 'a:', ay: 'a:', ey: 'a:', ei: 'a:',
  ee: 'e:', ea: 'e:', ie: 'i:', y: 'i:', igh: 'i:',
  oo: 'u:', ue: 'u:', ew: 'u:', ou: 'ou',
}

// Returns a key; two words rhyme when their keys are equal. Empty string = no key.
export function rhymeKey(rawWord: string): string {
  let w = rawWord.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length < 2) return ''
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1) // notes -> note
  let long = false
  if (w.length > 3 && /[aeiou][^aeiouy]e$/.test(w)) {
    long = true // magic e: wrote, bite, made
    w = w.slice(0, -1)
  }
  w = w.replace(/gh/g, '').replace(/ck$/, 'k').replace(/ph/g, 'f') // night -> nit
  const m = w.match(/([aeiouy]+)([^aeiouy]*)$/)
  if (!m) return ''
  let [, vowels, coda] = m
  if (rawWord.toLowerCase().includes('igh') && vowels.endsWith('i')) vowels = 'igh'
  const sound = long ? `${vowels.slice(-1)}:` : (VOWEL_SOUNDS[vowels.slice(-3)] ?? VOWEL_SOUNDS[vowels.slice(-2)] ?? VOWEL_SOUNDS[vowels] ?? vowels.slice(-1))
  return sound + coda
}

const LAST_WORD = /^(.*?)([A-Za-z']+)([^A-Za-z']*)$/

export function splitLastWord(line: string): { before: string; word: string; after: string } | null {
  const m = line.match(LAST_WORD)
  return m ? { before: m[1], word: m[2], after: m[3] } : null
}

// Rhyme groups among line endings: key -> group number (0, 1, 2…), numbered in the
// order each group first appears, so adding lines further down never recolors earlier ones.
// Only keys shared by two or more lines count as a group.
export function endRhymeGroups(lines: string[]): Map<string, number> {
  const keys = lines.map((line) => rhymeKey(splitLastWord(line)?.word ?? ''))
  const counts = new Map<string, number>()
  for (const key of keys) if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  const groups = new Map<string, number>()
  for (const key of keys) if (key && counts.get(key)! > 1 && !groups.has(key)) groups.set(key, groups.size)
  return groups
}
