// Run: npm run check
import assert from 'node:assert/strict'
import { countLineSyllables, countSyllables } from '../src/lib/syllables.ts'
import { parseYouTubeId } from '../src/lib/youtube.ts'
import { endRhymeKeys, rhymeKey } from '../src/lib/rhymes.ts'

const words: Record<string, number> = {
  the: 1, night: 1, wrote: 1, floats: 1, notes: 1, through: 1, "I'm": 1,
  driving: 2, chasing: 2, twilight: 2, people: 2, liked: 1,
  anything: 3, impressing: 3, percent: 2, city: 2, '': 0, '...': 0,
}
for (const [word, expected] of Object.entries(words)) {
  assert.equal(countSyllables(word), expected, word)
}
assert.equal(countLineSyllables('Driving through the night'), 5)
assert.equal(countLineSyllables('Streetlights hum a hook I never wrote'), 9)
assert.equal(countLineSyllables(''), 0)
console.log('syllables: ok')

const id = 'dQw4w9WgXcQ'
for (const link of [
  `https://www.youtube.com/watch?v=${id}`,
  `https://youtube.com/watch?v=${id}&t=42s&list=PL123`,
  `https://youtu.be/${id}?si=abc`,
  `https://www.youtube.com/shorts/${id}`,
  `https://music.youtube.com/watch?v=${id}`,
  `https://m.youtube.com/watch?v=${id}`,
  `  https://youtu.be/${id}  `,
]) assert.equal(parseYouTubeId(link), id, link)
for (const bad of ['', 'not a link', 'https://vimeo.com/123', `https://evil.com/watch?v=${id}`, 'https://youtu.be/short'])
  assert.equal(parseYouTubeId(bad), null, bad)
console.log('youtube: ok')

const rhymes: [string, string][] = [
  ['night', 'twilight'], ['wrote', 'floats'], ['floats', 'notes'], ['day', 'they'], ['bite', 'night'],
  ['cat', 'hat'], ['free', 'tree'],
]
const notRhymes: [string, string][] = [['night', 'day'], ['cat', 'cut'], ['wrote', 'what']]
for (const [a, b] of rhymes) assert.equal(rhymeKey(a), rhymeKey(b), `${a}/${b}`)
for (const [a, b] of notRhymes) assert.notEqual(rhymeKey(a), rhymeKey(b), `${a}/${b}`)
assert.equal(rhymeKey(''), '')
const keys = endRhymeKeys(['Driving through the night', 'Chasing every twilight,', 'Not impressing anything', ''])
assert.equal(keys.size, 1)
assert.ok(keys.has(rhymeKey('night')))
console.log('rhymes: ok')
