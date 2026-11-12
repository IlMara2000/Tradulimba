import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeRecording } from '../tools/registrazione/audio-quality.js'

const SAMPLE_RATE = 48_000

const silence = (seconds) => new Float32Array(Math.round(seconds * SAMPLE_RATE))

const tone = (seconds, amplitude, frequency = 220) =>
  Float32Array.from(
    { length: Math.round(seconds * SAMPLE_RATE) },
    (_, index) => amplitude * Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE),
  )

const square = (seconds, amplitude) =>
  Float32Array.from(
    { length: Math.round(seconds * SAMPLE_RATE) },
    (_, index) => (Math.floor(index / (SAMPLE_RATE / 440)) % 2 === 0 ? amplitude : -amplitude),
  )

const concat = (...parts) => {
  const total = parts.reduce((length, part) => length + part.length, 0)
  const result = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

const hasIssue = (quality, code, severity) =>
  quality.issues.some((issue) => issue.code === code && (!severity || issue.severity === severity))

test('una ripresa pulita con silenzio ai lati è di qualità buona', () => {
  const quality = analyzeRecording(concat(silence(0.4), tone(1, 0.3), silence(0.4)), SAMPLE_RATE)

  assert.equal(quality.grade, 'ok')
  assert.deepEqual(quality.issues, [])
  assert.ok(quality.leadingSilence > 0.35)
  assert.ok(quality.trailingSilence > 0.35)
  assert.ok(quality.snrDb > 30)
  assert.equal(quality.clippedSamples, 0)
})

test('il silenzio totale non contiene parlato', () => {
  const quality = analyzeRecording(silence(1.5), SAMPLE_RATE)

  assert.equal(quality.grade, 'error')
  assert.ok(hasIssue(quality, 'no-speech', 'error'))
})

test('una ripresa troppo corta viene bloccata', () => {
  const quality = analyzeRecording(tone(0.2, 0.3), SAMPLE_RATE)

  assert.equal(quality.grade, 'error')
  assert.ok(hasIssue(quality, 'too-short', 'error'))
})

test('il clipping esteso viene segnalato come errore', () => {
  const quality = analyzeRecording(concat(silence(0.3), square(1, 1), silence(0.3)), SAMPLE_RATE)

  assert.equal(quality.grade, 'error')
  assert.ok(hasIssue(quality, 'clipping', 'error'))
  assert.ok(quality.clippedRatio > 0.5)
})

test('il rumore di fondo alto e il rapporto voce/rumore basso sono avvisi', () => {
  const quality = analyzeRecording(concat(tone(0.3, 0.03, 1000), tone(1, 0.2), tone(0.3, 0.03, 1000)), SAMPLE_RATE)

  assert.equal(quality.grade, 'warning')
  assert.ok(hasIssue(quality, 'noisy', 'warning'))
  assert.ok(hasIssue(quality, 'low-snr', 'warning'))
})

test('un silenzio iniziale troppo lungo è un avviso', () => {
  const quality = analyzeRecording(concat(silence(4), tone(1, 0.3), silence(0.5)), SAMPLE_RATE)

  assert.equal(quality.grade, 'warning')
  assert.ok(hasIssue(quality, 'long-leading-silence', 'warning'))
})

test('una ripresa troppo bassa è un avviso, non un blocco', () => {
  const quality = analyzeRecording(concat(silence(0.4), tone(0.8, 0.01), silence(0.4)), SAMPLE_RATE)

  assert.equal(quality.grade, 'warning')
  assert.ok(hasIssue(quality, 'quiet', 'warning'))
})

test('la mancanza di silenzio finale è un avviso', () => {
  const quality = analyzeRecording(concat(silence(0.3), tone(0.8, 0.3)), SAMPLE_RATE)

  assert.equal(quality.grade, 'warning')
  assert.ok(hasIssue(quality, 'tight-end', 'warning'))
})

test('un audio continuo senza silenzio viene avvisato, non bocciato', () => {
  const quality = analyzeRecording(tone(1, 0.3), SAMPLE_RATE)

  assert.equal(quality.grade, 'warning')
  assert.equal(quality.noiseFloorDb, null)
  assert.equal(quality.snrDb, null)
  assert.ok(hasIssue(quality, 'no-silence', 'warning'))
  assert.ok(!hasIssue(quality, 'no-speech', 'error'))
})

test('un audio vuoto restituisce un errore esplicito', () => {
  const quality = analyzeRecording(new Float32Array(0), SAMPLE_RATE)

  assert.equal(quality.grade, 'error')
  assert.ok(hasIssue(quality, 'empty', 'error'))
})
