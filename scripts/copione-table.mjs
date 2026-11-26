#!/usr/bin/env node
// Rigenera la tabella del copione di registrazione da voice/copione.json.
//
//   npm run voice:doc                 # aggiorna docs/copione-registrazione-voce.md
//   npm run voice:doc -- --check      # esce 1 se il documento è disallineato
//   npm run voice:doc -- --stdout     # stampa la tabella (per l'artefatto)
//   npm run voice:doc -- --group campidanese-frasi
//
// Il blocco nel documento è delimitato da
// <!-- copione-table:<gruppo>:start --> e <!-- copione-table:<gruppo>:end -->.
// Il test tests/copioneTable.node.test.js usa la stessa logica per impedire che
// il documento torni a divergere dal copione.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  DEFAULT_TABLE_GROUP,
  extractBlock,
  groupById,
  replaceBlock,
  renderMarkdownTable,
  rowsOf,
} from '../src/features/voice/copioneTable.js'

const ROOT = process.cwd()
const COPIONE = path.join(ROOT, 'voice/copione.json')
const DEFAULT_DOC = path.join(ROOT, 'docs/copione-registrazione-voce.md')

const USAGE = `Uso: node scripts/copione-table.mjs [opzioni]

  --group <id>   gruppo del copione (default: ${DEFAULT_TABLE_GROUP})
  --doc <file>   documento da aggiornare (default: docs/copione-registrazione-voce.md)
  --check        non scrive: esce 1 se il documento non è allineato
  --stdout       stampa la tabella invece di modificare il documento
  --help         mostra questo aiuto`

const parseArgs = (argv) => {
  const options = {
    group: DEFAULT_TABLE_GROUP,
    doc: DEFAULT_DOC,
    check: false,
    stdout: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--group' || arg === '--doc') {
      const value = argv[index + 1]
      if (!value) throw new Error(`${arg} richiede un valore.`)
      if (arg === '--group') options.group = value
      else options.doc = path.resolve(value)
      index += 1
    } else if (arg === '--check') {
      options.check = true
    } else if (arg === '--stdout') {
      options.stdout = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`Opzione sconosciuta: ${arg}`)
    }
  }

  return options
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    return 0
  }

  const copione = JSON.parse(readFileSync(COPIONE, 'utf8'))
  const group = groupById(copione, options.group)
  if (!group) throw new Error(`Gruppo non trovato in voice/copione.json: ${options.group}`)
  const table = renderMarkdownTable(rowsOf(group))

  if (options.stdout) {
    process.stdout.write(table)
    return 0
  }

  const markdown = readFileSync(options.doc, 'utf8')

  if (options.check) {
    if (extractBlock(markdown, options.group) === table.trim()) {
      console.log(`OK: ${path.relative(ROOT, options.doc)} è allineato al gruppo ${options.group}.`)
      return 0
    }
    console.error(`Disallineato: ${path.relative(ROOT, options.doc)} non corrisponde a voice/copione.json (${options.group}).`)
    console.error('Rigenera con: npm run voice:doc')
    return 1
  }

  if (extractBlock(markdown, options.group) === null) {
    throw new Error(`Il documento non contiene i marcatori per ${options.group}.`)
  }

  const next = replaceBlock(markdown, options.group, table)
  if (next === markdown) {
    console.log(`Nessuna modifica: ${path.relative(ROOT, options.doc)} era già allineato.`)
    return 0
  }

  writeFileSync(options.doc, next, 'utf8')
  console.log(`Aggiornato ${path.relative(ROOT, options.doc)}: ${rowsOf(group).length} righe dal gruppo ${options.group}.`)
  return 0
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  try {
    process.exitCode = main()
  } catch (error) {
    console.error(error.message || error)
    process.exitCode = 1
  }
}
