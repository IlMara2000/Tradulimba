import { randomUUID } from 'node:crypto'

const DEFAULT_BODY_LIMIT_BYTES = 48 * 1024

export class ApiRequestError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
    this.code = code
  }
}

// Con un contatore condiviso l'identità del client conta: la prima voce di
// x-forwarded-for è scritta dal client e sarebbe falsificabile (basterebbe
// cambiarla per aggirare il limite). Si preferisce x-real-ip, altrimenti
// l'ultima voce di x-forwarded-for, cioè quella aggiunta dal proxy più vicino.
export const getClientId = (request) => {
  const realIp = request.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim()

  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    const hops = forwarded.split(',').map((hop) => hop.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return request.socket?.remoteAddress || 'anonymous'
}

export const getRequestId = (request) => {
  const vercelId = request.headers['x-vercel-id']
  if (typeof vercelId === 'string' && vercelId.length > 0) {
    return vercelId.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 128)
  }
  return randomUUID()
}

export const validateJsonRequest = (request, bodyLimitBytes = DEFAULT_BODY_LIMIT_BYTES) => {
  const contentType = (request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json' && !contentType.endsWith('+json')) {
    throw new ApiRequestError(
      'Invia la richiesta in formato JSON.',
      415,
      'UNSUPPORTED_MEDIA_TYPE',
    )
  }

  const declaredLength = Number(request.headers['content-length'] || 0)
  if (Number.isFinite(declaredLength) && declaredLength > bodyLimitBytes) {
    throw new ApiRequestError('La richiesta è troppo grande.', 413, 'REQUEST_TOO_LARGE')
  }

  let actualLength = 0
  try {
    actualLength = Buffer.byteLength(JSON.stringify(request.body || {}), 'utf8')
  } catch {
    throw new ApiRequestError('La richiesta JSON non è valida.', 400, 'INVALID_JSON')
  }
  if (actualLength > bodyLimitBytes) {
    throw new ApiRequestError('La richiesta è troppo grande.', 413, 'REQUEST_TOO_LARGE')
  }
}

export const createRateLimiter = ({ limit, windowMs, maxClients = 2000 }) => {
  const clients = new Map()
  let operations = 0

  const pruneExpired = (now) => {
    for (const [clientId, entry] of clients) {
      if (entry.resetAt <= now) clients.delete(clientId)
    }
  }

  return {
    consume(clientId, now = Date.now()) {
      operations += 1
      if (operations % 100 === 0 || clients.size >= maxClients) pruneExpired(now)

      const current = clients.get(clientId)
      if (!current || current.resetAt <= now) {
        if (clients.size >= maxClients) {
          return { limited: true, remaining: 0, resetAt: now + windowMs }
        }
        const next = { count: 1, resetAt: now + windowMs }
        clients.set(clientId, next)
        return { limited: false, remaining: limit - 1, resetAt: next.resetAt }
      }

      current.count += 1
      return {
        limited: current.count > limit,
        remaining: Math.max(0, limit - current.count),
        resetAt: current.resetAt,
      }
    },
  }
}

export const setApiHeaders = (response, rateLimit, requestId) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (requestId) response.setHeader('X-Request-ID', requestId)

  if (rateLimit) {
    response.setHeader('RateLimit-Limit', String(rateLimit.limit))
    response.setHeader('RateLimit-Remaining', String(rateLimit.remaining))
    response.setHeader(
      'RateLimit-Reset',
      String(Math.max(0, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
    )
  }
}
