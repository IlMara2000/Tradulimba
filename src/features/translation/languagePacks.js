export const LANGUAGE_PACK_STORAGE_KEY = 'tradulimba:language-packs:v1'

/**
 * Italiano e sardo sono sempre attivi. Le altre lingue sono pacchetti
 * facoltativi: si installano dal browser e restano su questo dispositivo.
 * I codici sono quelli usati dall'API e dalla cronologia (ISO 639-3).
 */
export const LANGUAGE_PACKS = [
  {
    code: 'ita',
    name: 'Italiano',
    native: 'Italiano',
    htmlLang: 'it',
    tag: 'IT',
    required: true,
    note: 'Sempre attiva: è la lingua di partenza del traduttore.',
  },
  {
    code: 'srd',
    name: 'Sardu',
    native: 'Sardu',
    htmlLang: 'sc',
    tag: 'SRD',
    required: true,
    note: 'Sempre attiva: LSC, campidanese e logudorese.',
  },
  { code: 'eng', name: 'Inglese', native: 'English', htmlLang: 'en', tag: 'EN' },
  { code: 'spa', name: 'Spagnolo', native: 'Español', htmlLang: 'es', tag: 'ES' },
  { code: 'jpn', name: 'Giapponese', native: '日本語', htmlLang: 'ja', tag: 'JA' },
  { code: 'fra', name: 'Francese', native: 'Français', htmlLang: 'fr', tag: 'FR' },
  { code: 'deu', name: 'Tedesco', native: 'Deutsch', htmlLang: 'de', tag: 'DE' },
  { code: 'por', name: 'Portoghese', native: 'Português', htmlLang: 'pt', tag: 'PT' },
  { code: 'rus', name: 'Russo', native: 'Русский', htmlLang: 'ru', tag: 'RU' },
  { code: 'ara', name: 'Arabo', native: 'العربية', htmlLang: 'ar', tag: 'AR' },
  { code: 'zho', name: 'Cinese', native: '中文', htmlLang: 'zh', tag: 'ZH' },
  { code: 'kor', name: 'Coreano', native: '한국어', htmlLang: 'ko', tag: 'KO' },
  { code: 'hin', name: 'Hindi', native: 'हिन्दी', htmlLang: 'hi', tag: 'HI' },
  { code: 'tur', name: 'Turco', native: 'Türkçe', htmlLang: 'tr', tag: 'TR' },
  { code: 'nld', name: 'Olandese', native: 'Nederlands', htmlLang: 'nl', tag: 'NL' },
  { code: 'pol', name: 'Polacco', native: 'Polski', htmlLang: 'pl', tag: 'PL' },
]

const PACK_BY_CODE = new Map(LANGUAGE_PACKS.map((pack) => [pack.code, pack]))

export const DEFAULT_LANGUAGE_CODES = LANGUAGE_PACKS
  .filter((pack) => pack.required)
  .map((pack) => pack.code)

export const OPTIONAL_LANGUAGE_PACKS = LANGUAGE_PACKS.filter((pack) => !pack.required)

export const SUPPORTED_LANGUAGE_CODES = new Set(LANGUAGE_PACKS.map((pack) => pack.code))

export const getLanguagePack = (code) => PACK_BY_CODE.get(code) || null

export const isLanguageCode = (code) => PACK_BY_CODE.has(code)

export const languageLabel = (code) => getLanguagePack(code)?.name || code

export const languageHtmlTag = (code) => getLanguagePack(code)?.htmlLang || 'it'

/**
 * Tiene solo i codici noti, aggiunge sempre italiano e sardo e restituisce
 * l'ordine del registro (così la UI non cambia ordine a ogni salvataggio).
 * @param {unknown} value
 * @returns {string[]}
 */
export const normalizeInstalledLanguages = (value) => {
  const installed = new Set(DEFAULT_LANGUAGE_CODES)
  if (Array.isArray(value)) {
    for (const code of value) {
      if (PACK_BY_CODE.has(code)) installed.add(code)
    }
  }
  return LANGUAGE_PACKS
    .filter((pack) => installed.has(pack.code))
    .map((pack) => pack.code)
}

/**
 * @param {Storage | undefined} [storage]
 * @returns {string[]}
 */
export const loadInstalledLanguages = (storage) => {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage
    const stored = store?.getItem(LANGUAGE_PACK_STORAGE_KEY)
    return normalizeInstalledLanguages(stored ? JSON.parse(stored) : DEFAULT_LANGUAGE_CODES)
  } catch {
    return [...DEFAULT_LANGUAGE_CODES]
  }
}

/**
 * @param {string[]} codes
 * @param {Storage | undefined} [storage]
 * @returns {boolean}
 */
export const saveInstalledLanguages = (codes, storage) => {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage
    store?.setItem(LANGUAGE_PACK_STORAGE_KEY, JSON.stringify(normalizeInstalledLanguages(codes)))
    return true
  } catch {
    return false
  }
}

/**
 * Installa o rimuove una lingua facoltativa. Italiano e sardo non si rimuovono.
 * @param {string[]} codes
 * @param {string} code
 * @param {boolean} installed
 * @returns {string[]}
 */
export const setLanguageInstalled = (codes, code, installed) => {
  const pack = getLanguagePack(code)
  const next = new Set(normalizeInstalledLanguages(codes))
  if (!pack || pack.required) return normalizeInstalledLanguages([...next])

  if (installed) next.add(code)
  else next.delete(code)
  return normalizeInstalledLanguages([...next])
}
