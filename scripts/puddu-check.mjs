#!/usr/bin/env node
// Verifica forme sul Ditzionàriu in Línia (Puddu).
//
//   npm run puddu:check -- manèra matessi iscriiri
//   npm run puddu:check -- --file forme.txt
//   cat forme.txt | npm run puddu:check
//   npm run puddu:check -- --update manèra matessi
//
// Per ogni forma stampa il lemma con le varianti, «assente» se il dizionario
// non la registra, o «non verificabile» se la pagina non è interpretabile.
// Con --update aggiorna data/puddu-lemmi.json dopo conferma esplicita; --yes
// salta la domanda (solo per contesti non interattivi già autorizzati).
// Va in rete: non fa parte di npm test (il test copre il parsing offline).

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { CAMPIDANESE_ENTRIES } from '../src/features/linguistics/campidaneseLexicon.js'
import {
  PUDDU_BASE,
  buildSnapshotUpdate,
  checkPudduForm,
  formatResult,
  formatUpdatePreview,
  parseForms,
} from '../src/features/linguistics/pudduCheck.js'

const CONCURRENCY = 4
const SNAPSHOT = path.resolve(
  process.env.PUDDU_SNAPSHOT || path.join(process.cwd(), 'data/puddu-lemmi.json'),
)

const printHelp = () => {
  console.log(`Uso: npm run puddu:check -- [opzioni] <forma> [forma ...]

Opzioni:
  -f, --file <percorso>  legge le forme da un file (una per riga, # commenta)
      --update           aggiorna data/puddu-lemmi.json con le forme trovate
      --yes              non chiede conferma (solo con --update)
      --strict           esce con codice 1 se una forma è assente o non verificabile
  -h, --help             mostra questo messaggio

Senza argomenti legge le forme da stdin. Per esempio:
  printf 'manèra\\nmatessi\\n' | npm run puddu:check
`)
}

const args = process.argv.slice(2)
const inputs = []
let filePath = null
let strict = false
let update = false
let assumeYes = false

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
  } else if (arg === '--update') {
    update = true
  } else if (arg === '--yes' || arg === '-y') {
    assumeYes = true
  } else if (arg === '-h' || arg === '--help') {
    printHelp()
    process.exit(0)
  } else if (arg.startsWith('--')) {
    console.error(`Opzione non riconosciuta: ${arg}`)
    process.exit(2)
  } else {
    inputs.push(arg)
  }
}

if (filePath) {
  try {
    inputs.push(readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(`Non riesco a leggere ${filePath}: ${error.message}`)
    process.exit(2)
  }
}

if (inputs.length === 0 && !process.stdin.isTTY) {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  inputs.push(Buffer.concat(chunks).toString('utf8'))
}

// parseForms legge righe e virgole e scarta i duplicati: una sola passata su
// tutto l'input, invece di deduplicare di nuovo dopo.
const forms = parseForms(inputs.join('\n'))

if (forms.length === 0) {
  printHelp()
  process.exit(2)
}

console.log(`Ditzionàriu in Línia: ${forms.length} forme da controllare`)
console.log(`Fonte: ${PUDDU_BASE}/<forma>`)
console.log('')

const results = []
for (let start = 0; start < forms.length; start += CONCURRENCY) {
  const batch = forms.slice(start, start + CONCURRENCY)
  const batchResults = await Promise.all(batch.map((form) => checkPudduForm(form)))
  for (const result of batchResults) {
    results.push(result)
    console.log(formatResult(result))
  }
}

const counts = { found: 0, absent: 0, error: 0 }
for (const result of results) counts[result.status] += 1

console.log('')
console.log(`Riepilogo: ${counts.found} con lemma, ${counts.absent} assenti, ${counts.error} non verificabili.`)

if (update) {
  const current = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
  const built = buildSnapshotUpdate(current, results, { entries: CAMPIDANESE_ENTRIES })

  if (built.changes.length === 0) {
    console.log('')
    console.log('Nessuna forma da aggiornare nello snapshot.')
  } else {
    console.log('')
    console.log('Modifiche allo snapshot:')
    console.log(formatUpdatePreview(built))

    if (built.warnings.length > 0) {
      console.log('')
      console.log('Avvisi (npm run lexicon:verify potrebbe fallire):')
      for (const warning of built.warnings) console.log(`! ${warning}`)
    }
    console.log('')

    let confirmed = assumeYes
    if (!confirmed) {
      if (!process.stdin.isTTY) {
        console.error('Serve --yes per aggiornare lo snapshot in un contesto non interattivo.')
        process.exit(2)
      }
      const readline = createInterface({ input: process.stdin, output: process.stdout })
      const answer = await readline.question(`Scrivere ${path.relative(process.cwd(), SNAPSHOT)}? [s/N] `)
      readline.close()
      confirmed = /^(s|si|sì|y|yes)$/iu.test(answer.trim())
    }

    if (!confirmed) {
      console.log('Nessun file modificato.')
    } else {
      writeFileSync(SNAPSHOT, `${JSON.stringify(built.snapshot, null, 2)}\n`, 'utf8')
      console.log(`Aggiornato ${path.relative(process.cwd(), SNAPSHOT)}: ${built.changes.length} voci.`)
      console.log('Ricorda: npm run lexicon:verify')
    }
  }
}

if (!update && strict && (counts.absent > 0 || counts.error > 0)) {
  process.exitCode = 1
}
