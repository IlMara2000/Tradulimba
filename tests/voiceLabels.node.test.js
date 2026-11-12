import assert from 'node:assert/strict'
import test from 'node:test'
import { voiceNotice } from '../src/features/voice/labels.js'

test('la nota di una registrazione riporta parlante, consenso e data', () => {
  const notice = voiceNotice('registrata', {
    speaker: 'Maria P.',
    consentRef: 'CONS-01',
    recordedAt: '2026-11-11T12:00:00.000Z',
  })

  assert.match(notice, /Maria P\./)
  assert.match(notice, /Consenso: CONS-01/)
  assert.match(notice, /Registrata il 11\/11\/2026/)
  assert.match(notice, /corpus/)
})

test('senza metadati la nota non inventa un consenso', () => {
  const notice = voiceNotice('registrata', {})
  assert.doesNotMatch(notice, /Consenso:/)
  assert.doesNotMatch(notice, /Registrata il/)
})

test('una data non valida non viene mostrata', () => {
  const notice = voiceNotice('registrata', {
    speaker: 'Maria P.',
    consentRef: 'CONS-01',
    recordedAt: 'non-una-data',
  })
  assert.doesNotMatch(notice, /Registrata il/)
})

test('le voci sintetiche e del motore restano dichiarate come tali', () => {
  assert.match(voiceNotice('sintetica', { engine: 'eSpeak NG · sc' }), /sintetica/)
  assert.doesNotMatch(voiceNotice('sintetica', { engine: 'eSpeak NG · sc' }), /Consenso:/)
  assert.match(voiceNotice('motore', { engine: 'SardinianVoxes' }), /non è una registrazione umana/)
  assert.match(voiceNotice('dispositivo'), /voce italiana/)
})
