#!/usr/bin/env node
// Verifica la base sarda contro lo snapshot del dizionario.
//
//   npm run lexicon:verify
//
// Esce con codice 1 se una voce del lessico non ha attestazione, se il lemma
// salvato non corrisponde più a quello del lessico, o se una riga campidanese
// del copione usa una parola che lo snapshot non contiene. Non va in rete: la
// prova è data/puddu-lemmi.json, aggiornata solo a mano dopo una consultazione.

import { readFileSync } from 'node:fs'
import { CAMPIDANESE_ENTRIES } from '../src/features/linguistics/campidaneseLexicon.js'
import {
  auditCorpus,
  auditLexicon,
  auditSnapshot,
  attestedForms,
  tokensOf,
} from '../src/features/linguistics/lexiconAudit.js'
import { flattenCopione } from '../src/features/voice/copione.js'

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'))

const main = () => {
  const snapshot = readJson('../data/puddu-lemmi.json')
  const copione = readJson('../voice/copione.json')

  const snapshotProblems = auditSnapshot(snapshot)
  const lexiconProblems = auditLexicon(CAMPIDANESE_ENTRIES, snapshot)

  const rows = flattenCopione(copione).filter((row) => row.variant === 'campidanese')
  const unknown = auditCorpus(rows, snapshot)

  const allowed = attestedForms(snapshot)
  const tokens = new Set(rows.flatMap((row) => tokensOf(row.text)).map((token) => token.toLocaleLowerCase('it')))

  console.log(`snapshot: ${Object.keys(snapshot.lemmi || {}).length} lemmi, consultato ${snapshot.consultato}`)
  console.log(`lessico campidanese: ${CAMPIDANESE_ENTRIES.length} voci`)
  console.log(`copione campidanese: ${rows.length} righe, ${tokens.size} parole distinte, ${allowed.size} forme ammesse`)

  const failures = [...snapshotProblems, ...lexiconProblems]

  if (unknown.length > 0) {
    const grouped = new Map()
    for (const { token, text } of unknown) {
      if (!grouped.has(token)) grouped.set(token, text)
    }
    for (const [token, text] of grouped) {
      failures.push(`copione: "${token}" non è attestata — «${text}»`)
    }
  }

  if (failures.length === 0) {
    console.log('OK: ogni forma del lessico e del copione ha un\'attestazione nello snapshot.')
    return 0
  }

  console.error(`\n${failures.length} problemi:`)
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('\nAggiungi la forma solo dopo averla trovata sul dizionario (data/puddu-lemmi.json).')
  return 1
}

process.exitCode = main()
