// Trascrizione fonologica larga del sardo e riscrittura per la lettura italiana.
//
// La LSC è una norma scritta: non impone una pronuncia unica. Questa trascrizione
// segue la lettura comune delle varietà e segnala i punti in cui la grafia non
// basta (apertura vocalica, lenizione, vocali finali). I simboli sono quelli
// dell'IPA; l'etichetta «larga» è deliberata: non è una trascrizione stretta di
// un singolo paese.
//
// Regole principali:
// - tz = [ts] sorda, z = [dz] sonora (§4.2.5 LSC);
// - gi/ge = [dʒ], ci/ce = [tʃ], ch/gh = [k]/[g], gn = [ɲ], lli = [ʎʎ], nni = [ɲɲ];
// - ll resta laterale lunga [ll], non diventa [ʎ] come in italiano;
// - dd = [ɖɖ] retroflessa (sedda, cuddu);
// - j = [j] semivocale; in campidanese x = [ʒ];
// - in campidanese -o/-e finali passano a [u]/[i] e b/d/g intervocaliche
//   possono lenirsi in [β]/[ð]/[ɣ].

import { PRONUNCIATION_LEXICON } from './lexicon.js'
import { analyzeWord, baseVowel, splitWordSyllables } from './syllables.js'

/** @typedef {'lsc' | 'campidanese' | 'logudorese'} SardinianVariant */

const VOWELS = 'aeiouàèéìíòóùú'
const isVowel = (character) => Boolean(character) && VOWELS.includes(character)

/** @type {ReadonlySet<string>} */
const VARIANTS = new Set(['lsc', 'campidanese', 'logudorese'])

/**
 * @param {string | undefined} variant
 * @returns {SardinianVariant}
 */
export const normalizeVariant = (variant) => (
  VARIANTS.has(variant ?? '') ? /** @type {SardinianVariant} */ (variant) : 'lsc'
)

/**
 * Trasforma una trascrizione IPA LSC nella resa della varietà richiesta.
 * @param {string} ipa
 * @param {SardinianVariant} variant
 * @returns {string}
 */
const applyVariantToIpa = (ipa, variant) => {
  if (variant !== 'campidanese') return ipa

  let result = ipa
    .replace(/([oɔ])s$/, 'us')
    .replace(/([eɛ])s$/, 'is')
    .replace(/([oɔ])$/, 'u')
    .replace(/([eɛ])$/, 'i')

  // Lenizione delle occlusive sonore intervocaliche. Le geminate restano
  // intatte perché la regex non trova una vocale subito dopo la prima.
  result = result
    .replace(/(?<=[aeiouɛɔ])b(?=[aeiouɛɔ])/g, 'β')
    .replace(/(?<=[aeiouɛɔ])d(?=[aeiouɛɔ])/g, 'ð')
    .replace(/(?<=[aeiouɛɔ])g(?=[aeiouɛɔ])/g, 'ɣ')

  return result
}

/**
 * Adegua la grafia di lettura alle finali campidanesi.
 * @param {string} respelling
 * @param {SardinianVariant} variant
 * @returns {string}
 */
const applyVariantToRespelling = (respelling, variant) => {
  if (variant !== 'campidanese') return respelling
  return respelling
    .replace(/os$/, 'us')
    .replace(/es$/, 'is')
    .replace(/o$/, 'u')
    .replace(/e$/, 'i')
}

/**
 * @typedef {object} ParsedWord
 * @property {string} ipa
 * @property {string} respelling
 * @property {number[]} ipaPositions
 * @property {number[]} respellPositions
 */

/**
 * Converte la grafia in IPA e in una grafia italiana di lettura.
 * @param {string} word
 * @param {SardinianVariant} variant
 * @returns {ParsedWord}
 */
const parseWord = (word, variant) => {
  const lower = word.toLowerCase().normalize('NFC')
  let ipa = ''
  let respelling = ''
  /** @type {number[]} */
  const ipaPositions = new Array(lower.length + 1).fill(0)
  /** @type {number[]} */
  const respellPositions = new Array(lower.length + 1).fill(0)

  let index = 0
  while (index < lower.length) {
    const character = lower[index]
    const next = lower[index + 1] || ''
    const nextNext = lower[index + 2] || ''
    const afterNext = lower[index + 3] || ''
    const previous = lower[index - 1] || ''

    /** @type {string} */
    let ipaOut = ''
    /** @type {string} */
    let respellOut = ''
    let consumed = 1

    if (character === 't' && next === 'z') {
      ipaOut = 'ts'
      respellOut = 'zz'
      consumed = 2
    } else if ((character === 'c' || character === 'g') && next === 'h') {
      ipaOut = character === 'c' ? 'k' : 'g'
      respellOut = character === 'c' ? 'ch' : 'gh'
      consumed = 2
    } else if (character === 'g' && next === 'n' && nextNext === 'i' && isVowel(afterNext)) {
      ipaOut = 'ɲɲ'
      respellOut = 'gn'
      consumed = 3
    } else if (character === 'g' && next === 'n') {
      ipaOut = 'ɲ'
      respellOut = 'gn'
      consumed = 2
    } else if (character === 'g' && next === 'l' && nextNext === 'i' && isVowel(afterNext)) {
      ipaOut = 'ʎʎ'
      respellOut = 'gli'
      consumed = 3
    } else if (character === 'l' && next === 'l' && nextNext === 'i' && isVowel(afterNext)) {
      ipaOut = 'ʎʎ'
      respellOut = 'gli'
      consumed = 3
    } else if (character === 'n' && next === 'n' && nextNext === 'i' && isVowel(afterNext)) {
      ipaOut = 'ɲɲ'
      respellOut = 'gni'
      consumed = 3
    } else if (character === 's' && next === 'c' && nextNext === 'i' && isVowel(afterNext)) {
      ipaOut = 'ʃ'
      respellOut = 'sci'
      consumed = 3
    } else if (character === 's' && next === 'c' && 'ei'.includes(nextNext)) {
      ipaOut = 'ʃ'
      respellOut = 'sc'
      consumed = 2
    } else if (character === 'c' && next === 'i' && isVowel(nextNext)) {
      ipaOut = 'tʃ'
      respellOut = 'ci'
      consumed = 2
    } else if (character === 'g' && next === 'i' && isVowel(nextNext)) {
      ipaOut = 'dʒ'
      respellOut = 'gi'
      consumed = 2
    } else if ((character === 'c' || character === 'q') && next === 'u' && isVowel(nextNext)) {
      ipaOut = 'kw'
      respellOut = 'cu'
      consumed = 2
    } else if (character === 'g' && next === 'u' && isVowel(nextNext)) {
      ipaOut = 'gw'
      respellOut = 'gu'
      consumed = 2
    } else if (character === next && 'bdfgklmnprstvz'.includes(character)) {
      if (character === 'd') ipaOut = 'ɖɖ'
      else if (character === 'c') ipaOut = 'kk'
      else if (character === 'g') ipaOut = 'gg'
      else if (character === 'z') ipaOut = 'ddz'
      else ipaOut = character + character
      respellOut = character + character
      consumed = 2
    } else if (isVowel(character)) {
      ipaOut = baseVowel(character)
      respellOut = character
    } else {
      switch (character) {
        case 'c':
          ipaOut = 'ei'.includes(next) ? 'tʃ' : 'k'
          respellOut = 'c'
          break
        case 'g':
          ipaOut = 'ei'.includes(next) ? 'dʒ' : 'g'
          respellOut = 'g'
          break
        case 'j':
          ipaOut = 'j'
          respellOut = 'i'
          break
        case 'x':
          if (variant === 'campidanese') {
            ipaOut = 'ʒ'
            respellOut = 'ei'.includes(next) ? 'g' : 'gi'
          } else {
            ipaOut = 'ss'
            respellOut = 'ss'
          }
          break
        case 'z':
          ipaOut = 'dz'
          respellOut = 'z'
          break
        case 'h':
          ipaOut = ''
          respellOut = ''
          break
        case 'q':
          ipaOut = 'k'
          respellOut = 'c'
          break
        case 'k':
          ipaOut = 'k'
          respellOut = 'c'
          break
        case 'w':
          ipaOut = 'w'
          respellOut = 'u'
          break
        case 'y':
          ipaOut = 'j'
          respellOut = 'i'
          break
        case 's':
          ipaOut = 's'
          respellOut = isVowel(previous) && isVowel(next) ? 'ss' : 's'
          break
        case 'v':
          ipaOut = 'v'
          respellOut = 'v'
          break
        default:
          ipaOut = character
          respellOut = character
      }
    }

    for (let offset = 0; offset < consumed && index + offset < lower.length; offset += 1) {
      // Per le geminate la seconda lettera appartiene alla sillaba successiva:
      // la mappa deve cadere a metà dell'uscita, non all'inizio.
      ipaPositions[index + offset] = ipa.length + Math.min(offset, ipaOut.length)
      respellPositions[index + offset] = respelling.length + Math.min(offset, respellOut.length)
    }

    ipa += ipaOut
    respelling += respellOut
    index += consumed
  }

  ipaPositions[lower.length] = ipa.length
  respellPositions[lower.length] = respelling.length

  return { ipa, respelling, ipaPositions, respellPositions }
}

/**
 * @typedef {object} WordTranscription
 * @property {string} word
 * @property {string} ipa
 * @property {string} reading Grafia italiana con la sillaba tonica in maiuscolo.
 * @property {string} respelling Grafia italiana sillabata.
 * @property {string[]} syllables
 * @property {number} stressedIndex
 */

/**
 * Trascrive una parola e restituisce anche la guida di lettura.
 * @param {string} word
 * @param {string | undefined} variant
 * @returns {WordTranscription}
 */
export const transcribeWord = (word, variant) => {
  const normalizedVariant = normalizeVariant(variant)
  const analysis = analyzeWord(word)
  const parsed = parseWord(word, normalizedVariant)

  const lexiconEntry = PRONUNCIATION_LEXICON[word.toLowerCase().normalize('NFC')]
  let ipa = lexiconEntry
    ? applyVariantToIpa(lexiconEntry.ipa, normalizedVariant)
    : parsed.ipa

  const syllable = analysis.syllables[analysis.stressedIndex]
  if (!lexiconEntry && syllable && analysis.syllables.length > 1) {
    const position = parsed.ipaPositions[syllable.start] ?? 0
    ipa = `${ipa.slice(0, position)}ˈ${ipa.slice(position)}`
  }

  const reading = applyVariantToRespelling(parsed.respelling, normalizedVariant)

  return {
    word,
    ipa,
    reading,
    respelling: reading,
    syllables: analysis.syllables.map((item) => item.text),
    stressedIndex: analysis.stressedIndex,
  }
}

/**
 * Trascrive un testo in IPA, mantenendo punteggiatura e spazi.
 * @param {string} text
 * @param {string | undefined} variant
 * @returns {string}
 */
export const transcribeText = (text, variant) => {
  if (typeof text !== 'string' || !text) return ''
  return text.replace(/\p{L}+/gu, (word) => transcribeWord(word, variant).ipa)
}

/**
 * Riscrive un testo in grafia italiana sillabata, senza maiuscole di accento.
 * @param {string} text
 * @param {string | undefined} variant
 * @returns {string}
 */
export const respellText = (text, variant) => {
  if (typeof text !== 'string' || !text) return ''
  return text.replace(/\p{L}+/gu, (word) => transcribeWord(word, variant).respelling)
}

/**
 * Riscrive una parola in grafia italiana con la tonica in maiuscolo.
 * @param {string} word
 * @param {string | undefined} variant
 * @returns {string}
 */
export const respellWord = (word, variant) => transcribeWord(word, variant).reading

/**
 * Nota utile per una parola: qualità vocalica o fenomeno segnalato nel lessico.
 * @param {string} word
 * @returns {string}
 */
export const pronunciationNote = (word) => {
  const entry = PRONUNCIATION_LEXICON[word.toLowerCase().normalize('NFC')]
  return entry?.note || ''
}

/**
 * Sillabe di una parola con indice della tonica, per l'interfaccia.
 * @param {string} word
 * @returns {{ syllables: string[], stressedIndex: number }}
 */
export const syllableOutline = (word) => {
  const syllables = splitWordSyllables(word)
  const analysis = analyzeWord(word)
  return { syllables: syllables.map((item) => item.text), stressedIndex: analysis.stressedIndex }
}
