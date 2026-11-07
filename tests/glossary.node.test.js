import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGlossaryPrompt,
  findGlossaryMatches,
  GLOSSARY_ENTRIES,
} from '../src/features/translation/glossary.js'
import { translateText } from '../api/_translator.js'

test('riconosce i termini italiani nel testo e li ordina come compaiono', () => {
  const matches = findGlossaryMatches('Grazie per il pane e il vino.')
  assert.deepEqual(
    matches.map((match) => [match.term, match.translation]),
    [['Grazie', 'gràtzias'], ['pane', 'pane'], ['vino', 'binu']],
  )
})

test('non confonde parole che contengono il termine', () => {
  assert.deepEqual(findGlossaryMatches('Una casalinga casuale graziosa.'), [])
})

test('gestisce le locuzioni e le lettere accentate', () => {
  const phrase = findGlossaryMatches('Un tavolo, per favore.')
  assert.deepEqual(phrase.map((match) => match.translation), ['mesa', 'pro praghere'])

  const sardo = findGlossaryMatches('Gràtzias meda!', { from: 'srd' })
  assert.deepEqual(
    sardo.map((match) => [match.term, match.translation]),
    [['Gràtzias meda', 'grazie mille']],
  )
})

test('il termine più lungo vince sul più corto che lo contiene', () => {
  assert.deepEqual(
    findGlossaryMatches('Grazie mille!').map((match) => [match.term, match.translation]),
    [['Grazie mille', 'gràtzias meda']],
  )
  assert.deepEqual(
    findGlossaryMatches('Grazie!').map((match) => match.translation),
    ['gràtzias'],
  )
})

test('riconosce le frasi del corso NARA con la loro nota', () => {
  const matches = findGlossaryMatches('Mi chiamo Anna e sono le tre. Accanto alla piazza.')
  assert.deepEqual(
    matches.map((match) => [match.term, match.translation]),
    [
      ['Mi chiamo', 'mi naro'],
      ['sono le tre', 'sunt sas tres'],
      ['Accanto alla piazza', 'acanta de sa pratza'],
    ],
  )
  assert.match(matches[2].note, /Acanta de/)

  const domanda = findGlossaryMatches('Come ti chiami?')
  assert.deepEqual(
    domanda.map((match) => [match.term, match.translation]),
    [['Come ti chiami', 'ite ti naras']],
  )
})

test('rispetta il limite di termini mostrati', () => {
  const text = GLOSSARY_ENTRIES.map((entry) => entry.it).join(', ')
  assert.equal(findGlossaryMatches(text).length, 4)
  assert.equal(findGlossaryMatches(text, { limit: 2 }).length, 2)
})

test('ignora testi non validi e non inventa termini', () => {
  assert.deepEqual(findGlossaryMatches(''), [])
  assert.deepEqual(findGlossaryMatches(null), [])
  assert.deepEqual(findGlossaryMatches('Buona giornata a tutti.'), [])
})

test('costruisce l’istruzione per il post-editor solo con dei termini', () => {
  assert.equal(buildGlossaryPrompt([]), '')

  const prompt = buildGlossaryPrompt(findGlossaryMatches('Grazie del pane'))
  assert.match(prompt, /grazie → gràtzias/i)
  assert.match(prompt, /pane → pane/i)
})

test('la risposta dell’API include i termini del glossario', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Bona die' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  try {
    const result = await translateText({
      text: 'Buongiorno, grazie',
      source: 'ita',
      target: 'srd',
      variant: 'lsc',
    }, {})
    assert.deepEqual(result.glossary, [
      { term: 'Buongiorno', translation: 'bona die', note: 'Die significa “giorno”.' },
      { term: 'grazie', translation: 'gràtzias', note: 'Per ringraziare con più enfasi: gràtzias meda.' },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
