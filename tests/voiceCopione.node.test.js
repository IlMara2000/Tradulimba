import assert from 'node:assert/strict'
import test from 'node:test'
import { flattenCopione } from '../src/features/voice/copione.js'

test('appiattisce gruppi e voci, deduplica e conserva parlante e gruppo', () => {
  const rows = flattenCopione({
    speaker: 'Mario',
    groups: [
      {
        id: 'saluti',
        label: 'Saluti',
        variant: 'lsc',
        kind: 'phrase',
        texts: ['Bonas dies', 'Bonas dies', ' binu '],
      },
      {
        id: 'campidanese',
        label: 'Campidanese',
        variant: 'campidanese',
        kind: 'word',
        texts: ['binu'],
      },
    ],
    entries: [
      { text: 'Bonas dies', variant: 'lsc', kind: 'word', group: 'extra' },
    ],
  })

  assert.deepEqual(
    rows.map((row) => `${row.variant}:${row.normalized}`),
    ['lsc:bonas dies', 'lsc:binu', 'campidanese:binu'],
  )
  assert.equal(rows[0].text, 'Bonas dies')
  assert.equal(rows[0].kind, 'phrase')
  assert.equal(rows[0].groupLabel, 'Saluti')
  assert.equal(rows[0].speaker, 'Mario')
  assert.equal(rows[2].variant, 'campidanese')
})

test('marca le righe escluse dalla sintesi senza toccare le altre', () => {
  const rows = flattenCopione({
    excludeSynthesis: ['màllia'],
    groups: [
      { id: 'suoni', variant: 'lsc', kind: 'word', texts: ['màllia', 'mannu'] },
    ],
  })

  assert.equal(rows[0].synthesisExcluded, true)
  assert.equal(rows[1].synthesisExcluded, false)
})

test('scarta testi assenti, vuoti o troppo lunghi', () => {
  const rows = flattenCopione({
    groups: [
      {
        id: 'prova',
        variant: 'lsc',
        kind: 'word',
        texts: ['', '   ', 'a'.repeat(1001), 42, 'abba'],
      },
    ],
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0].text, 'abba')
})
