#!/usr/bin/env node
// Riepilogo esportabile delle righe ancora senza voce umana.
//
//   npm run voice:report
//   npm run voice:report -- --out /tmp --json
//
// Scrive un CSV per riga (apribile con un foglio di calcolo) e un Markdown
// riassuntivo diviso per gruppi. La stima è volutamente semplice e dichiarata:
// non è un cronometro, serve a pianificare le sessioni con chi registra.

import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { flattenCopione } from '../src/features/voice/copione.js'
import { voiceEntryId } from '../src/features/voice/corpus.js'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.opus'])
const DEFAULT_OVERHEAD_SECONDS = 4.5
const SESSION_MINUTES = 25
const USAGE = `Uso: node scripts/voice-report.mjs [--out cartella] [--json] [--sessions|--no-sessions] [--help]

  --out cartella    dove scrivere i file (default: voice)
  --json            scrive anche riepilogo-registrazioni.json
  --sessions        include il piano delle sessioni nel Markdown (default)
  --no-sessions     esclude il piano delle sessioni dal Markdown
  --help            mostra questo aiuto`

/**
 * Stima il parlato di una riga: 0,45 s per parola + 0,035 s per carattere,
 * con un minimo di 1,2 s. È una stima per pianificare, non una misura.
 * @param {string} text
 * @returns {number}
 */
export const estimateSpeechSeconds = (text) => {
  const clean = typeof text === 'string' ? text.trim() : ''
  if (!clean) return 0
  const words = clean.split(/\s+/u).filter(Boolean).length
  return Math.max(1.2, words * 0.45 + clean.length * 0.035)
}

/**
 * Include il tempo di ascolto della clip, registrazione, controllo e salvataggio.
 * @param {string} text
 * @param {number} [overheadSeconds]
 * @returns {number}
 */
export const estimateTakeSeconds = (text, overheadSeconds = DEFAULT_OVERHEAD_SECONDS) => (
  Number((estimateSpeechSeconds(text) + overheadSeconds).toFixed(1))
)

/**
 * @param {number} seconds
 * @returns {string} minuti con una cifra decimale e virgola italiana
 */
export const formatMinutes = (seconds) => (seconds / 60).toFixed(1).replace('.', ',')

const formatReportDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'data sconosciuta'
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Divide le righe mancanti in sessioni da SESSION_MINUTES minuti.
 * Ogni sessione indica l'id della prima e dell'ultima riga.
 * @param {Array<{ id: string; takeSeconds: number }>} missing
 * @returns {Array<{ index: number; startId: string; endId: string; takeSeconds: number; rows: number }>}
 */
export const buildSessions = (missing) => {
  const sessions = []
  const sessionSeconds = SESSION_MINUTES * 60
  let sessionStart = 0
  let sessionAccumulator = 0

  for (let index = 0; index < missing.length; index += 1) {
    const row = missing[index]
    sessionAccumulator += row.takeSeconds

    const isLast = index === missing.length - 1
    const wouldOverflow = sessionAccumulator > sessionSeconds && index !== sessionStart

    if (wouldOverflow) {
      // Chiudi la sessione prima di questa riga
      const endIndex = index - 1
      const endId = missing[endIndex].id
      const take = Number(missing.slice(sessionStart, endIndex + 1).reduce((sum, r) => sum + r.takeSeconds, 0).toFixed(1))
      sessions.push({
        index: sessions.length + 1,
        startId: missing[sessionStart].id,
        endId,
        takeSeconds: take,
        rows: endIndex - sessionStart + 1,
      })
      // Inizia una nuova sessione con la riga corrente
      sessionStart = index
      sessionAccumulator = row.takeSeconds
      // Se era l'ultima riga, chiudi anche questa nuova sessione
      if (isLast) {
        sessions.push({
          index: sessions.length + 1,
          startId: missing[index].id,
          endId: missing[index].id,
          takeSeconds: row.takeSeconds,
          rows: 1,
        })
      }
    } else if (isLast) {
      // Chiudi l'ultima sessione
      const endId = missing[index].id
      const take = Number(missing.slice(sessionStart, index + 1).reduce((sum, r) => sum + r.takeSeconds, 0).toFixed(1))
      sessions.push({
        index: sessions.length + 1,
        startId: missing[sessionStart].id,
        endId,
        takeSeconds: take,
        rows: index - sessionStart + 1,
      })
    }
  }

  return sessions
}

/**
 * @param {Array<Record<string, any>>} rows
 * @param {{ generatedAt?: string | number | Date }} [options]
 */
export const buildReport = (rows, options = {}) => {
  const generatedAtDate = options.generatedAt ? new Date(options.generatedAt) : new Date()
  const generatedAt = Number.isNaN(generatedAtDate.getTime())
    ? new Date().toISOString()
    : generatedAtDate.toISOString()

  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const text = typeof row?.text === 'string' ? row.text : ''
    const variant = typeof row?.variant === 'string' ? row.variant : 'lsc'
    const speechSeconds = Number(estimateSpeechSeconds(text).toFixed(1))
    const takeSeconds = Number((speechSeconds + DEFAULT_OVERHEAD_SECONDS).toFixed(1))
    return {
      id: typeof row?.id === 'string' && row.id ? row.id : voiceEntryId(text, variant),
      text,
      variant,
      kind: row?.kind === 'word' ? 'word' : 'phrase',
      group: typeof row?.group === 'string' ? row.group : null,
      groupLabel: typeof row?.groupLabel === 'string' && row.groupLabel
        ? row.groupLabel
        : typeof row?.group === 'string' && row.group
          ? row.group
          : 'Altro',
      recorded: Boolean(row?.recorded),
      synthetic: Boolean(row?.synthetic),
      speechSeconds,
      takeSeconds,
    }
  })

  const missing = normalized.filter((row) => !row.recorded)
  const groupsMap = new Map()

  for (const row of normalized) {
    const key = row.group ?? 'altro'
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        id: key,
        label: row.groupLabel,
        total: 0,
        recorded: 0,
        missing: 0,
        syntheticOnly: 0,
        noAudio: 0,
        speechSeconds: 0,
        takeSeconds: 0,
      })
    }
    const group = groupsMap.get(key)
    group.total += 1
    if (row.recorded) {
      group.recorded += 1
    } else {
      group.missing += 1
      if (row.synthetic) group.syntheticOnly += 1
      else group.noAudio += 1
      group.speechSeconds = Number((group.speechSeconds + row.speechSeconds).toFixed(1))
      group.takeSeconds = Number((group.takeSeconds + row.takeSeconds).toFixed(1))
    }
  }

  const speechSeconds = Number(missing.reduce((sum, row) => sum + row.speechSeconds, 0).toFixed(1))
  const takeSeconds = Number(missing.reduce((sum, row) => sum + row.takeSeconds, 0).toFixed(1))

  const sessions = buildSessions(missing)

  return {
    generatedAt,
    sessionMinutes: SESSION_MINUTES,
    overheadSeconds: DEFAULT_OVERHEAD_SECONDS,
    totals: {
      total: normalized.length,
      recorded: normalized.length - missing.length,
      missing: missing.length,
      syntheticOnly: missing.filter((row) => row.synthetic).length,
      noAudio: missing.filter((row) => !row.synthetic).length,
      speechSeconds,
      takeSeconds,
      sessions25: Math.ceil(takeSeconds / (SESSION_MINUTES * 60)),
    },
    groups: [...groupsMap.values()],
    rows: missing,
    sessions,
  }
}

const csvCell = (value) => {
  const text = value == null ? '' : String(value)
  return /[";\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text
}

const formatSeconds = (seconds) => seconds.toFixed(1).replace('.', ',')

/**
 * CSV semicolon-separated, con BOM UTF-8 per Excel. Contiene una riga per ogni
 * riga ancora senza voce umana.
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
export const toCsv = (report) => {
  const header = [
    'gruppo',
    'id',
    'varieta',
    'tipo',
    'testo',
    'audio_sintetico',
    'secondi_voce',
    'secondi_take',
    'minuti_take',
  ]
  const lines = [header.join(';')]

  for (const row of report.rows) {
    lines.push([
      row.groupLabel,
      row.id,
      row.variant,
      row.kind === 'word' ? 'parola' : 'frase',
      row.text,
      row.synthetic ? 'sì' : 'no',
      formatSeconds(row.speechSeconds),
      formatSeconds(row.takeSeconds),
      formatMinutes(row.takeSeconds),
    ].map(csvCell).join(';'))
  }

  return `\uFEFF${lines.join('\n')}\n`
}

const markdownCell = (value) => String(value ?? '')
  .replace(/\|/gu, '\\|')
  .replace(/\n/gu, ' ')

/**
 * Riepilogo leggibile, diviso per gruppi.
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
export const toMarkdown = (report, includeSessions = true) => {
  const sessionLabel = report.totals.sessions25 === 1 ? 'sessione' : 'sessioni'
  const lines = [
    '# Riepilogo registrazioni TraduLimba',
    '',
    `Generato il ${formatReportDate(report.generatedAt)}.`,
    '',
    `Righe totali: ${report.totals.total} · con voce umana: ${report.totals.recorded} · **senza voce umana: ${report.totals.missing}** (${report.totals.syntheticOnly} solo sintetiche, ${report.totals.noAudio} senza audio).`,
    '',
    `Tempo stimato: **${formatMinutes(report.totals.takeSeconds)} min** in almeno ${report.totals.sessions25} ${sessionLabel} da ${report.sessionMinutes} min; di cui ${formatMinutes(report.totals.speechSeconds)} min di voce effettiva.`,
    '',
    '| Gruppo | Da registrare | Solo sintetica | Senza audio | Voce (min) | Take (min) |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ]

  for (const group of report.groups) {
    lines.push(`| ${markdownCell(group.label)} | ${group.missing} | ${group.syntheticOnly} | ${group.noAudio} | ${formatMinutes(group.speechSeconds)} | ${formatMinutes(group.takeSeconds)} |`)
  }

  lines.push(`| **Totale** | **${report.totals.missing}** | **${report.totals.syntheticOnly}** | **${report.totals.noAudio}** | **${formatMinutes(report.totals.speechSeconds)}** | **${formatMinutes(report.totals.takeSeconds)}** |`)
  lines.push('')

  if (includeSessions && report.sessions && report.sessions.length > 0) {
    lines.push('## Piano delle sessioni')
    lines.push('')
    lines.push('| Sessione | Da | A | Righe | Take (min) |')
    lines.push('| ---: | --- | --- | ---: | ---: |')
    for (const session of report.sessions) {
      lines.push(`| ${session.index} | ${markdownCell(session.startId)} | ${markdownCell(session.endId)} | ${session.rows} | ${formatMinutes(session.takeSeconds)} |`)
    }
    lines.push('')
    lines.push(`*Sessioni da ${report.sessionMinutes} min; il tempo per sessione può variare perché le righe non si dividono perfettamente. L'ordine segue il copione.*`)  
    lines.push('')
  }

  lines.push('Stima: 0,45 s per parola + 0,035 s per carattere, minimo 1,2 s di voce, più 4,5 s per take (ascolto della clip sintetica, registrazione, controllo qualità e salvataggio). Non include pause, ripetizioni o errori.')
  lines.push('')
  lines.push('Il dettaglio riga per riga è nel CSV; le righe con voce umana sono escluse.')
  if (report.totals.missing === 0) {
    lines.push('')
    lines.push('Nessuna riga da registrare: il copione ha una voce umana per tutte le righe.')
  }

  return `${lines.join('\n')}\n`
}

/**
 * @param {ReturnType<typeof buildReport>} report
 * @returns {string}
 */
export const toJson = (report) => `${JSON.stringify(report, null, 2)}\n`

const scanIds = async (directory) => {
  const ids = new Set()
  if (!existsSync(directory)) return ids
  for (const name of await readdir(directory)) {
    const extension = path.extname(name).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(extension)) continue
    ids.add(path.basename(name, extension))
  }
  return ids
}

const parseArgs = (argv) => {
  const options = { out: 'voice', json: false, help: false, sessions: true }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--json') {
      options.json = true
    } else if (argument === '--out') {
      const value = argv[index + 1]
      if (!value) throw new Error('--out richiede una cartella.')
      options.out = value
      index += 1
    } else if (argument === '--help' || argument === '-h') {
      options.help = true
    } else if (argument === '--sessions') {
      options.sessions = true
    } else if (argument === '--no-sessions') {
      options.sessions = false
    } else {
      throw new Error(`Opzione sconosciuta: ${argument}`)
    }
  }
  return options
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    return
  }

  const root = process.cwd()
  const data = JSON.parse(await readFile(path.join(root, 'voice/copione.json'), 'utf8'))
  const recorded = await scanIds(path.join(root, 'public/voce/registrata'))
  const synthetic = await scanIds(path.join(root, 'public/voce/sintetica'))

  const rows = flattenCopione(data).map((row) => {
    const id = voiceEntryId(row.text, row.variant)
    return {
      ...row,
      id,
      recorded: recorded.has(id),
      synthetic: synthetic.has(id),
    }
  })

  const report = buildReport(rows)
  const outputDirectory = path.resolve(root, options.out)
  await mkdir(outputDirectory, { recursive: true })

  const csvPath = path.join(outputDirectory, 'riepilogo-registrazioni.csv')
  const markdownPath = path.join(outputDirectory, 'riepilogo-registrazioni.md')
  await writeFile(csvPath, toCsv(report), 'utf8')
  await writeFile(markdownPath, toMarkdown(report, options.sessions), 'utf8')

  const jsonPath = options.json ? path.join(outputDirectory, 'riepilogo-registrazioni.json') : null
  if (jsonPath) await writeFile(jsonPath, toJson(report), 'utf8')

  const sessionLabel = report.totals.sessions25 === 1 ? 'sessione' : 'sessioni'
  console.log(`Righe senza voce umana: ${report.totals.missing} (${report.totals.syntheticOnly} solo sintetiche, ${report.totals.noAudio} senza audio)`)
  console.log(`Tempo stimato: ${formatMinutes(report.totals.takeSeconds)} min in almeno ${report.totals.sessions25} ${sessionLabel} da ${report.sessionMinutes} min`)
  console.log(`- ${path.relative(root, csvPath)}`)
  console.log(`- ${path.relative(root, markdownPath)}`)
  if (jsonPath) console.log(`- ${path.relative(root, jsonPath)}`)
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  main().catch((error) => {
    console.error(error.message || error)
    process.exitCode = 1
  })
}
