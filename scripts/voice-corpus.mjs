#!/usr/bin/env node
// Costruisce il corpus vocale e il manifest letto dall'app.
//
//   npm run voice:corpus            # manifest dalle clip già presenti
//   npm run voice:synth             # genera le clip LSC con eSpeak NG e poi il manifest
//   npm run voice:check             # elenca le righe ancora senza audio
//   npm run voice:list              # stampa gli id dei file da registrare
//
// Le registrazioni umane vanno in public/voce/registrata/<id>.<estensione>,
// le clip sintetiche in public/voce/sintetica/<id>.<estensione>. Lo stesso id
// può esistere in entrambe: il manifest le conserva tutte e l'app preferisce
// sempre la registrazione umana. I metadati di parlante e consenso stanno in
// voice/registrazioni.json (o in VOICE_METADATA_FILE) e vengono copiati nel
// manifest.
//
// Per prove isolate si possono spostare registrazioni e manifest con
// VOICE_RECORDINGS_DIR e VOICE_MANIFEST_FILE; le clip sintetiche restano in
// public/voce/sintetica.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { voiceEntryId } from '../src/features/voice/corpus.js'
import { flattenCopione } from '../src/features/voice/copione.js'
import { readRecordingMetadata } from './voice-metadata.mjs'

const ROOT = process.cwd()
const COPIONE = path.join(ROOT, 'voice/copione.json')
const METADATA = process.env.VOICE_METADATA_FILE
  ? path.resolve(process.env.VOICE_METADATA_FILE)
  : path.join(ROOT, 'voice/registrazioni.json')
const VOICE_ROOT = path.join(ROOT, 'public/voce')
const RECORDINGS = process.env.VOICE_RECORDINGS_DIR
  ? path.resolve(process.env.VOICE_RECORDINGS_DIR)
  : path.join(VOICE_ROOT, 'registrata')
const MANIFEST = process.env.VOICE_MANIFEST_FILE
  ? path.resolve(process.env.VOICE_MANIFEST_FILE)
  : path.join(VOICE_ROOT, 'manifest.json')
const DIRS = {
  registrata: RECORDINGS,
  sintetica: path.join(VOICE_ROOT, 'sintetica'),
}
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.opus'])
const MEDIA_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.opus': 'audio/ogg',
}

const flags = new Set(process.argv.slice(2))
const shouldSynthesize = flags.has('--synth')
const shouldForce = flags.has('--force')
const shouldCheck = flags.has('--check')
const shouldList = flags.has('--list')

const espeakBin = process.env.SARDINIAN_ESPEAK_BIN
  || path.join(ROOT, '.cache/espeak-ng/build/src/espeak-ng')
const espeakData = process.env.SARDINIAN_ESPEAK_DATA
  || path.join(ROOT, '.cache/espeak-ng/build/espeak-ng-data')
const espeakSpeed = process.env.SARDINIAN_ESPEAK_SPEED || '145'

const run = (command, args, { input = '', timeoutMs = 30_000 } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] })
  let stderr = ''
  let settled = false

  const finish = (error) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (error) reject(error)
    else resolve()
  }

  const timer = setTimeout(() => {
    child.kill('SIGKILL')
    finish(Object.assign(new Error(`${command}: timeout`), { code: 'TIMEOUT' }))
  }, timeoutMs)

  child.stderr.on('data', (chunk) => {
    if (stderr.length < 8192) stderr += chunk.toString('utf8')
  })
  child.on('error', (error) => finish(error))
  child.on('close', (code) => {
    if (code !== 0) {
      finish(Object.assign(new Error(`${command}: exit ${code}${stderr ? ` — ${stderr.trim()}` : ''}`), {
        code: 'PROCESS_FAILED',
      }))
      return
    }
    finish(null)
  })

  child.stdin.on('error', () => {})
  child.stdin.end(input)
})

const readCopione = async () => {
  const data = JSON.parse(await readFile(COPIONE, 'utf8'))
  return flattenCopione(data)
}

const scanAudio = async (directory) => {
  const files = new Map()
  if (!existsSync(directory)) return files
  for (const name of await readdir(directory)) {
    const extension = path.extname(name).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(extension)) continue
    const id = path.basename(name, path.extname(name))
    if (!files.has(id)) files.set(id, name)
  }
  return files
}

const installSyntheticClip = async (row, id) => {
  const wav = path.join(DIRS.sintetica, `${id}.wav`)
  const mp3 = path.join(DIRS.sintetica, `${id}.mp3`)
  await rm(mp3, { force: true })

  const espeakArgs = []
  if (existsSync(espeakData)) espeakArgs.push('--path', espeakData)
  espeakArgs.push('-v', 'sc', '-s', espeakSpeed, '-w', wav, '--stdin')
  await run(espeakBin, espeakArgs, { input: row.text })

  try {
    await run('ffmpeg', [
      '-y',
      '-loglevel', 'error',
      '-i', wav,
      '-ac', '1',
      '-ar', '22050',
      '-b:a', '64k',
      mp3,
    ])
    await rm(wav, { force: true })
    return 'mp3'
  } catch {
    // Senza ffmpeg il WAV resta valido e il browser lo riproduce.
    return 'wav'
  }
}

const main = async () => {
  const rows = await readCopione()
  if (rows.length === 0) {
    console.error('Il copione non contiene righe registrabili.')
    process.exitCode = 1
    return
  }

  await mkdir(DIRS.registrata, { recursive: true })
  await mkdir(DIRS.sintetica, { recursive: true })

  const recorded = await scanAudio(DIRS.registrata)
  const synthetic = await scanAudio(DIRS.sintetica)
  let recordingMetadata = new Map()
  try {
    recordingMetadata = await readRecordingMetadata(METADATA)
  } catch (error) {
    console.warn(`Metadati delle registrazioni non leggibili (${path.relative(ROOT, METADATA)}): ${error.message}`)
  }

  if (shouldSynthesize && !existsSync(espeakBin)) {
    console.error(`Motore eSpeak non trovato in ${espeakBin}`)
    console.error('Esegui prima: npm run voice:setup')
    process.exitCode = 1
    return
  }

  let generated = 0
  let skippedVariant = 0
  let skippedUnsupported = 0

  for (const row of rows) {
    const id = voiceEntryId(row.text, row.variant)

    if (shouldList) {
      console.log(`${id}\t${row.variant}\t${row.kind}\t${row.text}`)
      continue
    }

    if (shouldSynthesize && row.variant !== 'lsc') {
      skippedVariant += 1
      continue
    }

    if (shouldSynthesize && row.synthesisExcluded) {
      skippedUnsupported += 1
      if (synthetic.has(id)) {
        await rm(path.join(DIRS.sintetica, synthetic.get(id)), { force: true })
        synthetic.delete(id)
        console.log(`- ${id}: clip sintetica rimossa (lli/nni palatale non resa da eSpeak)`)
      }
      continue
    }

    if (shouldSynthesize && !recorded.has(id) && (shouldForce || !synthetic.has(id))) {
      try {
        const extension = await installSyntheticClip(row, id)
        synthetic.set(id, `${id}.${extension}`)
        generated += 1
        console.log(`+ ${id}.${extension}`)
      } catch (error) {
        console.error(`! ${id}: ${error.message}`)
        process.exitCode = 1
      }
    }
  }

  if (shouldList) return

  const entries = []
  const missing = []

  for (const row of rows) {
    const id = voiceEntryId(row.text, row.variant)
    const available = []

    if (recorded.has(id)) {
      const name = recorded.get(id)
      const extension = path.extname(name).toLowerCase()
      const metadata = recordingMetadata.get(id)
      available.push({
        id,
        text: row.text,
        normalized: row.normalized,
        variant: row.variant,
        kind: row.kind,
        source: 'registrata',
        file: `/voce/registrata/${name}`,
        mediaType: MEDIA_TYPES[extension] || 'audio/mpeg',
        engine: null,
        speaker: metadata?.speaker ?? row.speaker,
        consentRef: metadata?.consentRef ?? null,
        recordedAt: metadata?.recordedAt ?? null,
        license: metadata?.license ?? 'consenso del parlante',
      })
    }

    if (synthetic.has(id)) {
      const name = synthetic.get(id)
      const extension = path.extname(name).toLowerCase()
      available.push({
        id,
        text: row.text,
        normalized: row.normalized,
        variant: row.variant,
        kind: row.kind,
        source: 'sintetica',
        file: `/voce/sintetica/${name}`,
        mediaType: MEDIA_TYPES[extension] || 'audio/mpeg',
        engine: 'eSpeak NG · sc',
        speaker: null,
        consentRef: null,
        recordedAt: null,
        license: 'CC0-1.0',
      })
    }

    if (available.length === 0) missing.push(row)
    entries.push(...available)
  }

  entries.sort((left, right) => (
    left.normalized.localeCompare(right.normalized, 'it')
    || left.variant.localeCompare(right.variant)
    || (left.source === right.source ? 0 : left.source === 'registrata' ? -1 : 1)
  ))

  await mkdir(path.dirname(MANIFEST), { recursive: true })
  await writeFile(
    MANIFEST,
    `${JSON.stringify({ version: 1, entries }, null, 2)}\n`,
    'utf8',
  )

  const recordedCount = entries.filter((entry) => entry.source === 'registrata').length
  const syntheticCount = entries.filter((entry) => entry.source === 'sintetica').length
  const withoutConsent = entries.filter((entry) => entry.source === 'registrata' && !entry.consentRef).length
  console.log(`\nManifest: ${entries.length} clip (${recordedCount} registrate, ${syntheticCount} sintetiche)`)
  console.log(`Righe del copione: ${rows.length}; senza audio: ${missing.length}`)
  if (withoutConsent > 0) {
    console.log(`Registrazioni senza riferimento al consenso: ${withoutConsent} (aggiungile dallo studio o in ${path.relative(ROOT, METADATA)}).`)
  }
  if (generated > 0) console.log(`Clip sintetiche generate: ${generated}`)
  if (skippedVariant > 0) {
    console.log(`Righe non sintetizzate perché non LSC: ${skippedVariant} (servono registrazioni umane o un motore di varietà).`)
  }
  if (skippedUnsupported > 0) {
    console.log(`Righe con lli/nni non sintetizzate: ${skippedUnsupported} (eSpeak non rende [ʎ]/[ɲ]; servono registrazioni umane).`)
  }

  if (shouldCheck) {
    if (missing.length > 0) {
      console.error('\nRighe ancora da registrare:')
      for (const row of missing) {
        console.error(`- ${voiceEntryId(row.text, row.variant)}  ${row.variant}  ${row.text}`)
      }
      process.exitCode = 1
    } else {
      console.log('\nTutte le righe del copione hanno almeno una clip.')
    }
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
