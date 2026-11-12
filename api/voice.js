import { createVoice, normalizeVoiceInput, VoiceError } from './_voice.js'
import {
  ApiRequestError,
  getClientId,
  getRequestId,
  setApiHeaders,
  validateJsonRequest,
} from './_requestGuard.js'
import { createSharedRateLimiter } from './_rateLimit.js'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 12
const rateLimiter = createSharedRateLimiter({
  limit: RATE_LIMIT,
  windowMs: RATE_WINDOW_MS,
  prefix: 'tradulimba:rl:voice',
})

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  setApiHeaders(response, null, requestId)

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Metodo non supportato.' })
  }

  try {
    validateJsonRequest(request)
    const input = normalizeVoiceInput(request.body || {})
    const rateLimit = await rateLimiter.consume(getClientId(request))
    setApiHeaders(response, { ...rateLimit, limit: RATE_LIMIT }, requestId)
    if (rateLimit.limited) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))))
      return response.status(429).json({ error: 'Troppe richieste vocali ravvicinate. Riprova tra un minuto.' })
    }

    const result = await createVoice(input)
    return response.status(200).json(result)
  } catch (error) {
    const knownError = error instanceof VoiceError || error instanceof ApiRequestError
    const statusCode = knownError ? error.statusCode : 500
    if (statusCode >= 500) {
      console.warn(JSON.stringify({
        event: 'voice_request_failed',
        requestId,
        code: knownError ? error.code : 'INTERNAL_ERROR',
        statusCode,
      }))
    }
    return response.status(statusCode).json({
      error: knownError
        ? error.message
        : 'Si è verificato un errore durante la generazione della voce.',
      code: knownError ? error.code : 'INTERNAL_ERROR',
      requestId,
    })
  }
}
