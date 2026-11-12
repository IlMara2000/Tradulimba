import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  createVoice,
  MAX_VOICE_CHARACTERS,
  normalizeVoiceInput,
  resolveVoiceEngine,
  VoiceError,
} from '../api/_voice.js'

const espeakBin = process.env.SARDINIAN_ESPEAK_BIN
  || path.resolve('.cache/espeak-ng/build/src/espeak-ng')
const espeakData = process.env.SARDINIAN_ESPEAK_DATA
  || path.resolve('.cache/espeak-ng/build/espeak-ng-data')
const hasLocalEspeak = existsSync(espeakBin) && existsSync(espeakData)

const withFetch = async (implementation, callback) => {
  const original = globalThis.fetch
  globalThis.fetch = implementation
  try {
    return await callback()
  } finally {
    globalThis.fetch = original
  }
}

test('normalizza il testo e rifiuta lingua, varietà e lunghezza non valide', () => {
  assert.deepEqual(
    normalizeVoiceInput({ text: '  Bonas dies  ', variant: 'campidanese' }),
    { text: 'Bonas dies', language: 'srd', variant: 'campidanese' },
  )
  assert.throws(
    () => normalizeVoiceInput({ text: '' }),
    (error) => error instanceof VoiceError && error.code === 'EMPTY_TEXT',
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'a'.repeat(MAX_VOICE_CHARACTERS + 1) }),
    (error) => error instanceof VoiceError && error.code === 'TEXT_TOO_LONG',
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'Buongiorno', language: 'ita' }),
    (error) => error instanceof VoiceError && error.code === 'UNSUPPORTED_LANGUAGE',
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'Bonas dies', variant: 'gallurese' }),
    (error) => error instanceof VoiceError && error.code === 'INVALID_VARIANT',
  )
})

test('sceglie il motore HTTP, il binario locale o nessuno', () => {
  assert.deepEqual(resolveVoiceEngine({}), { kind: 'none', reason: 'VOICE_NOT_CONFIGURED' })
  assert.deepEqual(resolveVoiceEngine({ SARDINIAN_TTS_URL: 'ftp://tts.test' }), {
    kind: 'none',
    reason: 'INVALID_ENGINE_URL',
  })

  const http = resolveVoiceEngine({
    SARDINIAN_TTS_URL: 'https://tts.example/v1/speak',
    SARDINIAN_TTS_KEY: 'segreta',
  })
  assert.equal(http.kind, 'http')
  assert.equal(http.url, 'https://tts.example/v1/speak')
  assert.equal(http.key, 'segreta')

  const local = resolveVoiceEngine({ SARDINIAN_ESPEAK_BIN: '/usr/local/bin/espeak-ng' })
  assert.equal(local.kind, 'espeak')
  assert.equal(local.voice, 'sc')
})

test('il motore HTTP riceve il sardo originale, non una grafia italianizzata', async () => {
  const calls = []
  const audio = Buffer.from('RIFF0000WAVE').toString('base64')

  await withFetch(async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({
      audio,
      mediaType: 'audio/wav',
      engine: 'sintesa',
      engineLabel: 'SINTESA',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }, async () => {
    const result = await createVoice(
      { text: 'Sa petza est bona', variant: 'lsc' },
      { SARDINIAN_TTS_URL: 'https://tts.example/v1/speak', SARDINIAN_TTS_KEY: 'segreta' },
    )

    assert.equal(result.audio, audio)
    assert.equal(result.mediaType, 'audio/wav')
    assert.equal(result.engineLabel, 'SINTESA')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://tts.example/v1/speak')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer segreta')
    assert.equal(JSON.parse(calls[0].options.body).text, 'Sa petza est bona')
  })
})

test('accetta anche una risposta audio binaria', async () => {
  await withFetch(async () => new Response(Buffer.from('RIFF0000WAVE'), {
    status: 200,
    headers: { 'content-type': 'audio/wav' },
  }), async () => {
    const result = await createVoice(
      { text: 'Bonas dies', variant: 'lsc' },
      { SARDINIAN_TTS_URL: 'https://tts.example/v1/speak' },
    )
    assert.equal(result.mediaType, 'audio/wav')
    assert.equal(Buffer.from(result.audio, 'base64').subarray(0, 4).toString('ascii'), 'RIFF')
  })
})

test('un errore del motore HTTP non espone il corpo della risposta', async () => {
  await withFetch(async () => new Response('segreti interni', { status: 500 }), async () => {
    await assert.rejects(
      () => createVoice(
        { text: 'Bonas dies', variant: 'lsc' },
        { SARDINIAN_TTS_URL: 'https://tts.example/v1/speak' },
      ),
      (error) => error instanceof VoiceError
        && error.statusCode === 502
        && error.code === 'VOICE_ENGINE_ERROR'
        && !error.message.includes('segreti'),
    )
  })
})

test('senza motore configurato risponde 503 con un codice esplicito', async () => {
  await assert.rejects(
    () => createVoice({ text: 'Bonas dies', variant: 'lsc' }, {}),
    (error) => error instanceof VoiceError
      && error.statusCode === 503
      && error.code === 'VOICE_NOT_CONFIGURED',
  )
})

test('il motore eSpeak locale produce un WAV sardo', { skip: !hasLocalEspeak }, async () => {
  const env = {
    SARDINIAN_ESPEAK_BIN: espeakBin,
    SARDINIAN_ESPEAK_DATA: espeakData,
  }
  const result = await createVoice({ text: 'Bonas dies, comente istas?', variant: 'lsc' }, env)
  assert.equal(result.mediaType, 'audio/wav')
  assert.equal(result.engine, 'espeak')
  assert.equal(Buffer.from(result.audio, 'base64').subarray(0, 4).toString('ascii'), 'RIFF')
  assert.deepEqual(result.warnings, [])

  const campidanese = await createVoice({ text: 'Bonas dies', variant: 'campidanese' }, env)
  assert.match(campidanese.warnings.join(' '), /LSC/)
})
