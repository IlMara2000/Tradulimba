// Verifica della base sarda contro lo snapshot del dizionario.
//
// Lo snapshot (data/puddu-lemmi.json) è la prova: contiene solo lemmi che sono
// stati aperti e controllati a mano, con la data della consultazione. Questo
// modulo non va in rete: confronta i dati del progetto con quella prova, così
// una forma non attestata non può entrare (o restare) in silenzio.
//
// Tre controlli, indipendenti:
// 1. lo snapshot stesso è coerente (fonte, data, lemma, gruppo);
// 2. ogni voce di campidaneseLexicon.js ha il suo lemma nello snapshot, con la
//    stessa forma e le stesse varianti;
// 3. ogni parola delle righe campidanesi del copione è attestata, oppure è una
//    delle forme dichiarate come non lessicali (grammatica, nomi propri,
//    flessioni, lettere).

/**
 * @typedef {object} SnapshotLemma
 * @property {string} lemma Forma accentata del dizionario.
 * @property {string[]} [varianti]
 * @property {'verb'|'noun'|'modifier'} [gruppo]
 * @property {string} [consultato]
 */

/**
 * @typedef {object} PudduSnapshot
 * @property {string} fonte
 * @property {string} consultato
 * @property {Record<string, SnapshotLemma>} lemmi
 * @property {string[]} [grammatica]
 * @property {string[]} [nomi_propri]
 * @property {string[]} [flessioni]
 * @property {string[]} [lettere]
 */

const NON_LEXICAL_SECTIONS = ['grammatica', 'nomi_propri', 'flessioni', 'lettere']
const GROUPS = new Set(['verb', 'noun', 'modifier'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

/**
 * Forma di confronto: NFC, minuscole, spazi compattati. La presenza e la
 * posizione dell'accento restano significative (custu ≠ cústu), la sua qualità
 * no: il dizionario usa l'acuto per la vocale chiusa dove la norma scrive il
 * grave, e la stessa parola non deve risultare due volte.
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeLexeme = (value) => (
  typeof value === 'string'
    ? value
      .normalize('NFD')
      .replace(/\u0301/gu, '\u0300')
      .normalize('NFC')
      .toLocaleLowerCase('it')
      .replace(/\s+/gu, ' ')
      .trim()
    : ''
)

/** "iscíri, iscíre 1" → ["iscíri", "iscíre"] */
const lemmaParts = (lemma) => (
  typeof lemma === 'string'
    ? lemma.split(',').map((part) => part.replace(/\s+\d+$/u, '').trim()).filter(Boolean)
    : []
)

/**
 * Tutte le forme che il copione può usare senza essere segnalate.
 * @param {PudduSnapshot} snapshot
 * @returns {Set<string>}
 */
export const attestedForms = (snapshot) => {
  const forms = new Set()
  const add = (value) => {
    const key = normalizeLexeme(value)
    if (key) forms.add(key)
  }

  for (const [forma, entry] of Object.entries(snapshot?.lemmi || {})) {
    add(forma)
    for (const variant of entry?.varianti || []) add(variant)
    for (const part of lemmaParts(entry?.lemma)) add(part)
  }
  for (const section of NON_LEXICAL_SECTIONS) {
    for (const value of snapshot?.[section] || []) add(value)
  }

  return forms
}

/**
 * Parole di una riga: solo lettere, quindi "s'iscola" dà "s" e "iscola".
 * @param {unknown} text
 * @returns {string[]}
 */
export const tokensOf = (text) => (
  typeof text === 'string' ? [...text.matchAll(/\p{L}+/gu)].map((match) => match[0]) : []
)

/**
 * @param {PudduSnapshot} snapshot
 * @returns {string[]} problemi dello snapshot
 */
export const auditSnapshot = (snapshot) => {
  const problems = []

  if (!snapshot || typeof snapshot !== 'object') return ['snapshot assente o non leggibile']
  if (typeof snapshot.fonte !== 'string' || !snapshot.fonte.trim()) problems.push('fonte mancante')
  if (!ISO_DATE.test(snapshot.consultato || '')) problems.push('data di consultazione mancante o non ISO')

  const lemmi = snapshot.lemmi
  if (!lemmi || typeof lemmi !== 'object' || Object.keys(lemmi).length === 0) {
    problems.push('nessun lemma nello snapshot')
    return problems
  }

  for (const section of NON_LEXICAL_SECTIONS) {
    const values = snapshot[section]
    if (values === undefined) continue
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || !value.trim())) {
      problems.push(`sezione ${section} non è una lista di stringhe`)
    }
  }

  const normalizedKeys = new Map()
  for (const forma of Object.keys(lemmi)) {
    const key = normalizeLexeme(forma)
    if (normalizedKeys.has(key)) {
      problems.push(`${forma}: forma duplicata (già presente come ${normalizedKeys.get(key)})`)
    } else {
      normalizedKeys.set(key, forma)
    }
  }

  for (const [forma, entry] of Object.entries(lemmi)) {
    if (!forma.trim()) problems.push('chiave di lemma vuota')
    if (!entry || typeof entry !== 'object') {
      problems.push(`${forma}: voce non valida`)
      continue
    }
    if (typeof entry.lemma !== 'string' || !entry.lemma.trim()) {
      problems.push(`${forma}: lemma accentato mancante`)
    }
    if (entry.varianti !== undefined
      && (!Array.isArray(entry.varianti)
        || entry.varianti.some((variant) => typeof variant !== 'string' || !variant.trim()))) {
      problems.push(`${forma}: varianti non valide`)
    }
    if (entry.gruppo !== undefined && !GROUPS.has(entry.gruppo)) {
      problems.push(`${forma}: gruppo ${entry.gruppo} non riconosciuto`)
    }
    if (entry.consultato !== undefined && !ISO_DATE.test(entry.consultato)) {
      problems.push(`${forma}: data di consultazione non valida`)
    }
  }

  return problems
}

/**
 * Confronta le voci del lessico con lo snapshot.
 * @param {Array<{ it: string, srd: string, lemma: string, variants?: string[] }>} entries
 * @param {PudduSnapshot} snapshot
 * @returns {string[]}
 */
export const auditLexicon = (entries, snapshot) => {
  const problems = []
  const index = new Map()
  for (const [forma, saved] of Object.entries(snapshot?.lemmi || {})) {
    const key = normalizeLexeme(forma)
    if (key && !index.has(key)) index.set(key, saved)
  }

  for (const entry of entries) {
    const key = normalizeLexeme(entry.srd)
    const saved = index.get(key)
    if (!saved) {
      problems.push(`${entry.srd}: nessuna attestazione nello snapshot (dizionario da ricontrollare)`)
      continue
    }

    const expected = normalizeLexeme(saved.lemma)
    const actual = normalizeLexeme(entry.lemma)
    if (expected !== actual) {
      problems.push(`${entry.srd}: lemma "${entry.lemma}" diverso dallo snapshot "${saved.lemma}"`)
    }

    const savedVariants = new Set((saved.varianti || []).map(normalizeLexeme))
    const entryVariants = new Set((entry.variants || []).map(normalizeLexeme))
    const added = [...entryVariants].filter((variant) => !savedVariants.has(variant))
    if (added.length > 0) {
      problems.push(`${entry.srd}: varianti non attestate ${added.join(', ')}`)
    }
  }

  return problems
}

/**
 * Ogni parola campidanese del copione deve risultare attestata.
 * @param {Array<{ variant: string, text: string }>} rows
 * @param {PudduSnapshot} snapshot
 * @returns {Array<{ token: string, text: string }>}
 */
export const auditCorpus = (rows, snapshot) => {
  const allowed = attestedForms(snapshot)
  const unknown = []

  for (const row of rows) {
    if (row.variant !== 'campidanese') continue
    for (const token of tokensOf(row.text)) {
      if (!allowed.has(normalizeLexeme(token))) unknown.push({ token, text: row.text })
    }
  }

  return unknown
}
