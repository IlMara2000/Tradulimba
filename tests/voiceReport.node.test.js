import assert from 'node:assert/strict'
import test from 'node:test'
import { voiceEntryId } from '../src/features/voice/corpus.js'
import {
  buildReport,
  buildSessions,
  estimateSpeechSeconds,
  estimateTakeSeconds,
  formatMinutes,
  toCsv,
  toJson,
  toMarkdown,
} from '../scripts/voice-report.mjs'

const GENERATED_AT = '2026-11-11T12:00:00.000Z'

const rows = [
  {
    text: 'abba',
    variant: 'lsc',
    kind: 'word',
    group: 'alfabeto',
    groupLabel: 'Alfabeto',
    recorded: true,
    synthetic: true,
  },
  {
    text: 'binu',
    variant: 'lsc',
    kind: 'word',
    group: 'alfabeto',
    groupLabel: 'Alfabeto',
    recorded: false,
    synthetic: true,
  },
  {
    text: 'Dì; "ciao"',
    variant: 'lsc',
    kind: 'phrase',
    group: 'frasi',
    groupLabel: 'Frasi',
    recorded: false,
    synthetic: false,
  },
]

test('stima il parlato e il take con la formula dichiarata', () => {
  assert.equal(estimateSpeechSeconds('abba'), 1.2)
  assert.equal(estimateTakeSeconds('abba'), 5.7)
  assert.equal(estimateSpeechSeconds(''), 0)
  assert.equal(estimateTakeSeconds(''), 4.5)
  assert.ok(estimateSpeechSeconds('Bonas dies, comente istas?') > 2)
  assert.equal(formatMinutes(1500), '25,0')
})

test('aggrega le righe mancanti per gruppo', () => {
  const report = buildReport(rows, { generatedAt: GENERATED_AT })

  assert.equal(report.generatedAt, GENERATED_AT)
  assert.equal(report.totals.total, 3)
  assert.equal(report.totals.recorded, 1)
  assert.equal(report.totals.missing, 2)
  assert.equal(report.totals.syntheticOnly, 1)
  assert.equal(report.totals.noAudio, 1)
  assert.equal(report.groups.length, 2)

  const alphabet = report.groups.find((group) => group.id === 'alfabeto')
  assert.equal(alphabet.total, 2)
  assert.equal(alphabet.recorded, 1)
  assert.equal(alphabet.missing, 1)
  assert.equal(alphabet.syntheticOnly, 1)
  assert.equal(alphabet.noAudio, 0)

  const phrases = report.groups.find((group) => group.id === 'frasi')
  assert.equal(phrases.missing, 1)
  assert.equal(phrases.syntheticOnly, 0)
  assert.equal(phrases.noAudio, 1)

  assert.equal(report.rows.length, 2)
  assert.equal(report.rows[0].id, voiceEntryId('binu', 'lsc'))
  assert.ok(report.totals.takeSeconds > report.totals.speechSeconds)
  assert.equal(report.totals.sessions25, 1)
})

test('esporta un CSV con BOM, separatore punto e virgola e celle escapate', () => {
  const csv = toCsv(buildReport(rows, { generatedAt: GENERATED_AT }))

  assert.ok(csv.startsWith('\uFEFF'))
  assert.match(csv, /^﻿gruppo;id;varieta;tipo;testo;audio_sintetico;secondi_voce;secondi_take;minuti_take\n/u)
  assert.match(csv, /Alfabeto;binu-/u)
  assert.ok(csv.includes('"Dì; ""ciao"""'))
  assert.doesNotMatch(csv, /^.*abba.*$/mu)
})

test('esporta un Markdown con gruppi, totali e nota sulla stima', () => {
  const markdown = toMarkdown(buildReport(rows, { generatedAt: GENERATED_AT }))

  assert.match(markdown, /# Riepilogo registrazioni TraduLimba/u)
  assert.match(markdown, /11\/11\/2026/u)
  assert.match(markdown, /Alfabeto/u)
  assert.match(markdown, /Frasi/u)
  assert.match(markdown, /Totale/u)
  assert.match(markdown, /0,45 s per parola/u)
  assert.match(markdown, /senza voce umana: 2/u)
})

test('buildSessions divide le righe in blocchi da 25 minuti', () => {
  const rows = [
    { id: 'a', takeSeconds: 600 }, // 10 min
    { id: 'b', takeSeconds: 600 }, // 10 min
    { id: 'c', takeSeconds: 600 }, // 10 min
    { id: 'd', takeSeconds: 600 }, // 10 min
    { id: 'e', takeSeconds: 600 }, // 10 min
  ]
  const sessions = buildSessions(rows)
  assert.equal(sessions.length, 3)
  assert.deepEqual(sessions[0], { index: 1, startId: 'a', endId: 'b', takeSeconds: 1200, rows: 2 })
  assert.deepEqual(sessions[1], { index: 2, startId: 'c', endId: 'd', takeSeconds: 1200, rows: 2 })
  assert.deepEqual(sessions[2], { index: 3, startId: 'e', endId: 'e', takeSeconds: 600, rows: 1 })

  // Una riga sola molto lunga
  const single = buildSessions([{ id: 'x', takeSeconds: 2000 }])
  assert.equal(single.length, 1)
  assert.deepEqual(single[0], { index: 1, startId: 'x', endId: 'x', takeSeconds: 2000, rows: 1 })

  // Esattamente 25 min
  const exact = buildSessions([{ id: 'y', takeSeconds: 1500 }])
  assert.equal(exact.length, 1)
  assert.deepEqual(exact[0], { index: 1, startId: 'y', endId: 'y', takeSeconds: 1500, rows: 1 })
})

test('esporta il JSON completo e gestisce un copione già completo', () => {
  const report = buildReport(rows, { generatedAt: GENERATED_AT })
  const parsed = JSON.parse(toJson(report))
  assert.equal(parsed.totals.missing, 2)
  assert.equal(parsed.sessionMinutes, 25)

  const complete = buildReport([
    {
      text: 'abba',
      variant: 'lsc',
      kind: 'word',
      group: 'alfabeto',
      groupLabel: 'Alfabeto',
      recorded: true,
      synthetic: true,
    },
  ], { generatedAt: GENERATED_AT })

  assert.equal(complete.totals.missing, 0)
  assert.equal(complete.totals.sessions25, 0)
  assert.match(toMarkdown(complete), /Nessuna riga da registrare/u)
  assert.equal(toCsv(complete).trim().split('\n').length, 1)

  const reportWithSessions = buildReport(rows, { generatedAt: GENERATED_AT })
  const mdWithSessions = toMarkdown(reportWithSessions, true)
  assert.match(mdWithSessions, /Piano delle sessioni/u)
  // abba è recorded, quindi la sessione inizia da binu
  assert.match(mdWithSessions, /binu-7c880f/u)
  assert.match(mdWithSessions, /di-ciao-0c3dc6/u)

  const mdWithoutSessions = toMarkdown(reportWithSessions, false)
  assert.doesNotMatch(mdWithoutSessions, /Piano delle sessioni/u)
})
