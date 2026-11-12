import { getRequestId } from '../_requestGuard.js'
import { staticManifestEntry } from './_data.js'
import { readAudio, readRecordings } from './_storage.js'

const ID_PATTERN = /^[a-z0-9-]+$/u
const MEDIA_EXTENSION = /\.(wav|mp3|ogg|m4a|opus)$/iu

const fail = (response, status, error, code, requestId) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json({ error, code, requestId })
}

export default async function handler(request, response) {
  const requestId = getRequestId(request)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Request-ID', requestId)

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return fail(response, 405, 'Metodo non supportato.', 'METHOD_NOT_ALLOWED', requestId)
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const source = url.searchParams.get('source') || 'registrata'
  const rawId = url.searchParams.get('id') || ''
  const id = rawId.replace(MEDIA_EXTENSION, '')

  if (!ID_PATTERN.test(id) || !['registrata', 'sintetica'].includes(source)) {
    return fail(response, 400, 'Richiesta audio non valida.', 'INVALID_AUDIO_REQUEST', requestId)
  }

  try {
    if (source === 'sintetica') {
      const entry = await staticManifestEntry(id, 'sintetica')
      if (!entry) return fail(response, 404, 'Audio non trovato.', 'AUDIO_NOT_FOUND', requestId)
      response.writeHead(302, { Location: entry.file, 'Cache-Control': 'no-store' })
      return response.end()
    }

    const recordings = await readRecordings()
    if (!recordings[id]) return fail(response, 404, 'Audio non trovato.', 'AUDIO_NOT_FOUND', requestId)

    const result = await readAudio(id)
    if (!result) return fail(response, 404, 'Audio non trovato.', 'AUDIO_NOT_FOUND', requestId)

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer())
    response.writeHead(200, {
      'Content-Type': result.blob.contentType || 'audio/wav',
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'no-store',
    })
    return response.end(buffer)
  } catch (error) {
    console.error(JSON.stringify({
      event: 'corvoc_audio_failed',
      requestId,
      id,
      source,
      message: error?.message || 'unknown',
    }))
    return fail(response, 500, 'Non riesco a leggere l’audio online.', 'CORVOC_AUDIO_FAILED', requestId)
  }
}
