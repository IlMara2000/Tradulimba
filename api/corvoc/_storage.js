// Archivio online dello studio: audio in Vercel Blob e indice dei metadati in
// un JSON pubblico. Il manifest dell'app viene ricostruito al volo da
// api/corvoc/manifest.js, così una nuova registrazione è visibile subito.

import { del, get, put } from '@vercel/blob'
import { normalizeRecordingMetadata } from '../../scripts/voice-metadata.mjs'

const METADATA_PATH = 'corvoc/registrazioni.json'
const AUDIO_PREFIX = 'corvoc/registrata/'
const ACCESS = 'public'

export const metadataPath = METADATA_PATH

export const audioPath = (id) => `${AUDIO_PREFIX}${id}.wav`

const readJson = async (pathname) => {
  const result = await get(pathname, { access: ACCESS, useCache: false }).catch((error) => {
    if (error?.name === 'BlobNotFoundError') return null
    throw error
  })
  if (!result) return null
  const text = await new Response(result.stream).text()
  return JSON.parse(text)
}

const writeJson = async (pathname, value) => put(
  pathname,
  JSON.stringify(value),
  {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  },
)

/**
 * @returns {Promise<Record<string, { speaker: string, consentRef: string, license: string, recordedAt: string | null }>>}
 */
export const readRecordings = async () => {
  const data = await readJson(METADATA_PATH)
  const raw = data?.recordings && typeof data.recordings === 'object' && !Array.isArray(data.recordings)
    ? data.recordings
    : {}
  const recordings = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!/^[a-z0-9-]+$/u.test(id)) continue
    const metadata = normalizeRecordingMetadata(value)
    if (metadata) recordings[id] = metadata
  }
  return recordings
}

/**
 * @param {string} id
 * @param {{ speaker: string, consentRef: string, license?: string, recordedAt?: string | null }} value
 */
export const writeRecording = async (id, value) => {
  const metadata = normalizeRecordingMetadata(value)
  if (!metadata) throw new Error('Metadati del parlante non validi.')
  const recordings = await readRecordings()
  recordings[id] = metadata
  await writeJson(METADATA_PATH, { version: 1, recordings })
  return metadata
}

export const putAudio = (id, buffer) => put(audioPath(id), buffer, {
  access: ACCESS,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'audio/wav',
  cacheControlMaxAge: 60,
})

export const readAudio = (id) => get(audioPath(id), { access: ACCESS, useCache: false }).catch((error) => {
  if (error?.name === 'BlobNotFoundError') return null
  throw error
})

export const deleteAudio = (id) => del(audioPath(id)).catch(() => {})
