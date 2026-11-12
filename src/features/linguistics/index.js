// Analisi linguistica del sardo: sillabe, accento, IPA, guida di lettura,
// ortografia LSC e note di pronuncia. È un modulo puro, usato sia dal client
// sia dalle funzioni serverless, così la stessa parola viene letta allo stesso
// modo nell'interfaccia e nelle risposte dell'API.

import { analyzeWord, stressTypeLabel } from './syllables.js'
import {
  normalizeVariant,
  pronunciationNote,
  respellText,
  transcribeText,
  transcribeWord,
} from './phonology.js'
import { analyzeOrthography, countIssues } from './orthography.js'
import { VARIETY_INFO } from './varieties.js'

/**
 * @typedef {object} AnalyzedWord
 * @property {string} word
 * @property {string[]} syllables
 * @property {number} stressedIndex
 * @property {string} stressType
 * @property {string} ipa
 * @property {string} reading
 * @property {string} note
 */

/**
 * @typedef {object} SardinianAnalysis
 * @property {string} variant
 * @property {string} variantLabel
 * @property {string} ipa
 * @property {string} respelling
 * @property {AnalyzedWord[]} words
 * @property {boolean} truncated
 * @property {Array<{ code: string, severity: string, message: string, suggestion?: string, start: number, end: number, reference: string }>} issues
 * @property {{ errors: number, warnings: number, infos: number }} issueCounts
 * @property {{ words: number, tronca: number, piana: number, sdrucciola: number, altre: number }} stats
 * @property {string[]} notes
 */

const MAX_WORDS = 60

/**
 * @param {string} text
 * @param {string} variant
 * @returns {string[]}
 */
const buildNotes = (text, variant) => {
  const notes = []
  const seen = new Set()
  const add = (note) => {
    if (!note || seen.has(note)) return
    seen.add(note)
    notes.push(note)
  }

  if (variant === 'campidanese') {
    add('Campidanese: -o/-e finali suonano [u]/[i]; b, d, g intervocaliche possono diventare [β], [ð], [ɣ].')
  }

  if (/\b[dt]d\p{L}*/iu.test(text)) {
    add('dd è una retroflessa lunga [ɖɖ]: la lingua si piega all’indietro, come in sedda e cuddu.')
  }

  if (/tz/iu.test(text)) {
    add('tz vale [ts] sorda, come la z di pezza; z da sola vale [dz] sonora.')
  }

  if (variant === 'campidanese' && /x/iu.test(text)) {
    add('In campidanese x vale [ʒ], la j francese di jour; non si legge [ks].')
  }

  if (/\bj\p{L}*/iu.test(text)) {
    add('j è la semivocale [j] di ieri: maju si legge come “maiu”, non come la j francese.')
  }

  if (/\bsas?\s+[bdfg]\p{L}+/iu.test(text)) {
    add('La consonante iniziale mobile può cadere dopo l’articolo: su bentu → [su ˈentu], sa domo → [sa ˈðɔmo].')
  }

  if (/\bsas?\s+[bcdfglmnpqrstvz]\p{L}+/iu.test(text)) {
    add('La -s finale si assimila spesso alla consonante seguente: sas domos → [sar ˈdɔmos].')
  }

  const lexiconNotes = []
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const note = pronunciationNote(match[0])
    if (note && !lexiconNotes.includes(note)) lexiconNotes.push(note)
    if (lexiconNotes.length >= 2) break
  }
  lexiconNotes.forEach(add)

  const info = VARIETY_INFO.find((variety) => variety.id === variant)
  if (info) add(info.note)

  return notes.slice(0, 5)
}

/**
 * Analizza un testo sardo.
 * @param {string | undefined} text
 * @param {{ variant?: string, wordLimit?: number, issueLimit?: number }} [options]
 * @returns {SardinianAnalysis}
 */
export const analyzeSardinian = (text, { variant, wordLimit = MAX_WORDS, issueLimit = 8 } = {}) => {
  const normalizedVariant = normalizeVariant(variant)
  const clean = typeof text === 'string' ? text : ''

  /** @type {AnalyzedWord[]} */
  const words = []
  let totalWords = 0
  const stats = { words: 0, tronca: 0, piana: 0, sdrucciola: 0, altre: 0 }

  for (const match of clean.matchAll(/\p{L}+/gu)) {
    totalWords += 1
    const word = match[0]
    const analysis = analyzeWord(word)
    const transcription = transcribeWord(word, normalizedVariant)

    stats.words += 1
    if (analysis.stressType === 'tronca') stats.tronca += 1
    else if (analysis.stressType === 'piana') stats.piana += 1
    else if (analysis.stressType === 'sdrucciola') stats.sdrucciola += 1
    else stats.altre += 1

    if (words.length >= wordLimit) continue

    words.push({
      word,
      syllables: transcription.syllables,
      stressedIndex: transcription.stressedIndex,
      stressType: stressTypeLabel(analysis.stressType),
      ipa: transcription.ipa,
      reading: transcription.reading,
      note: pronunciationNote(word),
    })
  }

  const issues = analyzeOrthography(clean, { variant: normalizedVariant, limit: issueLimit })
  const info = VARIETY_INFO.find((variety) => variety.id === normalizedVariant)

  return {
    variant: normalizedVariant,
    variantLabel: info?.label || 'Limba Sarda Comuna',
    ipa: transcribeText(clean, normalizedVariant),
    respelling: respellText(clean, normalizedVariant),
    words,
    truncated: totalWords > words.length,
    issues,
    issueCounts: countIssues(issues),
    stats,
    notes: buildNotes(clean, normalizedVariant),
  }
}

export {
  analyzeWord,
  analyzeOrthography,
  countIssues,
}
