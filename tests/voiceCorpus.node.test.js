import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isSafeVoiceFile,
  normalizeVoiceText,
  selectCorpusEntry,
  validateVoiceManifest,
  voiceEntryId,
} from '../src/features/voice/corpus.js'

test('normalizza maiuscole, punteggiatura e apostrofi tipografici', () => {
  assert.equal(normalizeVoiceText('  Bonas   dies, comente istas?  '), 'bonas dies comente istas')
  assert.equal(normalizeVoiceText('S’agatat sa firmada — inoghe.'), "s'agatat sa firmada inoghe")
  assert.equal(normalizeVoiceText('MÀLLIA'), 'màllia')
  assert.equal(normalizeVoiceText('però'), 'però')
  assert.equal(normalizeVoiceText(''), '')
  assert.equal(normalizeVoiceText(undefined), '')
})

test('l’id di una riga è stabile e distingue le varietà', () => {
  const first = voiceEntryId('Bonas dies, comente istas?', 'lsc')
  const second = voiceEntryId('  bonas dies comente istas  ', 'lsc')
  assert.equal(first, second)
  assert.match(first, /^[a-z0-9-]+$/)
  assert.notEqual(voiceEntryId('màllia', 'lsc'), voiceEntryId('màllia', 'campidanese'))
})

test('accetta solo file del corpus e l’audio online controllato', () => {
  assert.equal(isSafeVoiceFile('/voce/sintetica/bonas-dies-1a2b3c.mp3'), true)
  assert.equal(isSafeVoiceFile('/voce/registrata/bonas-dies-1a2b3c.wav'), true)
  assert.equal(isSafeVoiceFile('/api/audio?source=registrata&id=bonas-dies-1a2b3c'), true)
  assert.equal(isSafeVoiceFile('/voce/sintetica/../segreto.mp3'), false)
  assert.equal(isSafeVoiceFile('https://esempio.test/voce.mp3'), false)
  assert.equal(isSafeVoiceFile('/voce/altro/bonas-dies.mp3'), false)
  assert.equal(isSafeVoiceFile('/api/audio?source=registrata&id=../segreto'), false)
  assert.equal(isSafeVoiceFile('/api/audio?source=sintetica&id=bonas-dies-1a2b3c'), false)
})

test('tratta l’audio online come WAV', () => {
  const manifest = validateVoiceManifest({
    entries: [{
      text: 'Bonas dies',
      variant: 'lsc',
      source: 'registrata',
      file: '/api/audio?source=registrata&id=bonas-dies-1a2b3c',
      speaker: 'Maria P.',
      consentRef: 'CONS-01',
    }],
  })

  assert.equal(manifest.entries.length, 1)
  assert.equal(manifest.entries[0].mediaType, 'audio/wav')
})

test('valida il manifest e scarta le voci malformate', () => {
  const manifest = validateVoiceManifest({
    entries: [
      {
        text: 'Bonas dies',
        variant: 'lsc',
        source: 'sintetica',
        file: '/voce/sintetica/bonas-dies-1a2b3c.mp3',
      },
      {
        text: 'File pericoloso',
        variant: 'lsc',
        source: 'sintetica',
        file: '/voce/sintetica/../../etc/passwd',
      },
      {
        text: 'Varietà ignota',
        variant: 'gallurese',
        source: 'registrata',
        file: '/voce/registrata/altra-1a2b3c.wav',
      },
    ],
  })

  assert.equal(manifest.version, 1)
  assert.equal(manifest.entries.length, 2)
  assert.equal(manifest.entries[0].mediaType, 'audio/mpeg')
  assert.equal(manifest.entries[1].variant, 'lsc')
})

test('conserva parlante, riferimento al consenso e data nel manifest', () => {
  const manifest = validateVoiceManifest({
    entries: [{
      text: 'Bonas dies',
      variant: 'lsc',
      source: 'registrata',
      file: '/voce/registrata/bonas-dies-1a2b3c.wav',
      speaker: ' Maria P. ',
      consentRef: ' CONS-01 ',
      recordedAt: '2026-11-11T12:00:00.000Z',
      license: ' consenso del parlante ',
    }],
  })

  assert.equal(manifest.entries.length, 1)
  assert.equal(manifest.entries[0].speaker, 'Maria P.')
  assert.equal(manifest.entries[0].consentRef, 'CONS-01')
  assert.equal(manifest.entries[0].recordedAt, '2026-11-11T12:00:00.000Z')
  assert.equal(manifest.entries[0].license, 'consenso del parlante')
})

test('una registrazione umana vince sulla clip sintetica', () => {
  const manifest = {
    entries: [
      {
        text: 'Bonas dies',
        variant: 'lsc',
        source: 'sintetica',
        file: '/voce/sintetica/bonas-dies-1a2b3c.mp3',
      },
      {
        text: 'Bonas dies',
        variant: 'lsc',
        source: 'registrata',
        file: '/voce/registrata/bonas-dies-1a2b3c.wav',
      },
    ],
  }

  assert.equal(selectCorpusEntry(manifest, 'bonas dies!', 'lsc').source, 'registrata')
  assert.equal(selectCorpusEntry(manifest, 'Bonas dies', 'campidanese'), null)
  assert.equal(selectCorpusEntry(manifest, 'Un’altra frase', 'lsc'), null)
  assert.equal(selectCorpusEntry({ entries: [] }, 'Bonas dies', 'lsc'), null)
})
