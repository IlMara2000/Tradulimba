#!/usr/bin/env node
// Studio di registrazione locale per il corpus vocale.
//
//   npm run voice:record
//   apri http://127.0.0.1:8788
//
// La pagina registra una riga alla volta dal microfono, converte la ripresa in
// WAV mono e la invia a questo server, che la salva in
// public/voce/registrata/<id>.wav e ricostruisce il manifest. Il server ascolta
// solo su loopback e non espone nulla su Internet: è uno strumento di lavoro,
// non un servizio pubblico.
//
// Variabili: VOICE_RECORDER_PORT (8788), VOICE_RECORDER_HOST (127.0.0.1),
// VOICE_RECORDINGS_DIR (default public/voce/registrata),
// VOICE_METADATA_FILE (default voice/registrazioni.json; con una cartella
// esterna, registrazioni.json accanto alla cartella).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { flattenCopione } from '../src/features/voice/copione.js'
import { voiceEntryId } from '../src/features/voice/corpus.js'
import { cleanMetadataText, readRecordingMetadata, writeRecordingMetadata } from './voice-metadata.mjs'
import { buildReport, toCsv, toJson, toMarkdown } from './voice-report.mjs'

const ROOT = process.cwd()
const COPIONE = path.join(ROOT, 'voice/copione.json')
const VOICE_ROOT = path.join(ROOT, 'public/voce')
const DEFAULT_RECORDINGS = path.join(VOICE_ROOT, 'registrata')
const SYNTHETIC = path.join(VOICE_ROOT, 'sintetica')
const TOOLS = path.join(ROOT, 'tools/registrazione')
const RECORDINGS = process.env.VOICE_RECORDINGS_DIR
  ? path.resolve(process.env.VOICE_RECORDINGS_DIR)
  : DEFAULT_RECORDINGS
const METADATA = process.env.VOICE_METADATA_FILE
  ? path.resolve(process.env.VOICE_METADATA_FILE)
  : path.resolve(RECORDINGS) === path.resolve(DEFAULT_RECORDINGS)
    ? path.join(ROOT, 'voice/registrazioni.json')
    : path.join(path.dirname(RECORDINGS), 'registrazioni.json')
const PORT = Number(process.env.VOICE_RECORDER_PORT || 8788)
const HOST = process.env.VOICE_RECORDER_HOST || '127.0.0.1'
const MAX_BODY_BYTES = 20 * 1024 * 1024
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.opus']
const MEDIA_TYPES = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
}
const ID_PATTERN = /^[a-z0-9-]+$/u

const sendJson = (response, statusCode, payload, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const decodeHeader = (value) => {
  if (typeof value !== 'string' || !value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

const sendText = (response, statusCode, body, contentType = 'text/plain; charset=utf-8') => {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(body)
}

const scanAudio = async (directory) => {
  const files = new Map()
  if (!existsSync(directory)) return files
  for (const name of await readdir(directory)) {
    const extension = path.extname(name).toLowerCase()
    if (!AUDIO_EXTENSIONS.includes(extension)) continue
    const id = path.basename(name, path.extname(name))
    const current = files.get(id)
    if (!current || AUDIO_EXTENSIONS.indexOf(extension) < AUDIO_EXTENSIONS.indexOf(path.extname(current).toLowerCase())) {
      files.set(id, name)
    }
  }
  return files
}

const loadScript = async () => {
  const data = JSON.parse(await readFile(COPIONE, 'utf8'))
  const rows = flattenCopione(data)
  const recorded = await scanAudio(RECORDINGS)
  const synthetic = await scanAudio(SYNTHETIC)
  const metadata = await readRecordingMetadata(METADATA).catch((error) => {
    console.warn(JSON.stringify({
      event: 'voice_metadata_unreadable',
      message: error.message,
    }))
    return new Map()
  })

  return rows.map((row, index) => {
    const id = voiceEntryId(row.text, row.variant)
    const recordedFile = recorded.get(id)
    const syntheticFile = synthetic.get(id)
    const recording = metadata.get(id)
    return {
      ...row,
      id,
      index,
      recorded: recordedFile
        ? { file: recordedFile, url: `/api/audio?source=registrata&id=${encodeURIComponent(id)}` }
        : null,
      synthetic: syntheticFile
        ? { file: syntheticFile, url: `/api/audio?source=sintetica&id=${encodeURIComponent(id)}` }
        : null,
      speaker: recording?.speaker ?? row.speaker ?? null,
      consentRef: recording?.consentRef ?? null,
      recordedAt: recording?.recordedAt ?? null,
    }
  })
}

const readBody = (request) => new Promise((resolve, reject) => {
  const chunks = []
  let total = 0

  request.on('data', (chunk) => {
    total += chunk.length
    if (total > MAX_BODY_BYTES) {
      reject(Object.assign(new Error('Registrazione troppo grande.'), { statusCode: 413, code: 'BODY_TOO_LARGE' }))
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', () => resolve(Buffer.concat(chunks)))
  request.on('error', reject)
})

const rebuildManifest = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/voice-corpus.mjs')], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  const timer = setTimeout(() => {
    child.kill('SIGKILL')
    reject(new Error('Il manifest non è stato aggiornato in tempo.'))
  }, 60_000)

  child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
  child.on('error', (error) => {
    clearTimeout(timer)
    reject(error)
  })
  child.on('close', (code) => {
    clearTimeout(timer)
    if (code === 0) resolve(stdout.trim())
    else reject(new Error(stderr.trim() || `voice-corpus: exit ${code}`))
  })
})

const findRecordingFile = async (id) => {
  if (!existsSync(RECORDINGS)) return null
  for (const extension of AUDIO_EXTENSIONS) {
    const name = `${id}${extension}`
    if (existsSync(path.join(RECORDINGS, name))) return name
  }
  return null
}

const serveStatic = async (response, name, contentType) => {
  try {
    const body = await readFile(path.join(TOOLS, name))
    sendText(response, 200, body, contentType)
  } catch {
    sendText(response, 500, 'File dello studio non trovato.')
  }
}

const handleScript = async (response) => {
  const rows = await loadScript()
  const recorded = rows.filter((row) => row.recorded).length
  sendJson(response, 200, {
    rows,
    counts: { total: rows.length, recorded, missing: rows.length - recorded },
    recordingsDir: path.relative(ROOT, RECORDINGS),
    metadataFile: path.relative(ROOT, METADATA),
    defaultRecordings: path.resolve(RECORDINGS) === path.resolve(DEFAULT_RECORDINGS),
  })
}

const REPORT_FORMATS = new Set(['csv', 'md', 'json'])

const handleReport = async (response, format) => {
  if (!REPORT_FORMATS.has(format)) {
    return sendJson(response, 400, {
      error: 'Formato del riepilogo non valido: usa csv, md o json.',
      code: 'INVALID_REPORT_FORMAT',
    })
  }

  const rows = await loadScript()
  const report = buildReport(rows)
  const body = format === 'md' ? toMarkdown(report) : format === 'json' ? toJson(report) : toCsv(report)
  const contentType = format === 'md'
    ? 'text/markdown; charset=utf-8'
    : format === 'json'
      ? 'application/json; charset=utf-8'
      : 'text/csv; charset=utf-8'

  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="riepilogo-registrazioni.${format}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(body)
}

const handleAudio = async (request, response, url) => {
  const source = url.searchParams.get('source')
  const id = url.searchParams.get('id')
  if (!id || !ID_PATTERN.test(id) || !['registrata', 'sintetica'].includes(source)) {
    return sendJson(response, 400, { error: 'Richiesta audio non valida.', code: 'INVALID_AUDIO_REQUEST' })
  }

  const rows = await loadScript()
  const row = rows.find((item) => item.id === id)
  const file = source === 'registrata' ? row?.recorded?.file : row?.synthetic?.file
  if (!file) return sendJson(response, 404, { error: 'Audio non trovato.', code: 'AUDIO_NOT_FOUND' })

  const directory = source === 'registrata' ? RECORDINGS : SYNTHETIC
  try {
    const body = await readFile(path.join(directory, path.basename(file)))
    response.writeHead(200, {
      'Content-Type': MEDIA_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(body)
  } catch {
    sendJson(response, 404, { error: 'Audio non leggibile.', code: 'AUDIO_NOT_FOUND' })
  }
}

const handleRecord = async (request, response, url) => {
  const id = url.searchParams.get('id')
  const overwrite = url.searchParams.get('overwrite') === '1'
  if (!id || !ID_PATTERN.test(id)) {
    return sendJson(response, 400, { error: 'Id della riga non valido.', code: 'INVALID_ID' })
  }

  const rows = await loadScript()
  const row = rows.find((item) => item.id === id)
  if (!row) {
    return sendJson(response, 404, { error: 'Questa riga non è nel copione.', code: 'ROW_NOT_FOUND' })
  }

  const contentType = (request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
  if (!['audio/wav', 'audio/x-wav', 'audio/wave'].includes(contentType)) {
    return sendJson(response, 415, { error: 'Invia la ripresa in WAV.', code: 'UNSUPPORTED_AUDIO_TYPE' })
  }

  const speaker = cleanMetadataText(decodeHeader(request.headers['x-voice-speaker']))
  const consentRef = cleanMetadataText(decodeHeader(request.headers['x-voice-consent']))
  if (!speaker || !consentRef) {
    return sendJson(response, 400, {
      error: 'Inserisci il parlante e il riferimento al consenso prima di salvare.',
      code: 'MISSING_SPEAKER_METADATA',
    })
  }

  const body = await readBody(request)
  if (body.byteLength < 44 || body.subarray(0, 4).toString('ascii') !== 'RIFF' || body.subarray(8, 12).toString('ascii') !== 'WAVE') {
    return sendJson(response, 400, { error: 'Il file non è un WAV valido.', code: 'INVALID_WAV' })
  }

  const existing = await findRecordingFile(id)
  if (existing && !overwrite) {
    return sendJson(response, 409, {
      error: 'Esiste già una registrazione per questa riga. Conferma la sostituzione.',
      code: 'ALREADY_RECORDED',
    })
  }
  if (existing) await rm(path.join(RECORDINGS, existing), { force: true })

  await mkdir(RECORDINGS, { recursive: true })
  const target = path.join(RECORDINGS, `${id}.wav`)
  await writeFile(target, body)

  let metadata
  try {
    metadata = await writeRecordingMetadata(METADATA, id, {
      speaker,
      consentRef,
      recordedAt: new Date().toISOString(),
    })
  } catch (error) {
    return sendJson(response, 500, {
      error: 'Registrazione salvata, ma i metadati del parlante non sono stati scritti.',
      code: 'METADATA_FAILED',
      saved: true,
      file: path.relative(ROOT, target),
      detail: error.message,
    })
  }

  let manifest = { updated: false, reason: 'cartella di registrazione esterna' }
  if (path.resolve(RECORDINGS) === path.resolve(DEFAULT_RECORDINGS)) {
    try {
      const output = await rebuildManifest()
      const summary = output.split('\n').filter(Boolean).slice(-3)
      manifest = { updated: true, summary }
    } catch (error) {
      return sendJson(response, 500, {
        error: 'Registrazione salvata, ma il manifest non è stato aggiornato.',
        code: 'MANIFEST_FAILED',
        saved: true,
        file: path.relative(ROOT, target),
        detail: error.message,
      })
    }
  }

  return sendJson(response, 200, {
    ok: true,
    id,
    text: row.text,
    file: path.relative(ROOT, target),
    bytes: body.byteLength,
    metadata: {
      speaker: metadata.speaker,
      consentRef: metadata.consentRef,
      recordedAt: metadata.recordedAt,
    },
    manifest,
  })
}

const handleRequest = async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    const rows = await loadScript()
    return sendJson(response, 200, {
      ok: true,
      rows: rows.length,
      recorded: rows.filter((row) => row.recorded).length,
      recordingsDir: path.relative(ROOT, RECORDINGS),
      metadataFile: path.relative(ROOT, METADATA),
    })
  }

  if (request.method === 'GET' && url.pathname === '/api/script') {
    return handleScript(response)
  }

  if (request.method === 'GET' && url.pathname === '/api/report') {
    return handleReport(response, url.searchParams.get('format') || 'csv')
  }

  if (request.method === 'GET' && url.pathname === '/api/audio') {
    return handleAudio(request, response, url)
  }

  if (request.method === 'POST' && url.pathname === '/api/record') {
    return handleRecord(request, response, url)
  }

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return serveStatic(response, 'index.html', 'text/html; charset=utf-8')
  }
  if (request.method === 'GET' && url.pathname === '/app.js') {
    return serveStatic(response, 'app.js', 'text/javascript; charset=utf-8')
  }
  if (request.method === 'GET' && url.pathname === '/audio-quality.js') {
    return serveStatic(response, 'audio-quality.js', 'text/javascript; charset=utf-8')
  }
  if (request.method === 'GET' && url.pathname === '/style.css') {
    return serveStatic(response, 'style.css', 'text/css; charset=utf-8')
  }

  return sendJson(response, 404, { error: 'Percorso non trovato.', code: 'NOT_FOUND' })
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(JSON.stringify({
      event: 'voice_recorder_failed',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    }))
    if (!response.headersSent) {
      sendJson(response, error.statusCode || 500, {
        error: error.message || 'Errore nello studio di registrazione.',
        code: error.code || 'INTERNAL_ERROR',
      })
    } else {
      response.end()
    }
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Studio di registrazione su http://${HOST}:${PORT}`)
  console.log(`Registrazioni in ${path.relative(ROOT, RECORDINGS) || RECORDINGS}`)
  console.log('Apri la pagina nel browser, consenti il microfono e registra una riga alla volta.')
})
