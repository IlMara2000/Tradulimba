// Dati del glossario, separati dalla logica di ricerca: ogni voce dichiara la
// lezione del corso NARA e la domanda in cui la forma sarda è attestata, così
// una voce nuova arriva con la sua provenienza e il test può verificarle tutte
// contro il corso invece di fidarsi del testo scritto qui.

/**
 * @typedef {object} GlossaryEntry
 * @property {string} it Termine o locuzione italiana.
 * @property {string} srd Forma corrispondente in sardo LSC.
 * @property {string} level Lezione NARA in cui la forma compare.
 * @property {string} question Domanda della lezione che la contiene.
 * @property {string} [note] Spiegazione mostrata accanto al termine.
 */

export const GLOSSARY_REFERENCE = 'Norma LSC · corso NARA'

/** @type {GlossaryEntry[]} */
export const GLOSSARY_ENTRIES = [
  { it: 'ciao', srd: 'salude', level: 'salude', question: 'salude-1', note: 'Saluto generale; nel parlato esistono forme locali.' },
  { it: 'buongiorno', srd: 'bona die', level: 'salude', question: 'salude-2', note: 'Die significa “giorno”.' },
  { it: 'buonasera', srd: 'bona sera', level: 'salude', question: 'salude-2' },
  { it: 'buonanotte', srd: 'bona note', level: 'salude', question: 'salude-2' },
  { it: 'grazie', srd: 'gràtzias', level: 'salude', question: 'salude-3', note: 'Per ringraziare con più enfasi: gràtzias meda.' },
  { it: 'grazie mille', srd: 'gràtzias meda', level: 'salude', question: 'salude-3', note: 'Forma enfatica: meda vale “molto”.' },
  { it: 'per favore', srd: 'pro praghere', level: 'salude', question: 'salude-4', note: 'De nudda significa invece “di niente”.' },
  { it: 'di niente', srd: 'de nudda', level: 'salude', question: 'salude-4', note: 'De nudda è la risposta a un ringraziamento.' },

  { it: 'io sono', srd: 'deo so', level: 'presentatziones', question: 'presentatziones-1', note: 'Deo significa “io”, so significa “sono”.' },
  { it: 'tu sei', srd: 'tue ses', level: 'presentatziones', question: 'presentatziones-2', note: 'Presente di èssere: deo so, tue ses, issu/issa est.' },
  { it: 'come ti chiami', srd: 'ite ti naras', level: 'presentatziones', question: 'presentatziones-3', note: 'Forma LSC con nàrrere; nel parlato circolano domande locali diverse.' },
  { it: 'mi chiamo', srd: 'mi naro', level: 'presentatziones', question: 'presentatziones-4', note: 'Naro è la prima persona presente di nàrrere.' },

  { it: 'casa', srd: 'domo', level: 'domo', question: 'domo-1', note: 'Plurale domos; domo è femminile.' },
  { it: 'cucina', srd: 'coghina', level: 'domo', question: 'domo-2' },
  { it: 'cucinare', srd: 'coghinare', level: 'domo', question: 'domo-2', note: 'Coghina è la cucina; coghinare è l’azione.' },
  { it: 'bagno', srd: 'bagnu', level: 'domo', question: 'domo-3' },
  { it: 'dove', srd: 'in ue', level: 'domo', question: 'domo-3', note: 'In ue introduce una domanda di luogo: in ue est su bagnu?' },
  { it: 'tavolo', srd: 'mesa', level: 'domo', question: 'domo-4' },
  { it: 'sedia', srd: 'cadrea', level: 'domo', question: 'domo-4' },

  { it: 'madre', srd: 'mama', level: 'familia', question: 'familia-1' },
  { it: 'padre', srd: 'babbu', level: 'familia', question: 'familia-2' },
  { it: 'fratello', srd: 'frade', level: 'familia', question: 'familia-3', note: 'Plurale frades.' },
  { it: 'sorella', srd: 'sorre', level: 'familia', question: 'familia-3', note: 'Plurale sorres.' },
  { it: 'figlio', srd: 'fìgiu', level: 'familia', question: 'familia-4' },
  { it: 'figlia', srd: 'fìgia', level: 'familia', question: 'familia-4' },

  { it: 'acqua', srd: 'abba', level: 'a-mesa', question: 'a-mesa-1', note: 'Può indicare anche la pioggia, secondo il contesto.' },
  { it: 'formaggio', srd: 'casu', level: 'a-mesa', question: 'a-mesa-2' },
  { it: 'pesce', srd: 'pische', level: 'a-mesa', question: 'a-mesa-2' },
  { it: 'pane', srd: 'pane', level: 'a-mesa', question: 'a-mesa-3' },
  { it: 'vino', srd: 'binu', level: 'a-mesa', question: 'a-mesa-3' },
  { it: 'carne', srd: 'petza', level: 'a-mesa', question: 'a-mesa-3' },
  { it: 'che cosa', srd: 'ite', level: 'a-mesa', question: 'a-mesa-4', note: 'Ite significa “che cosa”; nella LSC si scrive intero.' },
  { it: 'vuoi', srd: 'boles', level: 'a-mesa', question: 'a-mesa-4', note: 'Seconda persona: ite boles a mandigare? = che cosa vuoi mangiare?' },
  { it: 'mangiare', srd: 'mandigare', level: 'a-mesa', question: 'a-mesa-4' },

  { it: 'oggi', srd: 'oe', level: 'tempus', question: 'tempus-2' },
  { it: 'ieri', srd: 'eris', level: 'tempus', question: 'tempus-2' },
  { it: 'domani', srd: 'cras', level: 'tempus', question: 'tempus-2' },
  { it: 'che ora è', srd: 'ite ora est', level: 'tempus', question: 'tempus-3', note: 'Nella scrittura LSC le parole restano intere: ite ora, non it’ora.' },
  { it: 'mattina', srd: 'mangianu', level: 'tempus', question: 'tempus-4', note: 'Di mattina: a mangianu; a merie è “di pomeriggio”.' },
  { it: 'pomeriggio', srd: 'merie', level: 'tempus', question: 'tempus-4', note: 'Di pomeriggio: a merie.' },
  { it: 'sera', srd: 'sero', level: 'tempus', question: 'tempus-4', note: 'Di sera: a sero. Bona sera è il saluto.' },

  { it: 'sinistra', srd: 'manca', level: 'inditos', question: 'inditos-1', note: 'A sinistra: a manca.' },
  { it: 'destra', srd: 'dereta', level: 'inditos', question: 'inditos-2', note: 'A destra: a dereta.' },
  { it: 'qui', srd: 'inoghe', level: 'inditos', question: 'inditos-3', note: 'In cue indica invece “lì / là”.' },
  { it: 'piazza', srd: 'pratza', level: 'inditos', question: 'inditos-4' },

  { it: 'essere', srd: 'èssere', level: 'verbos', question: 'verbos-1', note: 'Gli accenti distinguono gli infiniti LSC.' },
  { it: 'avere', srd: 'àere', level: 'verbos', question: 'verbos-1', note: 'Gli accenti distinguono gli infiniti LSC.' },
  { it: 'io ho', srd: 'deo apo', level: 'verbos', question: 'verbos-3', note: 'Presente di àere: deo apo, tue as, issu/issa at.' },
  { it: 'libro', srd: 'libru', level: 'verbos', question: 'verbos-3' },
  { it: 'parlare', srd: 'faeddare', level: 'verbos', question: 'verbos-4' },
  { it: 'sardo', srd: 'sardu', level: 'verbos', question: 'verbos-4' },

  { it: 'abitare', srd: 'bìvere', level: 'dialogu', question: 'dialogu-2', note: 'Bìvere vale anche “vivere”: bivo in Nùgoro.' },
  { it: 'sono le tre', srd: 'sunt sas tres', level: 'dialogu', question: 'dialogu-3', note: 'Sunt sas tres significa “sono le tre”.' },
  { it: 'accanto alla piazza', srd: 'acanta de sa pratza', level: 'dialogu', question: 'dialogu-4', note: 'Acanta de introduce la vicinanza.' },
]
