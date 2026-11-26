#!/usr/bin/env node
// Verifica forme sul Ditzionàriu in Línia (Puddu).
//
//   npm run puddu:check -- manèra matessi iscriiri
//   npm run puddu:check -- --file forme.txt
//   cat forme.txt | npm run puddu:check
//   npm run puddu:check -- --check          # confronta lo snapshot, non scrive
//   npm run puddu:check -- --update manèra matessi
//
// Per ogni forma stampa il lemma con le varianti, «assente» se il dizionario
// non la registra, o «non verificabile» se la pagina non è interpretabile.
// Con --check confronta i lemmi dello snapshot e stampa solo le divergenze
// (esce 1 se ce ne sono): così un cambio del dizionario si vede prima di
// --update. Con --update aggiorna data/puddu-lemmi.json dopo conferma
// esplicita; --yes salta la domanda (solo per contesti non interattivi già
// autorizzati). Va in rete: non fa parte di npm test (il test copre il parsing
// offline).

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { CAMPIDANESE_ENTRIES } from '../src/features/linguistics/campidaneseLexicon.js'
import {
  PUDDU_BASE,
  buildSnapshotUpdate,
  checkPudduForm,
  compareSnapshotLemmas,
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
      --check            confronta i lemmi dello snapshot e non scrive
                         (senza forme: tutti i lemmi dello snapshot)
      --update           aggiorna data/puddu-lemmi.json con le forme trovate
      --yes              non chiede conferma (solo con --update)
      --strict           esce con codice 1 se una forma è assente o non verificabile
  -h, --help             mostra questo messaggio

Senza argomenti (e senza --check) legge le forme da stdin. Per esempio:
  printf 'manèra\\nmatessi\\n' | npm run puddu:check
`)
}

const args = process.argv.slice(2)
const inputs = []
let filePath = null
let strict = false
let update = false
let check = false
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
  } else if (arg === '--check') {
    check = true
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

if (check && update) {
  console.error('Scegli --check oppure --update, non entrambi.')
  process.exit(2)
}

if (filePath) {
  try {
    inputs.push(readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(`Non riesco a leggere ${filePath}: ${error.message}`)
    process.exit(2)
  }
}

// Con --check senza argomenti si controlla tutto lo snapshot: non si legge
// stdin, che in background/CI resterebbe aperto e bloccherebbe il comando.
if (inputs.length === 0 && !check && !process.stdin.isTTY) {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  inputs.push(Buffer.concat(chunks).toString('utf8'))
}

// parseForms legge righe e virgole e scarta i duplicati: una sola passata su
// tutto l'input, invece di deduplicare di nuovo dopo.
const forms = parseForms(inputs.join('\n'))
const snapshot = check ? JSON.parse(readFileSync(SNAPSHOT, 'utf8')) : null
const lemmi = snapshot?.lemmi || {}

if (check && forms.length > 0) {
  const unknown = forms.filter((form) => !Object.hasOwn(lemmi, form))
  if (unknown.length > 0) console.error(`Non sono nello snapshot: ${unknown.join(', ')}`)
}

let targets = forms
if (check) {
  targets = forms.length > 0
    ? forms.filter((form) => Object.hasOwn(lemmi, form))
    : Object.keys(lemmi)
}

if (targets.length === 0) {
  if (check) {
    console.error('Nessun lemma dello snapshot da controllare.')
    process.exit(2)
  }
  printHelp()
  process.exit(2)
}

if (check) {
  console.log(`Confronto di ${targets.length} lemmi dello snapshot con il Ditzionàriu in Línia`)
} else {
  console.log(`Ditzionàriu in Línia: ${targets.length} forme da controllare`)
}
console.log(`Fonte: ${PUDDU_BASE}/<forma>`)
console.log('')

const results = []
for (let start = 0; start < targets.length; start += CONCURRENCY) {
  const batch = targets.slice(start, start + CONCURRENCY)
  const batchResults = await Promise.all(batch.map((form) => checkPudduForm(form)))
  for (const result of batchResults) {
    results.push(result)
    // In --check si stampano solo le divergenze, non ogni forma.
    if (!check) console.log(formatResult(result))
  }
}

if (check) {
  const comparison = compareSnapshotLemmas(snapshot, results)
  for (const change of comparison.changed) {
    console.log(`~ ${change.form}: snapshot «${change.expected}», dizionario «${change.actual}»`)
  }
  for (const form of comparison.absent) {
    console.log(`- ${form}: assente dal dizionario`)
  }
  for (const error of comparison.errors) {
    console.log(`? ${error.form}: non verificabile (${error.reason})`)
  }

  const divergences = comparison.changed.length + comparison.absent.length + comparison.errors.length
  console.log('')
  console.log(`Riepilogo: ${comparison.matched} invariati, ${comparison.changed.length} diversi, ${comparison.absent.length} assenti, ${comparison.errors.length} non verificabili.`)
  if (divergences > 0) process.exitCode = 1
} else {
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
}
