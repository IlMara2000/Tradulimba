import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSharedRateLimiter,
  rateLimitKey,
  resolveRateLimitStoreConfig,
} from '../api/_rateLimit.js'
import translateHandler from '../api/translate.js'
import { getClientId } from '../api/_requestGuard.js'

// Redis finto con la stessa semantica dell'EVAL usato in produzione: un solo
// contatore per chiave, TTL impostato al primo incremento.
const createFakeRedis = ({ fail = false } = {}) => {
  const counters = new Map()
  const requests = []

  const fetchImpl = async (url, init) => {
    requests.push({ url, body: init.body, authorization: init.headers.Authorization })
    if (fail) return new Response('{}', { status: 503 })

    const [, , , key, , windowMs] = JSON.parse(init.body)
    const now = Date.now()
    const current = counters.get(key)
    const entry = !current || current.expiresAt <= now
      ? { count: 0, expiresAt: now + Number(windowMs) }
      : current

    entry.count += 1
    counters.set(key, entry)
    return new Response(
      JSON.stringify({ result: [entry.count, entry.expiresAt - now] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return { fetchImpl, requests, counters }
}

const env = {
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-di-prova',
}

test('il limite condiviso vale per tutte le istanze, non per ciascuna', async () => {
  const redis = createFakeRedis()
  const instanceA = createSharedRateLimiter({ limit: 2, windowMs: 60_000, env, fetchImpl: redis.fetchImpl })
  const instanceB = createSharedRateLimiter({ limit: 2, windowMs: 60_000, env, fetchImpl: redis.fetchImpl })

  assert.equal(instanceA.shared, true)
  assert.deepEqual(
    [(await instanceA.consume('203.0.113.7')).limited, (await instanceB.consume('203.0.113.7')).limited],
    [false, false],
  )

  const third = await instanceA.consume('203.0.113.7')
  assert.equal(third.limited, true)
  assert.equal(third.remaining, 0)
  assert.equal(third.mode, 'redis')
  assert.equal(redis.counters.size, 1, 'una sola finestra per client')
})

test('client diversi hanno contatori separati e l’IP non finisce in chiaro', async () => {
  const redis = createFakeRedis()
  const limiter = createSharedRateLimiter({ limit: 1, windowMs: 60_000, env, fetchImpl: redis.fetchImpl })

  assert.equal((await limiter.consume('203.0.113.7')).limited, false)
  assert.equal((await limiter.consume('198.51.100.9')).limited, false)
  assert.equal((await limiter.consume('203.0.113.7')).limited, true)

  const payload = redis.requests[0].body
  assert.ok(!payload.includes('203.0.113.7'))
  assert.match(payload, /"tradulimba:rl:[0-9a-f]{32}"/)
})

test('la chiave dipende dal prefisso: translate e speech non si sommano', () => {
  assert.notEqual(
    rateLimitKey('tradulimba:rl:translate', '203.0.113.7'),
    rateLimitKey('tradulimba:rl:speech', '203.0.113.7'),
  )
})

test('se lo store è irraggiungibile la richiesta passa e il degrado si segnala una volta', async () => {
  const redis = createFakeRedis({ fail: true })
  const warnings = []
  const limiter = createSharedRateLimiter({
    limit: 1,
    windowMs: 60_000,
    env,
    fetchImpl: redis.fetchImpl,
    log: { warn: (line) => warnings.push(line) },
  })

  const first = await limiter.consume('203.0.113.7')
  assert.equal(first.limited, false)
  assert.equal(first.mode, 'memory')
  assert.equal(first.degraded, true)

  const second = await limiter.consume('203.0.113.7')
  assert.equal(second.limited, true, 'il fallback locale continua a contare')

  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /rate_limit_store_unavailable/)
  assert.match(warnings[0], /rate_limit_store_503/)
})

test('senza credenziali resta il limite in memoria, senza chiamate di rete', async () => {
  const redis = createFakeRedis()
  const limiter = createSharedRateLimiter({ limit: 1, windowMs: 60_000, env: {}, fetchImpl: redis.fetchImpl })

  assert.equal(limiter.shared, false)
  assert.equal((await limiter.consume('203.0.113.7')).mode, 'memory')
  assert.equal((await limiter.consume('203.0.113.7')).limited, true)
  assert.equal(redis.requests.length, 0)
})

test('l’identità del client non si può falsificare cambiando la prima voce di x-forwarded-for', () => {
  assert.equal(
    getClientId({ headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }, socket: {} }),
    '203.0.113.7',
  )
  assert.equal(
    getClientId({ headers: { 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4' }, socket: {} }),
    '203.0.113.7',
  )
  assert.equal(getClientId({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1')
})

test('la route /api/translate rifiuta con 429 oltre il limite e indica quando riprovare', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ responseData: { translatedText: 'Salude' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  const call = async () => {
    const headers = {}
    const response = {
      headers,
      setHeader: (name, value) => { headers[name.toLowerCase()] = value },
      status(code) { response.statusCode = code; return response },
      json(payload) { response.body = payload; return response },
    }
    await translateHandler({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
      body: { text: 'Ciao', source: 'ita', target: 'srd', variant: 'lsc' },
      socket: {},
    }, response)
    return response
  }

  try {
    const first = await call()
    assert.equal(first.statusCode, 200)
    assert.equal(first.headers['ratelimit-limit'], '40')
    assert.equal(first.headers['ratelimit-remaining'], '39')

    let last
    for (let index = 0; index < 39; index += 1) last = await call()
    assert.equal(last.statusCode, 200)
    assert.equal(last.headers['ratelimit-remaining'], '0')

    const blocked = await call()
    assert.equal(blocked.statusCode, 429)
    assert.match(blocked.body.error, /Troppe traduzioni/i)
    assert.ok(Number(blocked.headers['retry-after']) >= 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('accetta anche le variabili di Vercel KV e rifiuta URL non cifrati', () => {
  assert.deepEqual(
    resolveRateLimitStoreConfig({ KV_REST_API_URL: 'https://kv.example/', KV_REST_API_TOKEN: 'x' }),
    { url: 'https://kv.example', token: 'x' },
  )
  assert.equal(resolveRateLimitStoreConfig({ KV_REST_API_URL: 'http://kv.example', KV_REST_API_TOKEN: 'x' }), null)
  assert.equal(resolveRateLimitStoreConfig({ UPSTASH_REDIS_REST_URL: 'https://kv.example' }), null)
})
