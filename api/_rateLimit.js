import { createHash } from 'node:crypto'
import { createRateLimiter } from './_requestGuard.js'

// Limite condiviso tra istanze serverless: il contatore vive in un Redis
// raggiungibile via HTTPS. INCR e PEXPIRE devono essere atomici, altrimenti due
// istanze concorrenti possono creare due finestre per lo stesso client e
// raddoppiare il limite: per questo si usa un solo EVAL.
const CONSUME_SCRIPT = [
  'local current = redis.call("INCR", KEYS[1])',
  'if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[2]) end',
  'local ttl = redis.call("PTTL", KEYS[1])',
  'return {current, ttl}',
].join('\n')

// Vercel KV espone lo stesso protocollo REST di Upstash: si accettano entrambi
// i nomi delle variabili, così l'integrazione nativa di Vercel funziona uguale.
const normalizeUrl = (value) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '')

export const resolveRateLimitStoreConfig = (env = {}) => {
  const url = normalizeUrl(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL)
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (!url || !token) return null
  // Il token viaggia nell'header Authorization: solo su TLS.
  if (!/^https:\/\//i.test(url)) return null
  return { url, token }
}

// L'indirizzo IP non viene salvato in chiaro nella chiave: basta distinguere i
// client, non identificarli.
export const rateLimitKey = (prefix, clientId) => (
  `${prefix}:${createHash('sha256').update(String(clientId)).digest('hex').slice(0, 32)}`
)

const createRedisStore = ({ url, token, fetchImpl }) => ({
  async consume(key, { limit, windowMs }) {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EVAL', CONSUME_SCRIPT, '1', key, String(limit), String(windowMs)]),
    })

    if (!response.ok) throw new Error(`rate_limit_store_${response.status}`)
    const payload = await response.json().catch(() => null)
    const result = Array.isArray(payload?.result) ? payload.result : []
    const count = Number(result[0])
    const ttl = Number(result[1])
    if (!Number.isFinite(count) || count < 0) throw new Error('rate_limit_store_invalid_result')

    const ttlMs = Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs
    return {
      limited: count > limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + ttlMs,
    }
  },
})

// Limite condiviso con fallback locale. Se lo store non risponde la richiesta
// non viene rifiutata: un traduttore pubblico che si chiude perché Redis ha un
// singhiozzo è peggio di un limite temporaneamente più permissivo. Il degrado è
// segnalato nei log una volta per istanza e nel campo mode del risultato.
/**
 * @param {object} options
 * @param {number} options.limit richieste ammesse per finestra
 * @param {number} options.windowMs durata della finestra in millisecondi
 * @param {string} [options.prefix] prefisso della chiave, separa le route
 * @param {Record<string, string | undefined>} [options.env]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {{ warn?: (line: string) => void }} [options.log]
 * @param {number} [options.maxClients]
 */
export const createSharedRateLimiter = ({
  limit,
  windowMs,
  prefix = 'tradulimba:rl',
  env = typeof process === 'undefined' ? {} : process.env,
  fetchImpl = globalThis.fetch,
  log = console,
  maxClients,
}) => {
  const config = resolveRateLimitStoreConfig(env)
  const store = config && typeof fetchImpl === 'function'
    ? createRedisStore({ ...config, fetchImpl })
    : null
  const memory = createRateLimiter({ limit, windowMs, maxClients })
  let warned = false

  return {
    get shared() {
      return Boolean(store)
    },
    /**
     * @param {string} clientId
     * @returns {Promise<{ limited: boolean, remaining: number, resetAt: number, mode: string, degraded?: boolean }>}
     */
    async consume(clientId) {
      if (!store) return { ...memory.consume(clientId), mode: 'memory' }

      try {
        const result = await store.consume(rateLimitKey(prefix, clientId), { limit, windowMs })
        return { ...result, mode: 'redis' }
      } catch (error) {
        if (!warned) {
          warned = true
          log.warn?.(JSON.stringify({
            event: 'rate_limit_store_unavailable',
            reason: error?.message || error?.name || 'unknown',
          }))
        }
        return { ...memory.consume(clientId), mode: 'memory', degraded: true }
      }
    },
  }
}
