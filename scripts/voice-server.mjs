#!/usr/bin/env node
// Server TTS sardo minimale, pensato per essere eseguito accanto a eSpeak NG
// (o sostituito da SINTESA/Piper con lo stesso contratto). L'app lo interroga
// tramite SARDINIAN_TTS_URL; non è un servizio pubblico: per impostazione
// predefinita ascolta solo su 127.0.0.1.
//
//   SARDINIAN_ESPEAK_BIN=... SARDINIAN_ESPEAK_DATA=... npm run voice:server
//
// Variabili: VOICE_SERVER_PORT (8787), VOICE_SERVER_HOST (127.0.0.1),
// VOICE_SERVER_TOKEN (bearer opzionale).

import http from 'node:http'
import { createVoice, normalizeVoiceInput, VoiceError } from '../api/_voice.js'

const PORT = Number(process.env.VOICE_SERVER_PORT || 8787)
const HOST = process.env.VOICE_SERVER_HOST || '127.0.0.1'
const TOKEN = process.env.VOICE_SERVER_TOKEN || ''
const MAX_BODY_BYTES = 64 * 1024

const sendJson = (response, statusCode, payload, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const readBody = (request) => new Promise((resolve, reject) => {
  const chunks = []
  let total = 0

  request.on('data', (chunk) => {
    total += chunk.length
    if (total > MAX_BODY_BYTES) {
      reject(Object.assign(new Error('Richiesta troppo grande.'), { statusCode: 413, code: 'REQUEST_TOO_LARGE' }))
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
    } catch {
      reject(Object.assign(new Error('JSON non valido.'), { statusCode: 400, code: 'INVALID_JSON' }))
    }
  })
  request.on('error', reject)
})

const authorized = (request) => {
  if (!TOKEN) return true
  return request.headers.authorization === `Bearer ${TOKEN}`
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, {
      ok: true,
      engine: process.env.SARDINIAN_ESPEAK_BIN ? 'espeak' : 'unconfigured',
      voice: process.env.SARDINIAN_ESPEAK_VOICE || 'sc',
    })
  }

  if (url.pathname !== '/v1/speak') {
    return sendJson(response, 404, { error: 'Percorso non trovato.', code: 'NOT_FOUND' })
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return sendJson(response, 405, { error: 'Metodo non supportato.', code: 'METHOD_NOT_ALLOWED' })
  }
  if (!authorized(request)) {
    return sendJson(response, 401, { error: 'Token mancante o non valido.', code: 'UNAUTHORIZED' })
  }

  try {
    const input = await readBody(request)
    // La validazione dell'input avviene dentro createVoice; qui si controlla
    // solo che il corpo sia JSON e che il testo non sia assente.
    normalizeVoiceInput(input)

    const result = await createVoice(input)
    const headers = { 'X-Voice-Variant-Support': 'lsc-only' }
    return sendJson(response, 200, result, headers)
  } catch (error) {
    const known = error instanceof VoiceError
    const statusCode = known ? error.statusCode : error.statusCode || 500
    if (statusCode >= 500) {
      console.warn(JSON.stringify({
        event: 'voice_server_failed',
        code: known ? error.code : error.code || 'INTERNAL_ERROR',
        statusCode,
      }))
    }
    return sendJson(response, statusCode, {
      error: known ? error.message : error.message || 'Errore durante la sintesi.',
      code: known ? error.code : error.code || 'INTERNAL_ERROR',
    })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Voce sarda in ascolto su http://${HOST}:${PORT}`)
  console.log(`Motore: ${process.env.SARDINIAN_ESPEAK_BIN || 'non configurato'}`)
  if (!TOKEN) console.log('Nessun VOICE_SERVER_TOKEN: usare solo su rete privata.')
})
