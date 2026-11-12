// Metadati delle registrazioni umane: parlante e riferimento al consenso.
//
// Il file predefinito è voice/registrazioni.json. Non sta in public/: il
// manifest pubblico ne riporta i campi, ma il documento di consenso non deve
// mai essere copiato qui. Il riferimento è un codice interno, non il consenso
// firmato.

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const METADATA_VERSION = 1
export const DEFAULT_LICENSE = 'consenso del parlante'
export const SPEAKER_MAX_LENGTH = 120
export const CONSENT_MAX_LENGTH = 120
export const LICENSE_MAX_LENGTH = 160

const ID_PATTERN = /^[a-z0-9-]+$/u

/**
 * Ripulisce un valore destinato al manifest: niente caratteri di controllo,
 * spazi normalizzati e lunghezza limitata.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export const cleanMetadataText = (value, maxLength = SPEAKER_MAX_LENGTH) => {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * @param {unknown} value
 * @returns {{ speaker: string, consentRef: string, license: string, recordedAt: string | null } | null}
 */
export const normalizeRecordingMetadata = (value) => {
  if (!value || typeof value !== 'object') return null
  const speaker = cleanMetadataText(/** @type {any} */ (value).speaker, SPEAKER_MAX_LENGTH)
  const consentRef = cleanMetadataText(/** @type {any} */ (value).consentRef, CONSENT_MAX_LENGTH)
  if (!speaker || !consentRef) return null

  const license = cleanMetadataText(/** @type {any} */ (value).license, LICENSE_MAX_LENGTH)
  const rawRecordedAt = /** @type {any} */ (value).recordedAt
  const recordedAt = typeof rawRecordedAt === 'string' && !Number.isNaN(Date.parse(rawRecordedAt))
    ? new Date(rawRecordedAt).toISOString()
    : null

  return {
    speaker,
    consentRef,
    license: license || DEFAULT_LICENSE,
    recordedAt,
  }
}

/**
 * Legge l'indice delle registrazioni. Un file assente è un indice vuoto; un
 * file illeggibile è un errore che il chiamante deve segnalare.
 * @param {string} file
 * @returns {Promise<Map<string, { speaker: string, consentRef: string, license: string, recordedAt: string | null }>>}
 */
export const readRecordingMetadata = async (file) => {
  if (!existsSync(file)) return new Map()
  const data = JSON.parse(await readFile(file, 'utf8'))
  const recordings = data?.recordings && typeof data.recordings === 'object' && !Array.isArray(data.recordings)
    ? data.recordings
    : {}

  const result = new Map()
  for (const [id, raw] of Object.entries(recordings)) {
    if (!ID_PATTERN.test(id)) continue
    const metadata = normalizeRecordingMetadata(raw)
    if (metadata) result.set(id, metadata)
  }
  return result
}

/**
 * Aggiunge o sostituisce i metadati di un take, preservando gli altri.
 * @param {string} file
 * @param {string} id
 * @param {{ speaker?: unknown, consentRef?: unknown, license?: unknown, recordedAt?: unknown }} value
 * @returns {Promise<{ speaker: string, consentRef: string, license: string, recordedAt: string | null }>}
 */
export const writeRecordingMetadata = async (file, id, value) => {
  const metadata = normalizeRecordingMetadata(value)
  if (!metadata || !ID_PATTERN.test(id)) {
    throw Object.assign(new Error('Metadati del parlante non validi.'), {
      code: 'INVALID_SPEAKER_METADATA',
    })
  }

  let recordings = {}
  if (existsSync(file)) {
    const data = JSON.parse(await readFile(file, 'utf8'))
    if (data?.recordings && typeof data.recordings === 'object' && !Array.isArray(data.recordings)) {
      recordings = { ...data.recordings }
    }
  }

  recordings[id] = metadata
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify({ version: METADATA_VERSION, recordings }, null, 2)}\n`, 'utf8')
  return metadata
}
