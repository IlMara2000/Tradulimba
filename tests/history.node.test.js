import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addTranslationHistoryEntry,
  loadTranslationHistory,
  normalizeHistory,
  saveTranslationHistory,
} from '../src/features/translation/history.js'

const validEntry = {
  id: 'one',
  input: 'Buongiorno',
  output: 'Bona die',
  source: 'ita',
  target: 'srd',
  variant: 'campidanese',
  effectiveVariant: 'lsc',
  variantApplied: false,
  warning: 'Fallback LSC',
}

test('rimuove dalla cronologia voci corrotte e conserva il fallback effettivo', () => {
  const normalized = normalizeHistory([null, {}, validEntry, { ...validEntry, source: 'ita', target: 'ita' }])
  assert.equal(normalized.length, 1)
  assert.equal(normalized[0].effectiveVariant, 'lsc')
  assert.equal(normalized[0].variantApplied, false)
})

test('aggiorna una voce duplicata senza ripristinare copie obsolete', () => {
  const next = addTranslationHistoryEntry([validEntry], { ...validEntry, id: 'two', output: 'Bonas dies' })
  assert.equal(next.length, 1)
  assert.equal(next[0].id, 'two')
  assert.equal(next[0].output, 'Bonas dies')
})

test('conserva una traduzione con una lingua facoltativa', () => {
  const normalized = normalizeHistory([{
    ...validEntry,
    id: 'eng',
    input: 'Hello',
    output: 'Ciao',
    source: 'eng',
    target: 'ita',
  }])
  assert.equal(normalized.length, 1)
  assert.equal(normalized[0].source, 'eng')
  assert.equal(normalized[0].target, 'ita')
})

test('storage non disponibile o non valido non interrompe la pagina', () => {
  const storage = {
    getItem: () => '[null,{"input":42}]',
    setItem: () => { throw new Error('quota') },
  }
  assert.deepEqual(loadTranslationHistory(storage), [])
  assert.equal(saveTranslationHistory([validEntry], storage), false)
})
