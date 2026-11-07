// Trascrizione fonetica per la voce. La LSC è una norma scritta e lascia la
// pronuncia alle varietà: un motore vocale che legge i grafemi sardi con le
// regole dell'italiano sbaglia [ts], la s intervocalica, la j, i nessi lli/nni e,
// in campidanese, la d intervocalica. Qui il testo viene riscritto in grafia
// italiana solo per la sintesi vocale; quello mostrato all'utente resta intatto.
//
// Limiti dichiarati: una voce italiana non rende le retroflesse [ɖɖ] e [ɳɖ], le
// leni [β]/[ð], l'apertura vocalica che la LSC non segna, né le assimilazioni di
// frase (sas domos → sar domos, su bentu → su entu). La trascrizione avvicina i
// suoni, non li riproduce: resta un riferimento d'ascolto.

/** @typedef {'lsc' | 'campidanese' | 'logudorese'} SpeechVariant */

/** @type {ReadonlySet<string>} */
const VARIANTS = new Set(['lsc', 'campidanese', 'logudorese'])

/**
 * Riporta una varietà sconosciuta o assente alla LSC, come fa il resto dell'app.
 * @param {string | undefined} variant
 * @returns {SpeechVariant}
 */
export const normalizeSpeechVariant = (variant) => (
  VARIANTS.has(variant ?? '') ? /** @type {SpeechVariant} */ (variant) : 'lsc'
)

const VOWEL = 'aeiouàèéìíòóùú'

/**
 * Regole di riscrittura in ordine di applicazione. Il gruppo `variants` limita la
 * regola alle varietà in cui il fenomeno è documentato.
 * @type {Array<{ pattern: RegExp, replacement: string, variants?: SpeechVariant[] }>}
 */
const RULES = [
  // In campidanese la x della scrittura locale vale [ʒ]. Davanti a e/i basta g
  // (bogi), altrove serve gi per non finire sul suono velare. Altrove la norma
  // rende la x con -ss- (mataxa → madassa).
  { pattern: /x(?=[ei])/gu, replacement: 'g', variants: ['campidanese'] },
  { pattern: /x/gu, replacement: 'gi', variants: ['campidanese'] },
  { pattern: /x/gu, replacement: 'ss', variants: ['lsc', 'logudorese'] },
  // [ts] si scrive tz in LSC; in italiano il digramma utile è zz (pezza).
  { pattern: /tz/gu, replacement: 'zz' },
  // gn dell'italiano adattato si può scrivere gn o nni: per la voce serve gn.
  { pattern: /nni(?=[aeiou])/gu, replacement: 'gni' },
  { pattern: /lli(?=[aeiou])/gu, replacement: 'gli' },
  { pattern: /j/gu, replacement: 'i' },
  // In sardo la s intervocalica resta sorda, mentre l'italiano tende a sonorizzarla.
  { pattern: new RegExp(`(?<=[${VOWEL}])s(?=[${VOWEL}])`, 'gu'), replacement: 'ss' },
  // A Cagliari la d intervocalica è [ɾ]: meda [ˈmɛða] ~ [ˈmɛɾa].
  {
    pattern: new RegExp(`(?<=[${VOWEL}])d(?=[${VOWEL}])`, 'gu'),
    replacement: 'r',
    variants: ['campidanese'],
  },
]

/**
 * Riscrive il testo sardo in grafia italiana per la sintesi vocale.
 * @param {string | undefined} text
 * @param {string | undefined} variant
 * @returns {string}
 */
export const buildSpeechScript = (text, variant) => {
  if (typeof text !== 'string' || !text) return ''
  const normalizedVariant = normalizeSpeechVariant(variant)

  return RULES.reduce((script, rule) => {
    if (rule.variants && !rule.variants.includes(normalizedVariant)) return script
    return script.replace(rule.pattern, rule.replacement)
  }, text)
}
