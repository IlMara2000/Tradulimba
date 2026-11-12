// Controllo e normalizzazione dell'ortografia sarda.
//
// Le regole vengono dalle «Norme linguistiche di riferimento a carattere
// sperimentale per la lingua scritta dell'Amministrazione regionale» (LSC,
// 2006), in particolare §4.2.4–§4.2.16 e §5.3 per l'adattamento dei prestiti.
// Il controllo non riscrive il testo: segnala, propone e cita la regola. La
// normalizzazione automatica applica solo le sostituzioni non ambigue, perché
// una parola sarda può contenere un prestito o un nome proprio da rispettare.

import { ITALIANISMS, PRONUNCIATION_LEXICON } from './lexicon.js'
import { analyzeWord, baseVowel, graveVowel } from './syllables.js'
import { normalizeVariant } from './phonology.js'

/**
 * @typedef {object} OrthographyIssue
 * @property {string} code
 * @property {'error' | 'warning' | 'info'} severity
 * @property {string} message
 * @property {string} [suggestion]
 * @property {number} start
 * @property {number} end
 * @property {string} reference
 */

/**
 * @typedef {object} NormalizationFix
 * @property {string} rule
 * @property {string} reference
 * @property {string} before
 * @property {string} after
 */

const ACCENTED = 'àèéìíòóùú'

// Forme note che vogliono l'accento: la chiave senza accento permette di
// riconoscere «figiu», «mallia», «provintzia» anche quando chi scrive ha
// omesso il segno. Solo per parole presenti nel lessico di pronuncia.
/** @type {Map<string, string>} */
const ACCENTED_FORMS = new Map()
for (const form of Object.keys(PRONUNCIATION_LEXICON)) {
  const plain = [...form]
    .map((character) => (ACCENTED.includes(character) ? baseVowel(character) : character))
    .join('')
  if (plain !== form) ACCENTED_FORMS.set(plain, form)
}

const isVowelCharacter = (character) => 'aeiouàèéìíòóùú'.includes(character)

/**
 * Aggiunge l'accento grave alla vocale tonica della parola.
 * @param {string} word
 * @returns {string}
 */
export const addStressAccent = (word) => {
  const analysis = analyzeWord(word)
  const syllable = analysis.syllables[analysis.stressedIndex]
  if (!syllable) return word

  for (let index = syllable.start; index < syllable.end; index += 1) {
    const base = baseVowel(word[index].toLowerCase())
    if ('aeiou'.includes(base) && !ACCENTED.includes(word[index])) {
      return `${word.slice(0, index)}${graveVowel(base)}${word.slice(index + 1)}`
    }
  }
  return word
}

/**
 * Toglie l'accento grafico dalla parola.
 * @param {string} word
 * @returns {string}
 */
export const removeStressAccent = (word) => (
  [...word].map((character) => (ACCENTED.includes(character) ? baseVowel(character) : character)).join('')
)

/**
 * Normalizza le forme non ambigue secondo la LSC.
 * @param {string | undefined} text
 * @param {{ variant?: string }} [options]
 * @returns {{ text: string, fixes: NormalizationFix[] }}
 */
export const normalizeSardinian = (text, { variant } = {}) => {
  if (typeof text !== 'string' || !text) return { text: '', fixes: [] }
  const normalizedVariant = normalizeVariant(variant)

  /** @type {NormalizationFix[]} */
  const fixes = []
  let result = text

  const record = (before, after, rule, reference) => {
    if (before === after) return
    fixes.push({ rule, reference, before, after })
  }

  const withQ = result
  // Solo il nesso qu + vocale: i nomi propri stranieri (Qatar) restano intatti.
  result = result.replace(/q(?=u[aeiouàèéìíòóùú])/giu, (letter) => (letter === 'Q' ? 'C' : 'c'))
  record(withQ, result, 'La q non si usa: qu diventa cu.', 'LSC §4.2.15')

  const withGli = result
  result = result.replace(/gli(?=[aeiouàèéìíòóùú])/giu, (chunk) => {
    if (chunk === 'GLI') return 'LLI'
    return chunk[0] === 'G' ? 'LLi' : 'lli'
  })
  record(withGli, result, 'gli + vocale diventa lli + vocale.', 'LSC §5.3.3')

  if (normalizedVariant !== 'campidanese') {
    const withTs = result
    result = result.replace(/(?<=\p{L})ts/gu, 'tz')
    record(withTs, result, 'Il suono [ts] sordo si scrive tz.', 'LSC §4.2.5')
  }

  const withSce = result
  result = result.replace(/\bsc(e|i)/giu, (match, vowel) => (
    match[0] === 'S' ? `Isc${vowel}` : `isc${vowel}`
  ))
  record(withSce, result, 'sce/sci iniziali diventano isce/isci.', 'LSC §5.3.5')

  return { text: result, fixes }
}

/**
 * Cerca i problemi ortografici e propone correzioni, senza applicarle.
 * @param {string | undefined} text
 * @param {{ variant?: string, limit?: number }} [options]
 * @returns {OrthographyIssue[]}
 */
export const analyzeOrthography = (text, { variant, limit = 8 } = {}) => {
  if (typeof text !== 'string' || !text) return []
  const normalizedVariant = normalizeVariant(variant)
  /** @type {OrthographyIssue[]} */
  const issues = []

  const push = (issue) => {
    if (issues.length >= limit) return
    issues.push(issue)
  }

  for (const match of text.matchAll(/\p{L}+/gu)) {
    const word = match[0]
    const start = match.index ?? 0
    if (word.length === 0) continue

    const lower = word.toLowerCase()
    // Le sigle e i nomi tutti in maiuscolo non si valutano come parole comuni.
    const isAcronym = word.length > 1 && word === word.toUpperCase()

    if (!isAcronym) {
      const analysis = analyzeWord(word)
      if (!analysis.accentCorrect) {
        if (analysis.accentExpected && !analysis.accentPresent) {
          const suggestion = addStressAccent(word)
          push({
            code: 'ACCENTO_MANCANTE',
            severity: 'error',
            message: `«${word}» è ${analysis.stressType === 'tronca' ? 'tronca' : 'sdrucciola'}: l'accento grafico è obbligatorio.`,
            suggestion,
            start,
            end: start + word.length,
            reference: 'LSC §4.2.6',
          })
        } else if (!analysis.accentExpected && analysis.accentPresent) {
          push({
            code: 'ACCENTO_INUTILE',
            severity: 'error',
            message: `«${word}» è piana: la norma non segna l'accento grafico.`,
            suggestion: removeStressAccent(word),
            start,
            end: start + word.length,
            reference: 'LSC §4.2.6',
          })
        }
      } else if (!analysis.accentPresent) {
        const expected = ACCENTED_FORMS.get(lower)
        if (expected && expected !== word) {
          push({
            code: 'ACCENTO_MANCANTE',
            severity: 'error',
            message: `«${word}» è una forma sdrucciola nota: si scrive «${expected}».`,
            suggestion: expected,
            start,
            end: start + word.length,
            reference: 'LSC §4.2.6',
          })
        }
      }
    }

    if (/q/i.test(word)) {
      push({
        code: 'GRAFEMA_Q',
        severity: 'warning',
        message: `«${word}» usa q, che la LSC non prevede.`,
        suggestion: word.replace(/q/giu, (letter) => (letter === 'Q' ? 'C' : 'c')),
        start,
        end: start + word.length,
        reference: 'LSC §4.2.15',
      })
    }

    const gli = word.match(/gli(?=[aeiouàèéìíòóùú])/iu)
    if (gli) {
      push({
        code: 'GRAFEMA_GLI',
        severity: 'warning',
        message: `«${word}»: il nesso italiano gli si adatta con lli.`,
        suggestion: word.replace(/gli/giu, (chunk) => (chunk[0] === 'G' ? 'LLi' : 'lli')),
        start,
        end: start + word.length,
        reference: 'LSC §5.3.3',
      })
    }

    if (/(?<=\p{L})ts/u.test(word)) {
      push({
        code: 'GRAFEMA_TS',
        severity: 'warning',
        message: `«${word}»: [ts] sordo si scrive tz, non ts.`,
        suggestion: word.replace(/(?<=\p{L})ts/gu, 'tz'),
        start,
        end: start + word.length,
        reference: 'LSC §4.2.5',
      })
    }

    if (/^(sce|sci)/iu.test(word)) {
      push({
        code: 'GRAFEMA_SCE',
        severity: 'warning',
        message: `«${word}»: sce/sci iniziali prendono la i prostetica (isce/isci).`,
        suggestion: word.replace(/^(sce|sci)/iu, (chunk) => `is${chunk}`),
        start,
        end: start + word.length,
        reference: 'LSC §5.3.5',
      })
    }

    if (normalizedVariant === 'lsc' && /([cfgpqtvz])\1/iu.test(word)) {
      push({
        code: 'GRAFEMA_DOPPIA',
        severity: 'warning',
        message: `«${word}» raddoppia una consonante che la LSC scrive semplice: si raddoppiano solo b, d, l, m, n, r, s.`,
        start,
        end: start + word.length,
        reference: 'LSC §4.2.4',
      })
    }

    if (/[kw]/i.test(word)) {
      push({
        code: 'GRAFEMA_ESTERNO',
        severity: 'info',
        message: `«${word}» contiene k o w, fuori dall'alfabeto LSC: verifica se è un nome proprio o un prestito da adattare.`,
        start,
        end: start + word.length,
        reference: 'LSC §4.3',
      })
    }

    if (/y/i.test(word)) {
      push({
        code: 'GRAFEMA_Y',
        severity: 'info',
        message: `«${word}» contiene y: nella scrittura LSC la i semivocale si scrive j o i, secondo il contesto.`,
        start,
        end: start + word.length,
        reference: 'LSC §4.2.13',
      })
    }

    if (normalizedVariant !== 'campidanese' && /x/i.test(word)) {
      push({
        code: 'GRAFEMA_X',
        severity: 'info',
        message: `«${word}» contiene x: è la grafia campidanese di [ʒ]. In LSC il prestito si adatta (spesso con ss).`,
        start,
        end: start + word.length,
        reference: 'LSC §5.3',
      })
    }

    const italianism = ITALIANISMS[lower]
    if (italianism) {
      push({
        code: 'ITALIANISMO',
        severity: 'info',
        message: italianism.note
          ? `«${word}»: possibile italianismo. In sardo si può dire «${italianism.suggestion}». ${italianism.note}`
          : `«${word}»: possibile italianismo. In sardo si può dire «${italianism.suggestion}».`,
        suggestion: italianism.suggestion,
        start,
        end: start + word.length,
        reference: 'LSC §23.1 · lessico',
      })
    }
  }

  // Elisione della preposizione de: la norma la vieta sempre.
  for (const match of text.matchAll(/(?:d['’]|(?<!\p{L})['’]e)(?=\p{L})/gu)) {
    push({
      code: 'ELISIONE_DE',
      severity: 'error',
      message: 'La preposizione de si scrive sempre intera: non d’ né ’e.',
      suggestion: match[0][0] === 'D' || match[0][1] === 'E' ? 'De ' : 'de ',
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      reference: 'LSC §4.2.3',
    })
  }

  for (const match of text.matchAll(/\s{2,}/gu)) {
    push({
      code: 'SPAZI_MULTIPLI',
      severity: 'info',
      message: 'Ci sono più spazi consecutivi.',
      suggestion: ' ',
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      reference: 'Pulizia tipografica',
    })
  }

  for (const match of text.matchAll(/\s+([,.;:!?])/gu)) {
    push({
      code: 'SPAZIO_PUNTEGGIATURA',
      severity: 'info',
      message: 'Prima della punteggiatura non va uno spazio.',
      suggestion: match[1],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      reference: 'Pulizia tipografica',
    })
  }

  return issues.sort((left, right) => left.start - right.start).slice(0, limit)
}

/**
 * Conteggio rapido delle segnalazioni per la sintesi dell'interfaccia.
 * @param {OrthographyIssue[]} issues
 * @returns {{ errors: number, warnings: number, infos: number }}
 */
export const countIssues = (issues) => {
  let errors = 0
  let warnings = 0
  let infos = 0
  for (const issue of issues) {
    if (issue.severity === 'error') errors += 1
    else if (issue.severity === 'warning') warnings += 1
    else infos += 1
  }
  return { errors, warnings, infos }
}

/**
 * Controlla che una parola isolata sia sillababile e leggibile.
 * Esportata per i test e per l'analizzatore dell'interfaccia.
 * @param {string} word
 * @returns {boolean}
 */
export const isAnalyzableWord = (word) => (
  typeof word === 'string' && word.length > 0 && [...word].some(isVowelCharacter)
)
