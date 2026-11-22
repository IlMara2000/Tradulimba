// Lessico campidanese verificato.
//
// Queste voci non sono un glossario illustrativo: sono la base di forme
// attestate sul Ditzionàriu in Línia (Puddu) e usate come vincolo quando il
// post-editor AI rifinisce una bozza in campidanese. Solo forme controllate:
// quello che non è qui non entra nella traduzione per iniziativa del modello.
//
// Tre grafie convivono in ogni voce e non vanno confuse:
// - `srd` è la grafia della norma sarda (LSC) usata nel testo: bidda, fueddu;
// - `lemma` è il lemma accentato del dizionario, che segna la qualità vocalica
//   (acuto = vocale chiusa, grave = aperta) ed è notazione lessicografica, non
//   un'ortografia alternativa;
// - `variants` raccoglie le forme registrate come varianti, comprese quelle con
//   dh, che nel dizionario scrive il retroflesso campidanese (bídha per bidda).
//
// La verifica è del 22 novembre 2026. Una voce assente dal dizionario non è
// stata ammessa per analogia: se serve una parola nuova, va cercata e aggiunta
// con la sua attestazione.

export const CAMPIDANESE_LEXICON_REFERENCE = 'Ditzionàriu in Línia (Puddu) · verifica 22/11/2026'

/**
 * @typedef {object} CampidaneseEntry
 * @property {string} it Termine italiano che fa da chiave di ricerca.
 * @property {string} srd Forma campidanese nella grafia della norma sarda.
 * @property {string} lemma Lemma accentato del dizionario (notazione fonetica).
 * @property {string[]} [variants] Varianti registrate dal dizionario.
 * @property {string} [note] Avvertenza d'uso o rinvio al lemma del dizionario.
 * @property {'verb'|'noun'|'modifier'} group
 */

/** @type {CampidaneseEntry[]} */
export const CAMPIDANESE_ENTRIES = [
  // Verbi
  { it: 'bere', srd: 'bufai', lemma: 'bufài, bufàe', variants: ['bufàe'], note: 'Il dizionario registra la forma sotto il lemma bufare.', group: 'verb' },
  { it: 'andare', srd: 'andai', lemma: 'andài', variants: ['andari', 'andhare'], group: 'verb' },
  { it: 'venire', srd: 'benni', lemma: 'bènni', note: 'Il dizionario registra la forma sotto il lemma bènnere.', group: 'verb' },
  { it: 'fare', srd: 'fai', lemma: 'fài', note: 'Il dizionario registra la forma sotto il lemma fàchere.', group: 'verb' },
  { it: 'dire', srd: 'narai', lemma: 'narài', variants: ['nài'], group: 'verb' },
  { it: 'parlare', srd: 'chistionai', lemma: 'chistionài', variants: ['chiltionàre'], group: 'verb' },
  { it: 'sapere', srd: 'sciri', lemma: 'iscíri, iscíre 1', variants: ['ischíre'], group: 'verb' },
  { it: 'vedere', srd: 'biri', lemma: 'bíri', note: 'Il dizionario registra la forma sotto il lemma bídere.', group: 'verb' },
  { it: 'sentire', srd: 'intendi', lemma: 'intèndi', note: 'Il dizionario registra la forma sotto il lemma intèndhere.', group: 'verb' },
  { it: 'capire', srd: 'cumprendi', lemma: 'cumprèndi', note: 'Il dizionario registra la forma sotto il lemma cumprèndhere.', group: 'verb' },
  { it: 'lavorare', srd: 'traballai', lemma: 'traballài', group: 'verb' },
  { it: 'leggere', srd: 'ligi', lemma: 'lígi', note: 'Il dizionario registra la forma sotto il lemma lègere.', group: 'verb' },
  { it: 'cancellare', srd: 'burrai', lemma: 'burrài', note: 'Il dizionario registra la forma sotto il lemma burrare.', group: 'verb' },
  { it: 'annullare', srd: 'annullai', lemma: 'annullài, annullàre', variants: ['annudhài'], group: 'verb' },
  { it: 'provare', srd: 'proai', lemma: 'proài', group: 'verb' },
  { it: 'tornare', srd: 'torrai', lemma: 'torràe, torrài', note: 'torrai a + infinito vale “riprendere a”.', group: 'verb' },
  { it: 'trovato', srd: 'agatadu', lemma: 'agatàdu', variants: ['acatàu'], group: 'verb' },
  { it: 'mangiare', srd: 'papai', lemma: 'papàre', variants: ['papàe'], note: 'non papài, che nel dizionario vale “papavero” e “papà”.', group: 'verb' },
  { it: 'stordire', srd: 'ammachiai', lemma: 'ammachiàe, ammachiài, ammachiàre, ammachiàri', note: 'sempre con due m, come il lemma: “amachiai” non è la forma del dizionario.', group: 'verb' },
  { it: 'ragionare', srd: 'arrexonai', lemma: 'arrexonài', variants: ['arragionàre'], group: 'verb' },
  { it: 'concordare', srd: 'cuncordai', lemma: 'cuncordài, cuncordàre', variants: ['cuncodrài'], note: 'vale anche “organizzare, mettere d’accordo”.', group: 'verb' },
  { it: 'seguire', srd: 'sighiri', lemma: 'sighíre, sighíri', variants: ['sichíre'], group: 'verb' },

  // Nomi, luoghi e tempo
  { it: 'acqua', srd: 'abba', lemma: 'àbba', variants: ['àcua'], group: 'noun' },
  { it: 'pane', srd: 'pani', lemma: 'pàni', variants: ['pàne'], group: 'noun' },
  { it: 'vino', srd: 'binu', lemma: 'bínu', variants: ['vinu'], group: 'noun' },
  { it: 'casa', srd: 'domo', lemma: 'domo', group: 'noun' },
  { it: 'uomo', srd: 'òmini', lemma: 'ómini', variants: ['ómine'], group: 'noun' },
  { it: 'donna', srd: 'fèmina', lemma: 'fémina', variants: ['fémmia', 'fémmina'], group: 'noun' },
  { it: 'bambino', srd: 'pipiu', lemma: 'pipíu', variants: ['pupiu'], group: 'noun' },
  { it: 'madre', srd: 'mama', lemma: 'màma', variants: ['mamma'], group: 'noun' },
  { it: 'lingua', srd: 'limba', lemma: 'límba', variants: ['língua'], group: 'noun' },
  { it: 'parola', srd: 'fueddu', lemma: 'fuédhu', variants: ['faédhu'], note: 'dh è il retroflesso campidanese scritto dal dizionario, non un grafema della norma.', group: 'noun' },
  { it: 'dizionario', srd: 'ditzionàriu', lemma: 'ditzionàriu', variants: ['dissionàriu'], group: 'noun' },
  { it: 'scuola', srd: 'iscola', lemma: 'iscòla', variants: ['isciòla'], group: 'noun' },
  { it: 'insegnante', srd: 'maistru', lemma: 'maístru', variants: ['maistu', 'mastru'], group: 'noun' },
  { it: 'paese', srd: 'bidda', lemma: 'bídha', variants: ['vidha'], note: 'dd retroflessa; bidda è il paese, citade la città.', group: 'noun' },
  { it: 'mare', srd: 'mari', lemma: 'màri', variants: ['màre'], group: 'noun' },
  { it: 'monte', srd: 'monti', lemma: 'mònti', variants: ['mònte'], group: 'noun' },
  { it: 'cielo', srd: 'chelu', lemma: 'chélu', variants: ['célu'], group: 'noun' },
  { it: 'strada', srd: 'istràda', lemma: 'istràda', variants: ['istrata', 'strada'], note: 'sin. carrèla.', group: 'noun' },
  { it: 'partenza', srd: 'partida', lemma: 'partída', variants: ['partía'], group: 'noun' },
  { it: 'arrivo', srd: 'benida', lemma: 'benída', variants: ['benía'], group: 'noun' },
  { it: 'mercoledì', srd: 'mércuris', lemma: 'mércuris', variants: ['mélcuris'], group: 'noun' },
  { it: 'giovedì', srd: 'giòbia', lemma: 'gióbia', variants: ['gióvia', 'zóbia'], group: 'noun' },
  { it: 'venerdì', srd: 'chenàbura', lemma: 'chenàbura', variants: ['chenàbara', 'chenàbra'], group: 'noun' },
  { it: 'terra', srd: 'terra', lemma: 'tèrra', group: 'noun' },
  { it: 'giorno', srd: 'die', lemma: 'díe', variants: ['dí'], group: 'noun' },
  { it: 'notte', srd: 'note', lemma: 'nòte', variants: ['noti'], note: 'noti è la variante campidanese.', group: 'noun' },
  { it: 'mattina', srd: 'mangianu', lemma: 'mangiànu', variants: ['manzanu', 'mengianu', 'mignanu'], group: 'noun' },
  { it: 'sera', srd: 'sero', lemma: 'sèro', variants: ['sèra'], group: 'noun' },
  { it: 'settimana', srd: 'cida', lemma: 'cída', variants: ['chída'], group: 'noun' },
  { it: 'anno', srd: 'annu', lemma: 'ànnu', group: 'noun' },
  { it: 'mese', srd: 'mese', lemma: 'mèse', variants: ['mesi'], group: 'noun' },
  { it: 'città', srd: 'citade', lemma: 'citàde', variants: ['citàdi', 'tzitade'], group: 'noun' },
  { it: 'domanda', srd: 'dimanda', lemma: 'dimàndha', variants: ['domanda', 'domanna'], note: 'sin. percunta.', group: 'noun' },
  { it: 'aiuto', srd: 'agiudu', lemma: 'agiúdu', variants: ['ajudu', 'axudu', 'azudu'], group: 'noun' },
  { it: 'errore', srd: 'faddina', lemma: 'fàddina', variants: ['fadhina'], note: 'sin. ilmarru, imbàgliu.', group: 'noun' },
  { it: 'studente', srd: 'istudianti', lemma: 'istudiànte, istudiànti', group: 'noun' },
  { it: 'domenica', srd: 'domìnigu', lemma: 'domínigu', variants: ['domíga'], group: 'noun' },
  { it: 'romanzo', srd: 'romanzu', lemma: 'romànzu', group: 'noun' },
  { it: 'consiglio', srd: 'cunsillu', lemma: 'cunsíllu', variants: ['consígiu'], group: 'noun' },
  { it: 'letteratura', srd: 'literadura', lemma: 'literadúra', group: 'noun' },
  { it: 'tratto', srd: 'tretu', lemma: 'trétu', note: 'un pezzo di luogo; sin. ciassu, locu, puntu.', group: 'noun' },
  { it: 'racconto', srd: 'contu', lemma: 'cóntu', note: 'vale anche “conto, questione”; sin. contadu, contànsia, cuentu.', group: 'noun' },

  // Aggettivi, avverbi e parole di funzione
  { it: 'molto', srd: 'meda', lemma: 'mèda', group: 'modifier' },
  { it: 'poco', srd: 'pagu', lemma: 'pàgu', variants: ['pàcu'], group: 'modifier' },
  { it: 'bene', srd: 'beni', lemma: 'bèni', variants: ['bène'], group: 'modifier' },
  { it: 'male', srd: 'mali', lemma: 'màli', group: 'modifier' },
  { it: 'grande', srd: 'mannu', lemma: 'mànnu', group: 'modifier' },
  { it: 'bello', srd: 'bellu', lemma: 'béllu', group: 'modifier' },
  { it: 'piccolo', srd: 'piticu', lemma: 'pitícu', variants: ['pichícu'], group: 'modifier' },
  { it: 'dai', srd: 'ajò', lemma: 'ajó!', note: 'esclamazione di esortazione: sta fra i modificatori perché il lessico ammette solo verbo, nome e modificatore.', group: 'modifier' },
  { it: 'vecchio', srd: 'betzu', lemma: 'bétzu', variants: ['béciu'], group: 'modifier' },
  { it: 'in gamba', srd: 'togu', lemma: 'tògo, tògu', note: 'Vale sia come aggettivo sia come nome.', group: 'modifier' },
  { it: 'oggi', srd: 'oi', lemma: 'òi', variants: ['òe'], group: 'modifier' },
  { it: 'domani', srd: 'cras', lemma: 'cràs', variants: ['incràs'], group: 'modifier' },
  { it: 'adesso', srd: 'immui', lemma: 'immúi', variants: ['immòe'], group: 'modifier' },
  { it: 'sempre', srd: 'sempri', lemma: 'sèmpri', variants: ['sèmpede'], group: 'modifier' },
  { it: 'tutto', srd: 'totu', lemma: 'tótu', group: 'modifier' },
  { it: 'niente', srd: 'nudda', lemma: 'núdha', variants: ['nudha'], group: 'modifier' },
  { it: 'anche', srd: 'puru', lemma: 'púru', note: 'sin. fintzas.', group: 'modifier' },
  { it: 'fino a', srd: 'fintzas', lemma: 'fíntzas', variants: ['fínces'], group: 'modifier' },
  { it: 'senza', srd: 'chene', lemma: 'chène', variants: ['cèna 1'], group: 'modifier' },
  { it: 'con', srd: 'cun', lemma: 'cun', variants: ['chin'], note: 'chene vale “senza”: non è una variante di cun.', group: 'modifier' },
  { it: 'grazie', srd: 'gratzias', lemma: 'gràtzia 1', variants: ['gràcia'], group: 'modifier' },
  { it: 'mille', srd: 'milli', lemma: 'mílli', variants: ['míla'], group: 'modifier' },
  { it: 'cento', srd: 'centu', lemma: 'céntu', variants: ['chentu'], group: 'modifier' },
  { it: 'difficile', srd: 'tostau', lemma: 'tostàu', variants: ['tostàdu'], group: 'modifier' },
]

export const CAMPIDANESE_ENTRY_COUNT = CAMPIDANESE_ENTRIES.length

export const MAX_CAMPIDANESE_HITS = 6

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Confini di parola espliciti: \b non regge le lettere accentate del sardo.
const termPattern = (term) => new RegExp(
  `(^|[^\\p{L}])${escapeRegExp(term).replace(/\s+/g, '\\s+')}([^\\p{L}]|$)`,
  'iu',
)

const normalizeKey = (value) => value
  .normalize('NFC')
  .toLocaleLowerCase('it')
  .replace(/\s+/g, ' ')
  .trim()

const byItalian = new Map(CAMPIDANESE_ENTRIES.map((entry) => [normalizeKey(entry.it), entry]))

/**
 * Cerca una voce a partire dal termine italiano o dalla forma campidanese.
 * @param {string} term
 * @returns {CampidaneseEntry | undefined}
 */
export const getCampidaneseEntry = (term) => {
  if (typeof term !== 'string' || !term.trim()) return undefined
  const key = normalizeKey(term)
  const italian = byItalian.get(key)
  if (italian) return italian
  return CAMPIDANESE_ENTRIES.find((entry) => (
    normalizeKey(entry.srd) === key
    || (entry.variants || []).some((variant) => normalizeKey(variant) === key)
  ))
}

/**
 * Trova le voci italiane presenti nel testo, nell'ordine in cui compaiono.
 * @param {string} text
 * @param {{ limit?: number }} [options]
 * @returns {Array<{ term: string, translation: string, lemma: string, note: string }>}
 */
export const findCampidaneseMatches = (text, { limit = MAX_CAMPIDANESE_HITS } = {}) => {
  if (typeof text !== 'string' || !text.trim()) return []

  const haystack = text.toLocaleLowerCase('it')
  const found = CAMPIDANESE_ENTRIES
    .map((entry) => {
      const match = haystack.match(termPattern(entry.it))
      if (!match) return null
      // I gruppi di cattura delimitano il termine: senza sottrarli resterebbe
      // attaccata la punteggiatura che fa da confine.
      const start = match.index + match[1].length
      const end = match.index + match[0].length - match[2].length
      return { entry, start, end, term: text.slice(start, end) }
    })
    .filter(Boolean)
    .sort((left, right) => left.start - right.start || right.end - left.end)

  const kept = []
  let covered = 0
  for (const match of found) {
    if (match.start < covered) continue
    kept.push(match)
    covered = match.end
  }

  return kept.slice(0, limit).map(({ term, entry }) => ({
    term,
    translation: entry.srd,
    lemma: entry.lemma,
    note: entry.note || '',
  }))
}

/**
 * Istruzione per il post-editor: fissa le forme verificate senza riscrivere la
 * frase né autorizzare il modello a inventare lessico.
 * @param {ReturnType<typeof findCampidaneseMatches>} matches
 * @returns {string}
 */
export const buildCampidanesePrompt = (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) return ''

  const lines = matches.map((match) => `- ${match.term} → ${match.translation} (lemma ${match.lemma})`)
  return [
    'Lessico campidanese verificato sul dizionario: se il concetto compare, usa questa forma',
    'e adatta articoli e accordi alla frase. Non usare varianti grafiche diverse da quella indicata;',
    'se una parola non è in questo elenco, conserva la forma della bozza invece di inventarne una:',
    ...lines,
  ].join('\n')
}
