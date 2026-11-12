// Adattamento a regole tra LSC, campidanese e logudorese.
//
// Questo modulo non sostituisce un parlante: applica solo corrispondenze
// documentate e reversibili, dichiarando ogni modifica. La LSC è una norma
// scritta di mediazione, quindi il campidanese scritto ha scelte grafiche
// proprie (is al plurale, -u/-i finali, infiniti in -ai/-iri); il logudorese è
// la base da cui la LSC attinge e resta quasi identico, salvo lessico locale.
//
// Le forme dubbie non vengono toccate: meglio una parola LSC riconoscibile che
// una conversione inventata.

import { CAMPIDANESE_LEXICON, VARIANT_STOP_WORDS } from './lexicon.js'
import { normalizeVariant } from './phonology.js'

/**
 * @typedef {object} VarietyChange
 * @property {string} from
 * @property {string} to
 * @property {string} rule
 */

/**
 * @typedef {object} VarietyInfo
 * @property {string} id
 * @property {string} label
 * @property {string} short
 * @property {string} area
 * @property {string} note
 */

/** @type {VarietyInfo[]} */
export const VARIETY_INFO = [
  {
    id: 'lsc',
    label: 'Limba Sarda Comuna',
    short: 'Sardu comune',
    area: 'Norma scritta · riferimento regionale',
    note: 'Grafia di mediazione adottata nel 2006 per la lingua scritta. Non impone una pronuncia unica: la si legge con la fonetica della propria varietà.',
  },
  {
    id: 'campidanese',
    label: 'Campidanesu',
    short: 'Campidanese',
    area: 'Sardegna meridionale · Campidano, Sulcis, Sarrabus',
    note: 'Plurale is, vocali finali -u/-i, infiniti in -ai/-iri, x = [ʒ], dd retroflessa e lenizione delle occlusive.',
  },
  {
    id: 'logudorese',
    label: 'Logudoresu',
    short: 'Logudorese',
    area: 'Sardegna centro-settentrionale',
    note: 'Conserva -o/-e finali e gli articoli sos/sas; è la base lessicale e morfologica più vicina alla LSC. Il nuorese conserva meglio le occlusive intervocaliche.',
  },
]

/**
 * Applica la maiuscola della forma di partenza alla forma di arrivo.
 * @param {string} source
 * @param {string} target
 * @returns {string}
 */
const preserveCase = (source, target) => {
  if (!source || !target) return target
  if (source === source.toUpperCase() && source.length > 1) return target.toUpperCase()
  if (source[0] === source[0].toUpperCase()) {
    return `${target[0].toUpperCase()}${target.slice(1)}`
  }
  return target
}

/**
 * Adatta una singola parola al campidanese scritto.
 * @param {string} word
 * @returns {{ word: string, rule: string } | null}
 */
const adaptCampidaneseWord = (word) => {
  const lower = word.toLowerCase().normalize('NFC')

  if (VARIANT_STOP_WORDS.has(lower)) return null
  if (lower.length < 2) return null

  const lexicon = CAMPIDANESE_LEXICON[lower]
  if (lexicon) {
    return { word: preserveCase(word, lexicon), rule: 'lessico campidanese' }
  }

  let adapted = lower

  if (/are$/.test(adapted)) {
    adapted = `${adapted.slice(0, -3)}ai`
    return { word: preserveCase(word, adapted), rule: 'infinito in -ai' }
  }

  if (/ere$/.test(adapted)) {
    adapted = `${adapted.slice(0, -3)}iri`
    return { word: preserveCase(word, adapted), rule: 'infinito in -iri' }
  }

  if (/ire$/.test(adapted)) {
    adapted = `${adapted.slice(0, -3)}iri`
    return { word: preserveCase(word, adapted), rule: 'infinito in -iri' }
  }

  if (/os$/.test(adapted) || /es$/.test(adapted)) {
    adapted = `${adapted.slice(0, -2)}${adapted.endsWith('os') ? 'us' : 'is'}`
    return { word: preserveCase(word, adapted), rule: 'vocale finale e plurale' }
  }

  if (/o$/.test(adapted)) {
    return { word: preserveCase(word, `${adapted.slice(0, -1)}u`), rule: 'vocale finale -o → -u' }
  }

  if (/e$/.test(adapted)) {
    return { word: preserveCase(word, `${adapted.slice(0, -1)}i`), rule: 'vocale finale -e → -i' }
  }

  return null
}

/**
 * Adatta un testo LSC alla varietà richiesta.
 * @param {string | undefined} text
 * @param {string | undefined} variant
 * @returns {{ text: string, changes: VarietyChange[], note: string }}
 */
export const adaptToVariant = (text, variant) => {
  if (typeof text !== 'string' || !text) return { text: '', changes: [], note: '' }
  const normalizedVariant = normalizeVariant(variant)

  if (normalizedVariant !== 'campidanese') {
    return {
      text,
      changes: [],
      note: normalizedVariant === 'logudorese'
        ? 'La LSC è vicina al logudorese: restano validi su/sa/sos/sas, -o/-e finali e gli infiniti in -are/-ere. Le differenze sono soprattutto lessicali e locali.'
        : '',
    }
  }

  /** @type {VarietyChange[]} */
  const changes = []
  const seen = new Set()

  const adapted = text.replace(/\p{L}+/gu, (word) => {
    const result = adaptCampidaneseWord(word)
    if (!result || result.word === word) return word

    const key = `${word}→${result.word}`
    if (!seen.has(key) && changes.length < 12) {
      seen.add(key)
      changes.push({ from: word, to: result.word, rule: result.rule })
    }
    return result.word
  })

  return {
    text: adapted,
    changes,
    note: 'Adattamento a regole: vocali finali, articolo plurale is, infiniti e lessico documentato. Non copre lessico locale, verbi irregolari e toponimi; verifica con un parlante.',
  }
}

/**
 * Confronta la stessa frase nelle tre varietà.
 * @param {string | undefined} text
 * @returns {Array<{ id: string, label: string, text: string, note: string }>}
 */
export const compareVarieties = (text) => {
  if (typeof text !== 'string' || !text.trim()) return []
  return VARIETY_INFO.map((variety) => {
    const adapted = adaptToVariant(text, variety.id)
    return {
      id: variety.id,
      label: variety.label,
      text: adapted.text,
      note: adapted.note,
    }
  })
}
