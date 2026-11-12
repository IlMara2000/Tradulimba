import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { selectCorpusEntry, voiceEntryId } from '../src/features/voice/corpus.js'
import { voiceNotice } from '../src/features/voice/labels.js'
import { readRecordingMetadata } from '../scripts/voice-metadata.mjs'
import { analyzeRecording } from '../tools/registrazione/audio-quality.js'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const SAMPLE_RATE = 22050
const TEST_TEXT = 'abba'
const TEST_VARIANT = 'lsc'
const TEST_ID = voiceEntryId(TEST_TEXT, TEST_VARIANT)
const TEST_SPEAKER = 'TEST-E2E'
const TEST_CONSENT = 'E2E-2026-11'

const digest = (value) => createHash('sha256').update(value).digest('hex')

const fileOrNull = (file) => readFile(file).catch(() => null)
const listDirectory = (directory) => readdir(directory).catch(() => [])

/** Un WAV PCM mono 16 bit, con silenzio iniziale e finale. */
const makeSpeechLikeSamples = () => {
  const lead = 0.25
  const tone = 0.8
  const tail = 0.25
  const samples = new Float32Array(Math.round((lead + tone + tail) * SAMPLE_RATE))
  for (let index = 0; index < samples.length; index += 1) {
    const seconds = index / SAMPLE_RATE
    if (seconds < lead || seconds >= lead + tone) continue
    const local = seconds - lead
    const envelope = Math.min(1, local / 0.05, (tone - local) / 0.05)
    samples[index] = 0.22 * envelope * (
      Math.sin(2 * Math.PI * 180 * local)
      + 0.35 * Math.sin(2 * Math.PI * 360 * local)
    )
  }
  return samples
}

const encodeWav = (samples, sampleRate) => {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)
  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[index] * 32767))), 44 + index * 2)
  }
  return buffer
}

const getFreePort = async () => {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(undefined))
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : null
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))))
  if (!port) throw new Error('Porta libera non trovata.')
  return port
}

const waitForExit = (child, milliseconds) => new Promise((resolve) => {
  if (child.exitCode !== null) {
    resolve(true)
    return
  }
  const timer = setTimeout(() => {
    child.off('close', onClose)
    resolve(false)
  }, milliseconds)
  const onClose = () => {
    clearTimeout(timer)
    resolve(true)
  }
  child.once('close', onClose)
})

const stopChild = async (child) => {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  if (await waitForExit(child, 2000)) return
  child.kill('SIGKILL')
  await waitForExit(child, 2000)
}

const waitForHealth = async (port, child, getStderr) => {
  let lastError = null
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Studio terminato (${child.exitCode}): ${getStderr().trim() || 'nessun errore'}`)
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) return await response.json()
      lastError = new Error(`health: HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Studio non pronto: ${lastError?.message || 'timeout'}`)
}

const startServer = async (recordingsDir, metadataPath) => {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const port = await getFreePort()
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts/voice-recorder.mjs')], {
      cwd: ROOT,
      env: {
        ...process.env,
        VOICE_RECORDINGS_DIR: recordingsDir,
        VOICE_METADATA_FILE: metadataPath,
        VOICE_RECORDER_PORT: String(port),
        VOICE_RECORDER_HOST: '127.0.0.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.stdout.on('data', () => {})
    try {
      const health = await waitForHealth(port, child, () => stderr)
      return { child, port, health }
    } catch (error) {
      lastError = error
      await stopChild(child)
    }
  }
  throw lastError
}

test('E2E: carica un WAV di prova e verifica metadati, manifest e nota senza toccare il corpus reale', { timeout: 30_000 }, async () => {
  const realManifestPath = path.join(ROOT, 'public/voce/manifest.json')
  const realRecordingsDir = path.join(ROOT, 'public/voce/registrata')
  const realMetadataPath = path.join(ROOT, 'voice/registrazioni.json')
  const realSyntheticDir = path.join(ROOT, 'public/voce/sintetica')

  const realManifestBefore = await readFile(realManifestPath, 'utf8')
  const realRecordingsBefore = (await listDirectory(realRecordingsDir)).sort()
  const realMetadataBefore = await fileOrNull(realMetadataPath)
  const realSyntheticBefore = (await listDirectory(realSyntheticDir)).sort()

  const cacheDir = path.join(ROOT, '.cache')
  await mkdir(cacheDir, { recursive: true })
  const tempRoot = await mkdtemp(path.join(cacheDir, 'voice-e2e-'))
  const recordingsDir = path.join(tempRoot, 'registrata')
  const metadataPath = path.join(tempRoot, 'registrazioni.json')
  const manifestPath = path.join(tempRoot, 'manifest.json')
  const fixturePath = path.join(tempRoot, 'fixture.wav')
  await mkdir(recordingsDir, { recursive: true })

  const samples = makeSpeechLikeSamples()
  const quality = analyzeRecording(samples, SAMPLE_RATE)
  assert.equal(quality.grade, 'ok', `Il WAV di prova non è pulito: ${quality.issues.map((issue) => issue.code).join(', ')}`)
  const wav = encodeWav(samples, SAMPLE_RATE)
  await writeFile(fixturePath, wav)

  let child = null
  try {
    const started = await startServer(recordingsDir, metadataPath)
    child = started.child
    assert.equal(started.health.recorded, 0, 'Il corpus temporaneo deve partire vuoto.')

    const response = await fetch(`http://127.0.0.1:${started.port}/api/record?id=${encodeURIComponent(TEST_ID)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        'X-Voice-Speaker': TEST_SPEAKER,
        'X-Voice-Consent': TEST_CONSENT,
      },
      body: wav,
    })
    assert.equal(response.status, 200)
    const upload = await response.json()
    assert.equal(upload.ok, true)
    assert.equal(upload.id, TEST_ID)
    assert.equal(upload.bytes, wav.byteLength)
    assert.equal(upload.metadata.speaker, TEST_SPEAKER)
    assert.equal(upload.metadata.consentRef, TEST_CONSENT)
    assert.equal(upload.manifest.updated, false, 'Con una cartella esterna il manifest reale non deve essere ricostruito.')

    assert.deepEqual(await readFile(path.join(recordingsDir, `${TEST_ID}.wav`)), wav)

    const metadata = await readRecordingMetadata(metadataPath)
    assert.equal(metadata.size, 1)
    const savedMetadata = metadata.get(TEST_ID)
    assert.ok(savedMetadata)
    assert.equal(savedMetadata.speaker, TEST_SPEAKER)
    assert.equal(savedMetadata.consentRef, TEST_CONSENT)
    assert.equal(savedMetadata.license, 'consenso del parlante')
    assert.ok(savedMetadata.recordedAt)

    const { stdout } = await execFileAsync(process.execPath, [path.join(ROOT, 'scripts/voice-corpus.mjs')], {
      cwd: ROOT,
      env: {
        ...process.env,
        VOICE_RECORDINGS_DIR: recordingsDir,
        VOICE_METADATA_FILE: metadataPath,
        VOICE_MANIFEST_FILE: manifestPath,
      },
      maxBuffer: 2 * 1024 * 1024,
    })
    assert.match(stdout, /Manifest: 207 clip \(1 registrate, 206 sintetiche\)/)

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    assert.equal(manifest.entries.length, 207)
    const registered = manifest.entries.filter((entry) => entry.source === 'registrata')
    assert.equal(registered.length, 1)
    const synthetic = manifest.entries.filter((entry) => entry.source === 'sintetica')
    assert.equal(synthetic.length, 206)

    const entry = registered[0]
    assert.equal(entry.id, TEST_ID)
    assert.equal(entry.text, TEST_TEXT)
    assert.equal(entry.variant, TEST_VARIANT)
    assert.equal(entry.file, `/voce/registrata/${TEST_ID}.wav`)
    assert.equal(entry.speaker, TEST_SPEAKER)
    assert.equal(entry.consentRef, TEST_CONSENT)
    assert.equal(entry.license, 'consenso del parlante')
    assert.equal(entry.recordedAt, savedMetadata.recordedAt)

    const selected = selectCorpusEntry(manifest, TEST_TEXT, TEST_VARIANT)
    assert.equal(selected?.source, 'registrata', 'La registrazione deve avere priorità sulla clip sintetica.')
    assert.equal(selected?.id, TEST_ID)

    const note = voiceNotice(entry.source, entry)
    assert.match(note, /^Voce sarda registrata da TEST-E2E, presa dal corpus\./)
    assert.match(note, /Consenso: E2E-2026-11\./)
    assert.match(note, /Registrata il \d{2}\/\d{2}\/\d{4}\./)
    assert.doesNotMatch(note, /sintetica/u)

    assert.equal(digest(await readFile(realManifestPath, 'utf8')), digest(realManifestBefore))
    assert.deepEqual((await listDirectory(realRecordingsDir)).sort(), realRecordingsBefore)
    assert.deepEqual(await fileOrNull(realMetadataPath), realMetadataBefore)
    assert.deepEqual((await listDirectory(realSyntheticDir)).sort(), realSyntheticBefore)
  } finally {
    await stopChild(child)
    await rm(tempRoot, { recursive: true, force: true })
  }
})
