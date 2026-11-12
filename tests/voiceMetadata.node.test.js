import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  cleanMetadataText,
  normalizeRecordingMetadata,
  readRecordingMetadata,
  writeRecordingMetadata,
} from '../scripts/voice-metadata.mjs'

test('normalizza parlante e consenso e applica la licenza predefinita', () => {
  assert.deepEqual(
    normalizeRecordingMetadata({
      speaker: '  Maria   P. ',
      consentRef: ' CONS-01 ',
      recordedAt: '2026-11-11T12:00:00.000Z',
    }),
    {
      speaker: 'Maria P.',
      consentRef: 'CONS-01',
      license: 'consenso del parlante',
      recordedAt: '2026-11-11T12:00:00.000Z',
    },
  )
  assert.equal(normalizeRecordingMetadata({ speaker: 'Maria', consentRef: '' }), null)
  assert.equal(normalizeRecordingMetadata({ speaker: '', consentRef: 'CONS-01' }), null)
  assert.equal(normalizeRecordingMetadata({ speaker: 'Maria', consentRef: 'CONS-01', recordedAt: 'non-data' }).recordedAt, null)
  assert.equal(cleanMetadataText(' a\n b ', 120), 'a b')
  assert.equal(cleanMetadataText('x'.repeat(200), 120).length, 120)
})

test('scrive e rilegge i metadati preservando gli altri take', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tradulimba-metadata-'))
  const file = path.join(directory, 'registrazioni.json')

  try {
    await writeRecordingMetadata(file, 'abba-7f1f4a', {
      speaker: 'Maria P.',
      consentRef: 'CONS-01',
      recordedAt: '2026-11-11T12:00:00.000Z',
    })
    await writeRecordingMetadata(file, 'binu-123456', {
      speaker: 'LSC-01',
      consentRef: 'CONS-02',
    })

    const metadata = await readRecordingMetadata(file)
    assert.equal(metadata.size, 2)
    assert.equal(metadata.get('abba-7f1f4a').speaker, 'Maria P.')
    assert.equal(metadata.get('abba-7f1f4a').consentRef, 'CONS-01')
    assert.equal(metadata.get('abba-7f1f4a').recordedAt, '2026-11-11T12:00:00.000Z')
    assert.equal(metadata.get('binu-123456').recordedAt, null)
    assert.equal(metadata.get('binu-123456').license, 'consenso del parlante')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('un file assente è un indice vuoto e le voci invalide vengono scartate', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tradulimba-metadata-'))
  const missing = path.join(directory, 'assente.json')
  const malformed = path.join(directory, 'parziale.json')

  try {
    assert.equal((await readRecordingMetadata(missing)).size, 0)
    await writeFile(malformed, JSON.stringify({
      recordings: {
        'abba-7f1f4a': { speaker: 'Maria P.', consentRef: 'CONS-01' },
        'senza-consenso': { speaker: 'Anonimo' },
        'id non valido': { speaker: 'Anonimo', consentRef: 'CONS-02' },
      },
    }), 'utf8')

    const metadata = await readRecordingMetadata(malformed)
    assert.equal(metadata.size, 1)
    assert.equal(metadata.has('abba-7f1f4a'), true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rifiuta di scrivere metadati incompleti o id non validi', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tradulimba-metadata-'))
  const file = path.join(directory, 'registrazioni.json')

  try {
    await assert.rejects(
      writeRecordingMetadata(file, 'abba-7f1f4a', { speaker: 'Maria P.', consentRef: '' }),
      /Metadati del parlante non validi/,
    )
    await assert.rejects(
      writeRecordingMetadata(file, '../abba', { speaker: 'Maria P.', consentRef: 'CONS-01' }),
      /Metadati del parlante non validi/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
