#!/usr/bin/env node
// Verifica forme sul Ditzionàriu in Línia (Puddu).
//
//   npm run puddu:check -- manèra matessi iscriiri
//   npm run puddu:check -- --file forme.txt
//   cat forme.txt | npm run puddu:check
//
// Per ogni forma stampa il lemma con le varianti, «assente» se il dizionario
// non la registra, o «non verificabile» se la pagina non è interpretabile.
// Va in rete: non fa parte di npm test (il test copre il parsing offline).

import { readFileSync } from 'node:fs'
import { checkPudduForm, formatResult, parseForms } from '../src/features/linguistics/pudduCheck.js'

const CONCURRENCY = 4
const BASE = 'https://ditzionariu.nor-web.eu/it/faeddu'

const printHelp = () => {
  console.log(`Uso: npm run puddu:check -- [opzioni] <forma> [forma ...]

Opzioni:
  -f, --file <percorso>  legge le forme da un file (una per riga, # commenta)
      --strict           esce con codice 1 se una forma è assente o non verificabile
  -h, --help             mostra questo messaggio

Senza argomenti legge le forme da stdin. Per esempio:
  printf 'manèra\\nmatessi\\n' | npm run puddu:check
`)
}

const args = process.argv.slice(2)
const forms = []
let filePath = null
let strict = false

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]

  if (arg === '-f' || arg === '--file') {
    filePath = args[index + 1]
    if (!filePath) {
      console.error('Manca il percorso dopo --file')
      process.exit(2)
    }
    index += 1
  } else if (arg === '--strict') {
    strict = true
  } else if (arg === '-h' || arg === '--help') {
    printHelp()
    process.exit(0)
  } else if (arg.startsWith('--')) {
    console.error(`Opzione non riconosciuta: ${arg}`)
    process.exit(2)
  } else {
    forms.push(...parseForms(arg))
  }
}

if (filePath) {
  try {
    forms.push(...parseForms(readFileSync(filePath, 'utf8')))
  } catch (error) {
    console.error(`Non riesco a leggere ${filePath}: ${error.message}`)
    process.exit(2)
  }
}

if (forms.length === 0 && !process.stdin.isTTY) {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  forms.push(...parseForms(Buffer.concat(chunks).toString('utf8')))
}

const unique = []
const seen = new Set()
for (const form of forms) {
  const key = form.normalize('NFC').toLocaleLowerCase('it')
  if (seen.has(key)) continue
  seen.add(key)
  unique.push(form)
}

if (unique.length === 0) {
  printHelp()
  process.exit(2)
}

console.log(`Ditzionàriu in Línia: ${unique.length} forme da controllare`)
console.log(`Fonte: ${BASE}/<forma>`)
console.log('')

const results = []
for (let start = 0; start < unique.length; start += CONCURRENCY) {
  const batch = unique.slice(start, start + CONCURRENCY)
  const batchResults = await Promise.all(batch.map((form) => checkPudduForm(form)))
  for (const result of batchResults) {
    results.push(result)
    console.log(formatResult(result))
  }
}

const counts = results.reduce((totals, result) => {
  totals[result.status] += 1
  return totals
}, { found: 0, absent: 0, error: 0 })

console.log('')
console.log(`Riepilogo: ${counts.found} con lemma, ${counts.absent} assenti, ${counts.error} non verificabili.`)

if (strict && (counts.absent > 0 || counts.error > 0)) {
  process.exitCode = 1
}
