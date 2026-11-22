import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CAMPIDANESE_ENTRIES } from '../src/features/linguistics/campidaneseLexicon.js'
import {
  auditCorpus,
  auditLexicon,
  auditSnapshot,
  attestedForms,
  normalizeLexeme,
  tokensOf,
} from '../src/features/linguistics/lexiconAudit.js'
import { flattenCopione } from '../src/features/voice/copione.js'

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))

const snapshot = readJson('data/puddu-lemmi.json')
const copione = readJson('voice/copione.json')

test('lo snapshot del dizionario è coerente e datato', () => {
  assert.deepEqual(auditSnapshot(snapshot), [])
  assert.ok(Object.keys(snapshot.lemmi).length >= 100)
  assert.match(snapshot.fonte, /Puddu/)
})

test('ogni voce del lessico campidanese ha la sua attestazione', () => {
  assert.deepEqual(auditLexicon(CAMPIDANESE_ENTRIES, snapshot), [])
})

test('nessuna riga campidanese del copione usa forme non attestate', () => {
  const rows = flattenCopione(copione)
  assert.deepEqual(auditCorpus(rows, snapshot), [])
})

test('il controllo segnala davvero una forma inventata', () => {
  const rows = [{ variant: 'campidanese', text: 'Sa bidda est arrexioni.' }]
  assert.deepEqual(auditCorpus(rows, snapshot).map(({ token }) => token), ['arrexioni'])

  const phonetic = [{ variant: 'campidanese', text: 'Su tennesì est mannu.' }]
  assert.deepEqual(auditCorpus(phonetic, snapshot).map(({ token }) => token), ['tennesì'])
})

test('il controllo ignora le righe LSC, che hanno un’altra norma', () => {
  const rows = [{ variant: 'lsc', text: 'Sos pizzinnos giogant in sa pratza.' }]
  assert.deepEqual(auditCorpus(rows, snapshot), [])
})

test('un lemma cambiato nel lessico non passa più', () => {
  const entries = [{
    it: 'paese',
    srd: 'bidda',
    lemma: 'bidda', // senza accento: non è la forma del dizionario
    variants: [],
  }]
  const problems = auditLexicon(entries, snapshot)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /lemma "bidda" diverso dallo snapshot "bídha"/)

  const invented = auditLexicon([{ it: 'x', srd: 'camina', lemma: 'camina' }], snapshot)
  assert.match(invented[0], /nessuna attestazione/)
})

test('le forme ammesse coprono grammatica, nomi propri e flessioni', () => {
  const allowed = attestedForms(snapshot)
  for (const form of ['est', 'sunt', 'su', 'sa', 'is', 'puxeddu', 'domos', 'sarda', 'x']) {
    assert.ok(allowed.has(normalizeLexeme(form)), `${form} dovrebbe essere ammessa`)
  }
  assert.equal(allowed.has('arrexioni'), false)
  assert.deepEqual(tokensOf("S'iscola"), ['S', 'iscola'])
})
