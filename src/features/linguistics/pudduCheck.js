// Interrogazione del Ditzionàriu in Línia (Puddu).
//
// Il parsing è puro e vive qui, così il test può coprire i tre casi (lemma,
// assente, pagina non interpretabile) senza andare in rete. Il CLI che parla
// col dizionario è scripts/puddu-check.mjs.
//
// La pagina di una forma trovata contiene il lemma dentro
// <strong style="font-size: large;" >…</strong>; una forma assente risponde
// «non trovata»; una forma che il sito non riesce a gestire (per esempio con
// apostrofo) restituisce una pagina «Whoops! There was an error.».

export const PUDDU_BASE = 'https://ditzionariu.nor-web.eu/it/faeddu'

const LEMMA_STRONG = /<strong\s+style="font-size:\s*large;"\s*>([\s\S]*?)<\/strong>/u

/**
 * @typedef {{
 *   ok: boolean,
 *   status: number,
 *   text: () => Promise<string>,
 * }} FetchLikeResponse
 */

/**
 * @typedef {(url: string, init?: { method?: string, signal?: AbortSignal }) => Promise<FetchLikeResponse>} FetchLike
 */

/**
 * @typedef {{
 *   status: 'found' | 'absent' | 'error',
 *   lemma: string | null,
 *   variants: string[],
 *   reason: string | null,
 * }} PudduPage
 */

/**
 * @typedef {PudduPage & { form: string }} PudduResult
 */

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
}

/**
 * Decodifica le entità HTML più comuni; il lemma può contenere apostrofi o
 * caratteri accentati già in UTF-8.
 * @param {string} text
 * @returns {string}
 */
export const decodeEntities = (text) => String(text)
  .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gu, (entity) => ENTITIES[entity] ?? entity)
  .replace(/&#x([0-9a-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/gu, (_, decimal) => String.fromCodePoint(Number(decimal)))

/**
 * Divide il contenuto del lemma in forme: «dí, día» → ["dí", "día"].
 * Il dizionario aggiunge un numero alle omonimie («mercàtu 1»): non fa parte
 * della forma.
 * @param {string} raw
 * @returns {string[]}
 */
export const lemmaParts = (raw) => String(raw || '')
  .split(',')
  .map((part) => part.replace(/\s+\d+$/u, '').trim())
  .filter(Boolean)

/**
 * Interpreta la pagina restituita dal dizionario.
 * @param {string} html
 * @returns {PudduPage}
 */
export const parsePudduPage = (html) => {
  const page = typeof html === 'string' ? html : ''

  if (/whoops/iu.test(page) || /there was an error/iu.test(page)) {
    return { status: 'error', lemma: null, variants: [], reason: 'errore del dizionario' }
  }

  const match = page.match(LEMMA_STRONG)
  if (match) {
    const text = decodeEntities(match[1].replace(/<[^>]*>/gu, ' ')).replace(/\s+/gu, ' ').trim()
    const parts = lemmaParts(text)
    if (parts.length === 0) {
      return { status: 'error', lemma: null, variants: [], reason: 'lemma vuoto' }
    }
    return { status: 'found', lemma: parts[0], variants: parts.slice(1), reason: null }
  }

  if (/non\s+trovata/iu.test(page)) {
    return { status: 'absent', lemma: null, variants: [], reason: null }
  }

  return { status: 'error', lemma: null, variants: [], reason: 'pagina non riconosciuta' }
}

/**
 * URL della forma. encodeURIComponent gestisce apostrofi e spazi; il sito può
 * comunque rispondere con un errore, che parsePudduPage segnala.
 * @param {string} form
 * @returns {string}
 */
export const pudduUrl = (form) => `${PUDDU_BASE}/${encodeURIComponent(String(form || '').trim()).replace(/'/gu, '%27')}`

/**
 * Interroga il dizionario per una forma. Il fetch è iniettabile per i test.
 * @param {string} form
 * @param {{ fetchImpl?: FetchLike, signal?: AbortSignal }} [options]
 * @returns {Promise<PudduResult>}
 */
export const checkPudduForm = async (form, options = {}) => {
  const clean = String(form || '').trim()
  if (!clean) {
    return { form: clean, status: 'error', lemma: null, variants: [], reason: 'forma vuota' }
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    return { form: clean, status: 'error', lemma: null, variants: [], reason: 'fetch non disponibile' }
  }

  let response
  try {
    response = await fetchImpl(pudduUrl(clean), { method: 'POST', signal: options.signal })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { form: clean, status: 'error', lemma: null, variants: [], reason: `rete: ${message}` }
  }

  if (!response || response.ok !== true) {
    return {
      form: clean,
      status: 'error',
      lemma: null,
      variants: [],
      reason: `HTTP ${response?.status ?? 'sconosciuto'}`,
    }
  }

  let html
  try {
    html = await response.text()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { form: clean, status: 'error', lemma: null, variants: [], reason: `lettura: ${message}` }
  }

  return { form: clean, ...parsePudduPage(html) }
}

/**
 * Legge un elenco di forme da un testo: una per riga, con `#` per i commenti e
 * la virgola come separatore facoltativo. Mantiene l'ordine e scarta i
 * duplicati (confronto senza distinzione di maiuscole).
 * @param {string} text
 * @returns {string[]}
 */
export const parseForms = (text) => {
  const seen = new Set()
  const forms = []

  for (const line of String(text || '').split(/\r?\n/gu)) {
    const cleaned = line.replace(/#.*$/u, '').trim()
    if (!cleaned) continue

    for (const part of cleaned.split(',')) {
      const form = part.trim()
      if (!form) continue

      const key = form.normalize('NFC').toLocaleLowerCase('it')
      if (seen.has(key)) continue
      seen.add(key)
      forms.push(form)
    }
  }

  return forms
}

/**
 * Riga leggibile per il terminale.
 * @param {PudduResult} result
 * @returns {string}
 */
export const formatResult = (result) => {
  if (result.status === 'found') {
    const variants = result.variants.length > 0 ? ` (varianti: ${result.variants.join(', ')})` : ''
    return `${result.form}: lemma ${result.lemma}${variants}`
  }
  if (result.status === 'absent') {
    return `${result.form}: assente («non trovata»)`
  }
  return `${result.form}: non verificabile (${result.reason})`
}
