// Divisione in sillabe e accento tonico per la grafia sarda.
//
// La norma LSC (§4.2.6) segna l'accento grafico solo sulle parole tronche
// (ossitone) e sdrucciole (proparossitone); le piane restano senza accento.
// Questo modulo ricava la sillaba tonica dalla grafia: se c'è un accento
// grafico vince quello, altrimenti vale la penultima sillaba, che è il caso
// statisticamente dominante e l'unico compatibile con la norma.
//
// La scansione è ortografica, non fonetica: in LSC ogni vocale scritta conta
// come nucleo, tranne la u di cu/gu davanti a vocale (cuadru = cua-dru). È la
// stessa lettura che rende coerenti gli esempi della norma: fì-gi-u,
// pro-vìn-tzi-a, is-tù-di-u, màl-li-a, cam-pàn-ni-a.

/** @typedef {'lsc' | 'campidanese' | 'logudorese'} SardinianVariant */

const VOWELS = 'aeiouàèéìíòóùú'
const ACCENTED_VOWELS = 'àèéìíòóùúÀÈÉÌÍÒÓÙÚ'

/** @type {Record<string, string>} */
const BASE_VOWEL = {
  à: 'a', á: 'a', è: 'e', é: 'e', ì: 'i', í: 'i', ò: 'o', ó: 'o', ù: 'u', ú: 'u',
  À: 'a', Á: 'a', È: 'e', É: 'e', Ì: 'i', Í: 'i', Ò: 'o', Ó: 'o', Ù: 'u', Ú: 'u',
}

/** @type {Record<string, string>} */
const GRAVE_VOWEL = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' }

const isVowel = (character) => Boolean(character) && VOWELS.includes(character)

/**
 * Riduce una lettera accentata alla vocale di base.
 * @param {string} character
 * @returns {string}
 */
export const baseVowel = (character) => BASE_VOWEL[character] || character

/**
 * Aggiunge l'accento grave alla vocale di base.
 * @param {string} character
 * @returns {string}
 */
export const graveVowel = (character) => GRAVE_VOWEL[character] || character

/**
 * Indice del carattere che porta l'accento grafico, oppure -1.
 * @param {string} word
 * @returns {number}
 */
export const findWrittenAccent = (word) => {
  for (let index = 0; index < word.length; index += 1) {
    if (ACCENTED_VOWELS.includes(word[index])) return index
  }
  return -1
}

/**
 * @typedef {object} Syllable
 * @property {string} text
 * @property {number} start Indice del primo carattere nella parola.
 * @property {number} end Indice successivo all'ultimo carattere.
 */

/**
 * @typedef {object} Unit
 * @property {'V' | 'C'} type
 * @property {string} text
 * @property {number} start
 * @property {number} end
 */

const DOUBLE_CONSONANTS = new Set([
  'bb', 'cc', 'dd', 'ff', 'gg', 'll', 'mm', 'nn', 'pp', 'rr', 'ss', 'tt', 'vv', 'zz',
])

// Nessi che possono aprire sillaba in sardo. Servono per non spezzare
// is-tra-da, pra-tza, cam-pàn-nia.
const VALID_ONSETS = new Set([
  'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'vr', 'pl', 'bl', 'cl', 'gl', 'fl',
  'sp', 'st', 'sc', 'str', 'spr', 'scr',
])

/**
 * Divide la parola in unità grafemiche: digrammi e trigrammi contano come una
 * sola consonante, le vocali restano nuclei separati (iato).
 * @param {string} word
 * @returns {Unit[]}
 */
const tokenizeUnits = (word) => {
  const lower = word.toLowerCase()
  /** @type {Unit[]} */
  const units = []
  let index = 0

  while (index < lower.length) {
    const character = lower[index]
    const next = lower[index + 1] || ''
    const nextNext = lower[index + 2] || ''
    const afterNext = lower[index + 3] || ''

    if (isVowel(character)) {
      units.push({ type: 'V', text: word.slice(index, index + 1), start: index, end: index + 1 })
      index += 1
      continue
    }

    // La u di cu/gu davanti a vocale è una semivocale, non un nucleo.
    if ((character === 'c' || character === 'g') && next === 'u' && isVowel(nextNext)) {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if (character === 'q' && next === 'u' && isVowel(nextNext)) {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if (character === 't' && next === 'z') {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if ((character === 'c' || character === 'g') && next === 'h') {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if (character === 'g' && next === 'n') {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if (character === 'g' && next === 'l' && nextNext === 'i' && isVowel(afterNext)) {
      units.push({ type: 'C', text: word.slice(index, index + 3), start: index, end: index + 3 })
      index += 3
      continue
    }

    if (character === 's' && next === 'c' && 'ei'.includes(nextNext)) {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    if (DOUBLE_CONSONANTS.has(character + next)) {
      units.push({ type: 'C', text: word.slice(index, index + 2), start: index, end: index + 2 })
      index += 2
      continue
    }

    units.push({ type: 'C', text: word.slice(index, index + 1), start: index, end: index + 1 })
    index += 1
  }

  return units
}

/**
 * Sceglie quanti consonanti del nesso vanno in coda alla sillaba precedente.
 * @param {Unit[]} cluster
 * @returns {number} Indice del primo elemento dell'onset.
 */
const onsetStart = (cluster) => {
  if (cluster.length <= 1) return 0

  for (let size = Math.min(3, cluster.length); size >= 2; size -= 1) {
    const candidate = cluster
      .slice(cluster.length - size)
      .map((unit) => unit.text.toLowerCase())
      .join('')
    if (VALID_ONSETS.has(candidate)) return cluster.length - size
  }

  return cluster.length - 1
}

/**
 * Divide una parola in sillabe ortografiche.
 * @param {string} word
 * @returns {Syllable[]}
 */
export const splitWordSyllables = (word) => {
  if (typeof word !== 'string' || !word) return []

  const units = tokenizeUnits(word)
  const nuclei = units
    .map((unit, index) => (unit.type === 'V' ? index : -1))
    .filter((index) => index >= 0)

  if (nuclei.length === 0) {
    return [{ text: word, start: 0, end: word.length }]
  }

  /** @type {number[]} */
  const boundaries = [0]

  for (let position = 0; position < nuclei.length - 1; position += 1) {
    const cluster = units.slice(nuclei[position] + 1, nuclei[position + 1])
    if (cluster.length === 0) {
      boundaries.push(units[nuclei[position + 1]].start)
      continue
    }
    if (cluster.length === 1 && cluster[0].text.length === 2 && cluster[0].text[0] === cluster[0].text[1]) {
      // Le geminate si dividono tra le due sillabe: ab-ba, sed-da, ma-tes-si.
      boundaries.push(cluster[0].start + 1)
      continue
    }
    const start = onsetStart(cluster)
    const boundaryUnit = cluster[start]
    boundaries.push(
      start === cluster.length - 1 && boundaryUnit.text.length === 2 && boundaryUnit.text[0] === boundaryUnit.text[1]
        ? boundaryUnit.start + 1
        : boundaryUnit.start,
    )
  }

  boundaries.push(word.length)

  const syllables = []
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]
    const end = boundaries[index + 1]
    if (end <= start) continue
    syllables.push({ text: word.slice(start, end), start, end })
  }

  return syllables.length > 0 ? syllables : [{ text: word, start: 0, end: word.length }]
}

/**
 * @typedef {'monosillabo' | 'piana' | 'tronca' | 'sdrucciola' | 'bisdrucciola'} StressType
 */

/**
 * @typedef {object} WordAnalysis
 * @property {string} word
 * @property {Syllable[]} syllables
 * @property {number} stressedIndex
 * @property {StressType} stressType
 * @property {boolean} accentPresent
 * @property {boolean} accentExpected
 * @property {boolean} accentCorrect
 */

/**
 * Analizza accento e sillabe di una parola.
 * @param {string} word
 * @returns {WordAnalysis}
 */
export const analyzeWord = (word) => {
  const syllables = splitWordSyllables(word)
  const count = syllables.length
  const accentIndex = findWrittenAccent(word)
  const accentPresent = accentIndex >= 0

  let stressedIndex = 0
  if (accentPresent) {
    const found = syllables.findIndex((syllable) => (
      accentIndex >= syllable.start && accentIndex < syllable.end
    ))
    stressedIndex = found >= 0 ? found : 0
  } else if (count > 1) {
    stressedIndex = count - 2
  }

  /** @type {StressType} */
  let stressType = 'monosillabo'
  if (count > 1) {
    if (stressedIndex === count - 1) stressType = 'tronca'
    else if (stressedIndex === count - 2) stressType = 'piana'
    else if (stressedIndex === count - 3) stressType = 'sdrucciola'
    else stressType = 'bisdrucciola'
  }

  const accentExpected = stressType === 'tronca'
    || stressType === 'sdrucciola'
    || stressType === 'bisdrucciola'

  return {
    word,
    syllables,
    stressedIndex,
    stressType,
    accentPresent,
    accentExpected,
    accentCorrect: accentExpected === accentPresent,
  }
}

/**
 * Etichetta italiana dello tipo di accento.
 * @param {StressType} stressType
 * @returns {string}
 */
export const stressTypeLabel = (stressType) => ({
  monosillabo: 'monosillabo',
  piana: 'piana (parossitona)',
  tronca: 'tronca (ossitona)',
  sdrucciola: 'sdrucciola (proparossitona)',
  bisdrucciola: 'bisdrucciola',
}[stressType] || stressType)
