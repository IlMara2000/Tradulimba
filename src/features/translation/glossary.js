// Glossario di termini verificati, condiviso tra client e API: le voci vengono
// dal percorso NARA (forme LSC con la loro provenienza) e servono a due scopi —
// fissare le forme preferite nel post-editor AI e mostrare all'utente quali
// termini noti compaiono nella traduzione. Nessuna riscrittura automatica:
// cambiare una parola senza vedere la frase produrrebbe errori di accordo.
// I dati stanno in glossaryData.js, con la lezione e la domanda NARA che
// attestano ogni forma; qui resta solo la ricerca nel testo.

import { GLOSSARY_ENTRIES } from './glossaryData.js'

export { GLOSSARY_ENTRIES, GLOSSARY_REFERENCE } from './glossaryData.js'

export const MAX_GLOSSARY_HITS = 4

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Confini di parola espliciti: \b non regge le lettere accentate del sardo.
const termPattern = (term) => new RegExp(
  `(^|[^\\p{L}])${escapeRegExp(term).replace(/\s+/g, '\\s+')}([^\\p{L}]|$)`,
  'iu',
)

const SOURCE_KEYS = { it: 'it', srd: 'srd' }

export const findGlossaryMatches = (text, { from = 'it', limit = MAX_GLOSSARY_HITS } = {}) => {
  if (typeof text !== 'string' || !text.trim()) return []

  const key = SOURCE_KEYS[from] || 'it'
  const other = key === 'it' ? 'srd' : 'it'
  const haystack = text.toLocaleLowerCase('it')

  const found = GLOSSARY_ENTRIES
    .map((entry) => {
      const match = haystack.match(termPattern(entry[key]))
      if (!match) return null
      // I gruppi di cattura delimitano il termine: senza sottrarli resterebbe
      // attaccata la punteggiatura che fa da confine ("vino.").
      const start = match.index + match[1].length
      const end = match.index + match[0].length - match[2].length
      return {
        term: text.slice(start, end),
        translation: entry[other],
        note: entry.note || '',
        start,
        end,
      }
    })
    .filter(Boolean)
    // A parità di inizio vince il termine più lungo: "grazie mille" non deve
    // produrre anche una pastiglia "grazie" sullo stesso pezzo di testo.
    .sort((left, right) => left.start - right.start || right.end - left.end)

  const kept = []
  let covered = 0
  for (const match of found) {
    if (match.start < covered) continue
    kept.push(match)
    covered = match.end
  }

  return kept
    .slice(0, limit)
    .map(({ term, translation, note }) => ({ term, translation, note }))
}

// Istruzione per il post-editor: vincola le forme senza riscrivere la frase.
export const buildGlossaryPrompt = (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) return ''

  const lines = matches.map((match) => `- ${match.term} → ${match.translation}`)
  return [
    'Se nel testo compare uno di questi termini, usa la forma indicata del glossario',
    'e adatta gli articoli e gli accordi alla frase; non introdurre un termine se non c’è:',
    ...lines,
  ].join('\n')
}
