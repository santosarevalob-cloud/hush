// shortcut: vowel-group heuristic, right for most words but off by one on some
// ("beautiful" -> 4, "every" -> 3); upgrade to a dictionary (CMUdict) if that bugs you.
export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '') // silent endings: wrote, notes, liked
  w = w.replace(/^y/, '')
  return Math.max(1, w.match(/[aeiouy]{1,2}/g)?.length ?? 0)
}

export function countLineSyllables(line: string): number {
  return line.split(/[\s-]+/).reduce((sum, word) => sum + countSyllables(word), 0)
}
