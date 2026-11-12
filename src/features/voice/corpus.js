// Corpus vocale sardo. Il corpus è composto da brevi registrazioni umane
// (cartella public/voce/registrata) e da clip sintetiche sarde generate con un
// motore compatibile (public/voce/sintetica). Il manifest è costruito da
// scripts/voice-corpus.mjs e letto dal browser: nessun testo viene inviato a un
// servizio per una frase già presente nel corpus.
//
// La chiave di ricerca è il testo normalizzato, non la grafia esatta: maiuscole,
// punteggiatura e apostrofi tipografici non devono impedire di trovare la clip.
// L'accento e le lettere sarde restano invece significativi.

/** @typedef {'lsc' | 'campidanese' | 'logudorese'} VoiceVariant */
/** @typedef {'registrata' | 'sintetica'} VoiceSource */

export const VOICE_VARIANTS = ['lsc', 'campidanese', 'logudorese']

const VARIANT_SET = new Set(VOICE_VARIANTS)
const SOURCE_RANK = { registrata: 0, sintetica: 1 }
const MEDIA_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  opus: 'audio/ogg',
}

const PUNCTUATION = /[.,!?;:…«»""“”„‟()\[\]{}<>/\\|@#$%^&*+=~`]+/gu
const DASHES = /[—–]+/gu

/**
 * Testo leggibile proveniente dal manifest, ripulito e limitato. I campi sono
 * mostrati come testo, mai interpretati come HTML.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string | null}
 */
const manifestText = (value, maxLength) => {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean ? clean.slice(0, maxLength) : null
}

/**
 * Riporta una varietà assente o sconosciuta alla LSC, come fa il resto dell'app.
 * @param {string | undefined} variant
 * @returns {VoiceVariant}
 */
export const normalizeVoiceVariant = (variant) => (
  VARIANT_SET.has(variant ?? '') ? /** @type {VoiceVariant} */ (variant) : 'lsc'
)

/**
 * Normalizza il testo per la ricerca nel corpus. Non rimuove accenti né
 * apostrofi interni: "s'agatat" e "sagatat" sono testi diversi.
 * @param {string | undefined} text
 * @returns {string}
 */
export const normalizeVoiceText = (text) => {
  if (typeof text !== 'string') return ''
  return text
    .normalize('NFC')
    .replace(/[’‘`´]/gu, "'")
    .toLocaleLowerCase('it')
    .replace(DASHES, ' ')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Hash FNV-1a a 32 bit, usato solo per rendere stabile e univoco il nome file.
 * @param {string} value
 * @returns {string}
 */
const shortHash = (value) => {
  let hash = 0x811c9dc5
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

/**
 * Identificativo stabile di una riga del copione. Il nome resta leggibile ma
 * include un hash, così due frasi con lo stesso slug non si sovrascrivono.
 * @param {string} text
 * @param {string | undefined} variant
 * @returns {string}
 */
export const voiceEntryId = (text, variant) => {
  const normalized = normalizeVoiceText(text)
  const slug = normalized
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48)
  return `${slug || 'voce'}-${shortHash(`${normalizeVoiceVariant(variant)}:${normalized}`)}`
}

/**
 * I file del corpus sono statici e serviti dalla stessa origine. Il controllo
 * impedisce che un manifest manomesso faccia caricare un percorso arbitrario.
 * @param {unknown} file
 * @returns {boolean}
 */
const STATIC_VOICE_FILE = /^\/voce\/(registrata|sintetica)\/[a-z0-9-]+\.(mp3|wav|ogg|m4a|opus)$/u
const API_AUDIO_FILE = /^\/api\/audio\?source=registrata&id=[a-z0-9-]+$/u

export const isSafeVoiceFile = (file) => (
  typeof file === 'string'
  && (STATIC_VOICE_FILE.test(file) || API_AUDIO_FILE.test(file))
)

/**
 * @param {unknown} data
 * @returns {{ version: number, entries: Array<Record<string, any>> }}
 */
export const validateVoiceManifest = (data) => {
  if (!data || typeof data !== 'object' || !Array.isArray(/** @type {any} */ (data).entries)) {
    return { version: 1, entries: [] }
  }

  /** @type {Array<Record<string, any>>} */
  const entries = []
  const seen = new Set()

  for (const raw of /** @type {any} */ (data).entries) {
    if (!raw || typeof raw !== 'object') continue
    const text = typeof raw.text === 'string' ? raw.text.trim() : ''
    const variant = normalizeVoiceVariant(raw.variant)
    const source = raw.source === 'registrata' ? 'registrata' : raw.source === 'sintetica' ? 'sintetica' : null
    const normalized = normalizeVoiceText(text)

    if (!text || text.length > 1000 || !normalized || !source || !isSafeVoiceFile(raw.file)) continue

    const corvocAudio = API_AUDIO_FILE.test(raw.file)
    const extension = corvocAudio ? 'wav' : String(raw.file).split('.').pop() || 'mp3'
    const key = `${source}:${variant}:${normalized}`
    if (seen.has(key)) continue
    seen.add(key)

    entries.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : voiceEntryId(text, variant),
      text,
      normalized,
      variant,
      source,
      file: raw.file,
      mediaType: corvocAudio ? 'audio/wav' : MEDIA_TYPES[extension] || 'audio/mpeg',
      kind: raw.kind === 'word' ? 'word' : 'phrase',
      engine: typeof raw.engine === 'string' ? raw.engine : null,
      speaker: manifestText(raw.speaker, 120),
      consentRef: manifestText(raw.consentRef, 120),
      recordedAt: manifestText(raw.recordedAt, 40),
      license: manifestText(raw.license, 160),
    })
  }

  return { version: 1, entries }
}

/**
 * Cerca una clip per il testo e la varietà richiesti. Una registrazione umana
 * vince sulla clip sintetica. Non si passa da una varietà all'altra: leggere un
 * testo campidanese con una clip LSC cambierebbe finali e lessico.
 * @param {unknown} manifest
 * @param {string} text
 * @param {string | undefined} variant
 * @returns {Record<string, any> | null}
 */
export const selectCorpusEntry = (manifest, text, variant) => {
  const normalized = normalizeVoiceText(text)
  if (!normalized) return null
  const wantedVariant = normalizeVoiceVariant(variant)
  const entries = /** @type {any} */ (validateVoiceManifest(manifest)).entries
  const matches = entries.filter((entry) => (
    entry.normalized === normalized && entry.variant === wantedVariant
  ))
  if (matches.length === 0) return null
  return matches.sort((left, right) => (
    (SOURCE_RANK[left.source] ?? 9) - (SOURCE_RANK[right.source] ?? 9)
  ))[0]
}
