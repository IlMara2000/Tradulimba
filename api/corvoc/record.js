import { timingSafeEqual } from 'node:crypto'
import { analyzeRecording } from '../../tools/registrazione/audio-quality.js'
import { cleanMetadataText, normalizeRecordingMetadata } from '../../scripts/voice-metadata.mjs'
import {
  ApiRequestError,
  getClientId,
  getRequestId,
  setApiHeaders,
} from '../_requestGuard.js'
import { createSharedRateLimiter } from '../_rateLimit.js'
import { findScriptRow } from './_data.js'
import { deleteAudio, putAudio, readRecordings, writeRecording } from './_storage.js'
import { decodePcmWav, WavError } from './_wav.js'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30
const MAX_BYTES = 4 * 1024 * 1024
const ID_PATTERN = /^[a-z0-9-]+$/u
const WAV_TYPES = new Set(['audio/wav', 'audio/x-wav', 'audio/wave'])
const rateLimiter = createSharedRateLimiter({
  limit: RATE_LIMIT,
  windowMs: RATE_WINDOW_MS,
  prefix: 'tradulimba:rl:corvoc',
})

const safeEqual = (left, right) => {
  const a = Buffer.from(typeof left === 'string' ? left : '')
  const b = Buffer.from(typeof right === 'string' ? right : '')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const decodeHeader = (value) => {
  if (typeof value !== 'string' || !value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

const readBody = async (request) => {
  if (Buffer.isBuffer(request.body)) return request.body
  if (typeof request.body === 'string') return Buffer.from(request.body, 'binary')
  if (request.body && typeof request.body === 'object') {
    throw new ApiRequestError('Il corpo della richiesta non è un WAV.', 400, 'INVALID_BODY')
  }

  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > MAX_BYTES) {
      throw new ApiRequestError('La registrazione supera 4 MB.', 413, 'BODY_TOO_LARGE')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  setApiHeaders(response, null, requestId)

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Metodo non supportato.', code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const expectedToken = process.env.CORVOC_RECORD_TOKEN
    if (!expectedToken) {
      return response.status(503).json({
        error: 'Lo studio online non ha un codice di accesso configurato.',
        code: 'CORVOC_TOKEN_MISSING',
      })
    }

    const rateLimit = await rateLimiter.consume(getClientId(request))
    setApiHeaders(response, { ...rateLimit, limit: RATE_LIMIT }, requestId)
    if (rateLimit.limited) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))))
      return response.status(429).json({
        error: 'Troppe registrazioni ravvicinate. Riprova tra un minuto.',
        code: 'RATE_LIMITED',
      })
    }

    if (!safeEqual(request.headers['x-corvoc-token'], expectedToken)) {
      return response.status(401).json({
        error: 'Codice di accesso non valido.',
        code: 'INVALID_CORVOC_TOKEN',
      })
    }

    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
    const id = url.searchParams.get('id') || ''
    const overwrite = url.searchParams.get('overwrite') === '1'
    if (!ID_PATTERN.test(id)) {
      return response.status(400).json({ error: 'Id della riga non valido.', code: 'INVALID_ID' })
    }

    const row = await findScriptRow(id)
    if (!row) {
      return response.status(404).json({ error: 'Questa riga non è nel copione.', code: 'ROW_NOT_FOUND' })
    }

    const contentType = (request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
    if (!WAV_TYPES.has(contentType)) {
      return response.status(415).json({ error: 'Invia la ripresa in WAV.', code: 'UNSUPPORTED_AUDIO_TYPE' })
    }

    const speaker = cleanMetadataText(decodeHeader(request.headers['x-voice-speaker']))
    const consentRef = cleanMetadataText(decodeHeader(request.headers['x-voice-consent']))
    if (!speaker || !consentRef) {
      return response.status(400).json({
        error: 'Inserisci il parlante e il riferimento al consenso prima di salvare.',
        code: 'MISSING_SPEAKER_METADATA',
      })
    }

    const body = await readBody(request)
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
      return response.status(body.byteLength > MAX_BYTES ? 413 : 400).json({
        error: 'La registrazione è vuota o troppo grande.',
        code: body.byteLength > MAX_BYTES ? 'BODY_TOO_LARGE' : 'EMPTY_BODY',
      })
    }

    let decoded
    try {
      decoded = decodePcmWav(body)
    } catch (error) {
      return response.status(400).json({
        error: error instanceof WavError ? error.message : 'Il file non è un WAV valido.',
        code: error instanceof WavError ? error.code : 'INVALID_WAV',
      })
    }

    const quality = analyzeRecording(decoded.samples, decoded.sampleRate)
    if (quality.grade === 'error') {
      return response.status(422).json({
        error: 'La ripresa non supera il controllo qualità.',
        code: 'QUALITY_REJECTED',
        quality: { grade: quality.grade, headline: quality.headline, issues: quality.issues },
      })
    }

    const recordings = await readRecordings()
    if (recordings[id] && !overwrite) {
      return response.status(409).json({
        error: 'Esiste già una registrazione per questa riga. Conferma la sostituzione.',
        code: 'ALREADY_RECORDED',
      })
    }

    const recordedAt = new Date().toISOString()
    const metadata = normalizeRecordingMetadata({ speaker, consentRef, recordedAt })
    if (!metadata) {
      return response.status(400).json({ error: 'Metadati del parlante non validi.', code: 'INVALID_SPEAKER_METADATA' })
    }

    await putAudio(id, body)
    try {
      await writeRecording(id, metadata)
    } catch (error) {
      await deleteAudio(id)
      throw error
    }

    return response.status(200).json({
      ok: true,
      id,
      text: row.text,
      file: `/api/audio?source=registrata&id=${encodeURIComponent(id)}`,
      bytes: body.byteLength,
      metadata: {
        speaker: metadata.speaker,
        consentRef: metadata.consentRef,
        license: metadata.license,
        recordedAt: metadata.recordedAt,
      },
      quality: { grade: quality.grade, headline: quality.headline },
      manifest: { updated: true, summary: ['Registrazione salvata online.', 'Manifest aggiornato.'] },
    })
  } catch (error) {
    const known = error instanceof ApiRequestError
    console.error(JSON.stringify({
      event: 'corvoc_record_failed',
      requestId,
      code: known ? error.code : error?.code || 'INTERNAL_ERROR',
      message: error?.message || 'unknown',
    }))
    return response.status(known ? error.statusCode : 500).json({
      error: known ? error.message : 'Non riesco a salvare la registrazione online.',
      code: known ? error.code : 'CORVOC_RECORD_FAILED',
      requestId,
    })
  }
}
