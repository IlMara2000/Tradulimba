import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_TRANSLATION_CHARACTERS,
  normalizeTranslationInput,
  translateText,
  translationRoute,
  TranslatorError,
} from '../api/_translator.js'
import {
  createVoice,
  MAX_VOICE_CHARACTERS,
  normalizeVoiceInput,
  VoiceError,
} from '../api/_voice.js'
import { ApiRequestError, createRateLimiter, validateJsonRequest } from '../api/_requestGuard.js'
import { gateway } from '@ai-sdk/gateway'
import { resolveGatewayProvider } from '../api/_aiGateway.js'

test('normalizza una richiesta italiano-sardo valida', () => {
  assert.deepEqual(
    normalizeTranslationInput({
      text: '  Buongiorno  ',
      source: 'ita',
      target: 'srd',
      variant: 'campidanese',
    }),
    {
      text: 'Buongiorno',
      source: 'ita',
      target: 'srd',
      variant: 'campidanese',
    },
  )
})

test('rifiuta testi vuoti, coppie uguali e varianti sconosciute', () => {
  assert.throws(() => normalizeTranslationInput({ text: ' ' }), TranslatorError)
  assert.throws(
    () => normalizeTranslationInput({ text: 'ciao', source: 'ita', target: 'ita' }),
    /direzione di traduzione/i,
  )
  assert.throws(
    () => normalizeTranslationInput({ text: 'ciao', source: 'ita', target: 'srd', variant: 'inventata' }),
    /varietà sarda/i,
  )
})

test('applica il limite massimo alla traduzione', () => {
  assert.throws(
    () => normalizeTranslationInput({
      text: 'a'.repeat(MAX_TRANSLATION_CHARACTERS + 1),
      source: 'ita',
      target: 'srd',
    }),
    (error) => error instanceof TranslatorError && error.statusCode === 413,
  )
})

test('normalizza la richiesta vocale e ne limita la lunghezza', () => {
  assert.deepEqual(
    normalizeVoiceInput({ text: '  Bonas dies  ', language: 'srd', variant: 'logudorese' }),
    { text: 'Bonas dies', language: 'srd', variant: 'logudorese' },
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'a'.repeat(MAX_VOICE_CHARACTERS + 1) }),
    (error) => error instanceof VoiceError && error.statusCode === 413,
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'Bonas dies', language: 'ita' }),
    (error) => error instanceof VoiceError && error.code === 'UNSUPPORTED_LANGUAGE',
  )
  assert.throws(
    () => normalizeVoiceInput({ text: 'Bonas dies', variant: 'inventata' }),
    (error) => error instanceof VoiceError && error.code === 'INVALID_VARIANT',
  )
})

test('limita in modo compatto le richieste e riapre la finestra alla scadenza', () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, maxClients: 2 })
  assert.deepEqual(limiter.consume('one', 100), { limited: false, remaining: 1, resetAt: 1100 })
  assert.deepEqual(limiter.consume('one', 200), { limited: false, remaining: 0, resetAt: 1100 })
  assert.equal(limiter.consume('one', 300).limited, true)
  assert.deepEqual(limiter.consume('one', 1200), { limited: false, remaining: 1, resetAt: 2200 })
})

test('accetta solo JSON entro il limite dichiarato o effettivo', () => {
  assert.doesNotThrow(() => validateJsonRequest({
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: { text: 'Salude' },
  }))
  assert.throws(
    () => validateJsonRequest({ headers: { 'content-type': 'text/plain' }, body: {} }),
    (error) => error instanceof ApiRequestError && error.statusCode === 415,
  )
  assert.throws(
    () => validateJsonRequest({
      headers: { 'content-type': 'application/json', 'content-length': '999' },
      body: {},
    }, 100),
    (error) => error instanceof ApiRequestError && error.statusCode === 413,
  )
})

test('ritenta un errore transitorio di Apertium e valida il contratto di risposta', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls === 1) return new Response('{}', { status: 503 })
    return new Response(JSON.stringify({ responseData: { translatedText: 'Bona die' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await translateText({
      text: 'Buongiorno',
      source: 'ita',
      target: 'srd',
      variant: 'lsc',
    }, {})
    assert.equal(calls, 2)
    assert.equal(result.translation, 'Bona die')
    assert.equal(result.variantApplied, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('adatta il campidanese con regole quando il post-editor non è configurato', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Sos domos sunt mannas' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  try {
    const result = await translateText({
      text: 'Le case sono grandi',
      source: 'ita',
      target: 'srd',
      variant: 'campidanese',
    }, {})
    assert.equal(result.variantApplied, true)
    assert.equal(result.method, 'rules')
    assert.equal(result.translation, 'Is domus sunt mannas')
    assert.match(result.warning, /adattamento a regole/i)
    assert.equal(result.analysis.variant, 'campidanese')
    assert.match(result.analysis.ipa, /ˈdɔmus/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('la traduzione LSC include sillabe, IPA e controllo ortografico', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Sas domos sunt mannas' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  try {
    const result = await translateText({
      text: 'Le case sono grandi',
      source: 'ita',
      target: 'srd',
      variant: 'lsc',
    }, {})
    assert.equal(result.method, 'apertium')
    assert.equal(result.analysisSide, 'target')
    assert.equal(result.analysis.words[0].word, 'Sas')
    assert.deepEqual(result.analysis.words[1].syllables, ['do', 'mos'])
    assert.equal(result.analysis.words[1].ipa, 'ˈdɔmos')
    assert.deepEqual(result.orthography, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('la voce rifiuta in modo esplicito un ambiente senza motore sardo', async () => {
  await assert.rejects(
    () => createVoice({ text: 'Bona die', language: 'srd', variant: 'lsc' }, {}),
    (error) => error instanceof VoiceError && error.code === 'VOICE_NOT_CONFIGURED',
  )
})

test('usa il singleton Gateway per OIDC e una chiave statica solo se esplicita', () => {
  assert.equal(resolveGatewayProvider({}), null)
  assert.strictEqual(resolveGatewayProvider({ VERCEL: '1' }), gateway)
  assert.strictEqual(resolveGatewayProvider({ VERCEL_OIDC_TOKEN: 'token-temporaneo' }), gateway)
  assert.notStrictEqual(resolveGatewayProvider({ AI_GATEWAY_API_KEY: 'chiave-esplicita' }), gateway)
})

test('instrada italiano-sardo su Apertium e le altre lingue su AI', () => {
  assert.equal(translationRoute('ita', 'srd'), 'apertium')
  assert.equal(translationRoute('srd', 'ita'), 'apertium')
  assert.equal(translationRoute('eng', 'srd'), 'pivot-srd-in')
  assert.equal(translationRoute('srd', 'eng'), 'pivot-srd-out')
  assert.equal(translationRoute('eng', 'ita'), 'ai')
  assert.equal(translationRoute('eng', 'spa'), 'ai')
})

test('accetta le lingue installabili e ignora la variante fuori dal sardo', () => {
  assert.deepEqual(
    normalizeTranslationInput({ text: 'Hello', source: 'eng', target: 'srd', variant: 'campidanese' }),
    { text: 'Hello', source: 'eng', target: 'srd', variant: 'campidanese' },
  )
  assert.deepEqual(
    normalizeTranslationInput({ text: 'Hello', source: 'eng', target: 'ita', variant: 'campidanese' }),
    { text: 'Hello', source: 'eng', target: 'ita', variant: 'lsc' },
  )
  assert.throws(
    () => normalizeTranslationInput({ text: 'Hello', source: 'eng', target: 'xyz' }),
    /direzione di traduzione/i,
  )
})

test('traduce tra lingue facoltative con il gateway AI', async () => {
  const result = await translateText(
    { text: 'Hello', source: 'eng', target: 'ita' },
    { AI_GATEWAY_API_KEY: 'test' },
    {
      translateWithAI: async ({ text, source, target }) => {
        assert.equal(text, 'Hello')
        assert.equal(source, 'eng')
        assert.equal(target, 'ita')
        return 'Ciao'
      },
    },
  )

  assert.equal(result.translation, 'Ciao')
  assert.equal(result.method, 'ai')
  assert.equal(result.analysis, null)
  assert.equal(result.source, 'eng')
  assert.equal(result.target, 'ita')
  assert.equal(result.glossary.length, 0)
})

test('senza gateway AI una lingua facoltativa restituisce un errore esplicito', async () => {
  await assert.rejects(
    () => translateText({ text: 'Hello', source: 'eng', target: 'ita' }, {}),
    (error) => error instanceof TranslatorError && error.code === 'AI_NOT_CONFIGURED',
  )
})

test('porta l’inglese al sardo passando dall’italiano', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Bona die' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  try {
    const result = await translateText(
      { text: 'Good morning', source: 'eng', target: 'srd', variant: 'lsc' },
      { AI_GATEWAY_API_KEY: 'test' },
      {
        translateWithAI: async ({ text, source, target }) => {
          assert.equal(text, 'Good morning')
          assert.equal(source, 'eng')
          assert.equal(target, 'ita')
          return 'Buongiorno'
        },
      },
    )

    assert.equal(result.translation, 'Bona die')
    assert.equal(result.source, 'eng')
    assert.equal(result.target, 'srd')
    assert.equal(result.method, 'ai+apertium')
    assert.equal(result.analysisSide, 'target')
    assert.equal(result.analysis.words[0].word, 'Bona')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('porta il sardo all’inglese passando dall’italiano', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Buongiorno' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  try {
    const result = await translateText(
      { text: 'Bona die', source: 'srd', target: 'eng', variant: 'lsc' },
      { AI_GATEWAY_API_KEY: 'test' },
      {
        translateWithAI: async ({ text, source, target }) => {
          assert.equal(text, 'Buongiorno')
          assert.equal(source, 'ita')
          assert.equal(target, 'eng')
          return 'Good morning'
        },
      },
    )

    assert.equal(result.translation, 'Good morning')
    assert.equal(result.source, 'srd')
    assert.equal(result.target, 'eng')
    assert.equal(result.method, 'apertium+ai')
    assert.equal(result.analysisSide, 'source')
    assert.equal(result.analysis.words[0].word, 'Bona')
    assert.equal(result.glossary.length, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
