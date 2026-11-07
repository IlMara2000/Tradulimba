// Glossario di termini verificati, condiviso tra client e API: le voci vengono
// dal percorso NARA (forme LSC con note) e servono a due scopi — fissare le
// forme preferite nel post-editor AI e mostrare all'utente quali termini noti
// compaiono nella traduzione. Nessuna riscrittura automatica: cambiare una
// parola senza vedere la frase produrrebbe errori di accordo.

export const GLOSSARY_REFERENCE = 'Norma LSC · corso NARA'

export const GLOSSARY_ENTRIES = [
  { it: 'ciao', srd: 'salude', note: 'Saluto generale; nel parlato esistono forme locali.' },
  { it: 'buongiorno', srd: 'bona die', note: 'Die significa “giorno”.' },
  { it: 'buonasera', srd: 'bona sera' },
  { it: 'buonanotte', srd: 'bona note' },
  { it: 'grazie', srd: 'gràtzias', note: 'Per ringraziare con più enfasi: gràtzias meda.' },
  { it: 'grazie mille', srd: 'gràtzias meda', note: 'Forma enfatica: meda vale “molto”.' },
  { it: 'per favore', srd: 'pro praghere', note: 'De nudda significa invece “di niente”.' },
  { it: 'di niente', srd: 'de nudda', note: 'Risposta a un ringraziamento.' },
  { it: 'io sono', srd: 'deo so', note: 'Deo significa “io”, so significa “sono”.' },
  { it: 'io ho', srd: 'deo apo', note: 'Presente di àere: deo apo, tue as, issu/issa at.' },
  { it: 'tu sei', srd: 'tue ses', note: 'Presente di èssere: deo so, tue ses, issu/issa est.' },
  { it: 'come ti chiami', srd: 'ite ti naras', note: 'Forma LSC con nàrrere; nel parlato circolano domande locali diverse.' },
  { it: 'mi chiamo', srd: 'mi naro', note: 'Naro è la prima persona presente di nàrrere.' },
  { it: 'che cosa', srd: 'ite', note: 'Ite introduce le domande; nella scrittura LSC le parole restano intere.' },
  { it: 'che ora è', srd: 'ite ora est', note: 'Si scrive ite ora, non it’ora.' },
  { it: 'sono le tre', srd: 'sunt sas tres', note: 'Sunt sas tres significa “sono le tre”.' },
  { it: 'vuoi', srd: 'boles', note: 'Seconda persona: ite boles a mandigare? = che cosa vuoi mangiare?' },
  { it: 'dove', srd: 'in ue', note: 'In ue introduce una domanda di luogo: in ue est su bagnu?' },
  { it: 'qui', srd: 'inoghe', note: 'In cue indica invece “lì / là”.' },
  { it: 'accanto alla piazza', srd: 'acanta de sa pratza', note: 'Acanta de introduce la vicinanza.' },
  { it: 'acqua', srd: 'abba', note: 'Può indicare anche la pioggia, secondo il contesto.' },
  { it: 'pane', srd: 'pane' },
  { it: 'vino', srd: 'binu' },
  { it: 'formaggio', srd: 'casu' },
  { it: 'carne', srd: 'petza' },
  { it: 'pesce', srd: 'pische' },
  { it: 'casa', srd: 'domo', note: 'Plurale domos; domo è femminile.' },
  { it: 'cucina', srd: 'coghina' },
  { it: 'cucinare', srd: 'coghinare', note: 'Coghina è la cucina; coghinare è l’azione.' },
  { it: 'bagno', srd: 'bagnu' },
  { it: 'tavolo', srd: 'mesa' },
  { it: 'sedia', srd: 'cadrea' },
  { it: 'madre', srd: 'mama' },
  { it: 'padre', srd: 'babbu' },
  { it: 'figlio', srd: 'fìgiu' },
  { it: 'figlia', srd: 'fìgia' },
  { it: 'fratello', srd: 'frade', note: 'Plurale frades.' },
  { it: 'sorella', srd: 'sorre', note: 'Plurale sorres.' },
  { it: 'oggi', srd: 'oe' },
  { it: 'ieri', srd: 'eris' },
  { it: 'domani', srd: 'cras' },
  { it: 'mattina', srd: 'mangianu', note: 'Di mattina: a mangianu.' },
  { it: 'pomeriggio', srd: 'merie', note: 'Di pomeriggio: a merie.' },
  { it: 'sera', srd: 'sero', note: 'Di sera: a sero. Bona sera è il saluto.' },
  { it: 'piazza', srd: 'pratza' },
  { it: 'sinistra', srd: 'manca', note: 'A sinistra: a manca.' },
  { it: 'destra', srd: 'dereta', note: 'A destra: a dereta.' },
  { it: 'mangiare', srd: 'mandigare' },
  { it: 'parlare', srd: 'faeddare' },
  { it: 'essere', srd: 'èssere', note: 'Gli accenti distinguono gli infiniti LSC.' },
  { it: 'avere', srd: 'àere', note: 'Gli accenti distinguono gli infiniti LSC.' },
  { it: 'abitare', srd: 'bìvere', note: 'Bìvere vale anche “vivere”: bivo in Nùgoro.' },
  { it: 'libro', srd: 'libru' },
  { it: 'sardo', srd: 'sardu', note: 'Maschile con articolo su: su sardu.' },
]

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
