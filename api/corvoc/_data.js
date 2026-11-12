// Dati del copione e composizione del corpus online. Le righe statiche vengono
// dal copione versionato; le registrazioni arrivano dall'indice Blob.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { flattenCopione } from '../../src/features/voice/copione.js'
import { voiceEntryId } from '../../src/features/voice/corpus.js'
import { readRecordings } from './_storage.js'

const SOURCE_RANK = { registrata: 0, sintetica: 1 }
let staticPromise = null

const readJson = async (relative) => JSON.parse(await readFile(path.join(process.cwd(), relative), 'utf8'))

const loadStatic = async () => {
  if (!staticPromise) {
    staticPromise = Promise.all([
      readJson('voice/copione.json'),
      readJson('public/voce/manifest.json'),
    ]).then(([copione, manifest]) => ({
      rows: flattenCopione(copione),
      manifest,
    }))
  }
  return staticPromise
}

const onlineFile = (id) => `/api/audio?source=registrata&id=${encodeURIComponent(id)}`

export const loadScriptRows = async () => {
  const { rows, manifest } = await loadStatic()
  const online = await readRecordings()
  const syntheticById = new Map(
    manifest.entries.filter((entry) => entry.source === 'sintetica').map((entry) => [entry.id, entry]),
  )
  const recordedById = new Map(
    manifest.entries.filter((entry) => entry.source === 'registrata').map((entry) => [entry.id, entry]),
  )
  for (const [id, metadata] of Object.entries(online)) {
    recordedById.set(id, {
      file: onlineFile(id),
      speaker: metadata.speaker,
      consentRef: metadata.consentRef,
      recordedAt: metadata.recordedAt,
    })
  }

  return rows.map((row, index) => {
    const id = voiceEntryId(row.text, row.variant)
    const synthetic = syntheticById.get(id)
    const recorded = recordedById.get(id)
    return {
      ...row,
      id,
      index,
      recorded: recorded
        ? {
            file: recorded.file,
            url: `${recorded.file}${recorded.file.includes('?') ? '&' : '?'}t=${Date.now()}`,
            speaker: recorded.speaker ?? null,
            consentRef: recorded.consentRef ?? null,
            recordedAt: recorded.recordedAt ?? null,
          }
        : null,
      synthetic: synthetic
        ? { file: synthetic.file, url: synthetic.file }
        : null,
      speaker: recorded?.speaker ?? row.speaker ?? null,
      consentRef: recorded?.consentRef ?? null,
      recordedAt: recorded?.recordedAt ?? null,
    }
  })
}

export const findScriptRow = async (id) => {
  const { rows } = await loadStatic()
  return rows.find((row) => voiceEntryId(row.text, row.variant) === id) || null
}

export const buildManifest = async () => {
  const { rows, manifest } = await loadStatic()
  const online = await readRecordings()
  const rowById = new Map(rows.map((row) => [voiceEntryId(row.text, row.variant), row]))
  const entriesByKey = new Map()

  for (const entry of manifest.entries) {
    entriesByKey.set(`${entry.source}:${entry.id}`, entry)
  }

  for (const [id, metadata] of Object.entries(online)) {
    const row = rowById.get(id)
    if (!row) continue
    entriesByKey.set(`registrata:${id}`, {
      id,
      text: row.text,
      normalized: row.normalized,
      variant: row.variant,
      kind: row.kind,
      source: 'registrata',
      file: onlineFile(id),
      mediaType: 'audio/wav',
      engine: null,
      speaker: metadata.speaker,
      consentRef: metadata.consentRef,
      recordedAt: metadata.recordedAt,
      license: metadata.license || 'consenso del parlante',
    })
  }

  const entries = [...entriesByKey.values()].sort((left, right) => (
    left.normalized.localeCompare(right.normalized, 'it')
    || left.variant.localeCompare(right.variant)
    || (SOURCE_RANK[left.source] ?? 9) - (SOURCE_RANK[right.source] ?? 9)
  ))

  return { version: 1, entries }
}

export const staticManifestEntry = async (id, source) => {
  const { manifest } = await loadStatic()
  return manifest.entries.find((entry) => entry.id === id && entry.source === source) || null
}
