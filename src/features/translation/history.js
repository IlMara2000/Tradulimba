import { isLanguageCode } from './languagePacks.js'

export const TRANSLATION_HISTORY_KEY = 'tradulimba:history:v1'

const MAX_HISTORY_ITEMS = 8
const MAX_INPUT_LENGTH = 4000
const MAX_OUTPUT_LENGTH = 8000
const VARIANTS = new Set(['lsc', 'campidanese', 'logudorese'])

const cleanText = (value, maximum) => (
  typeof value === 'string' ? value.trim().slice(0, maximum) : ''
)

export const normalizeHistoryEntry = (value) => {
  if (!value || typeof value !== 'object') return null

  const input = cleanText(value.input, MAX_INPUT_LENGTH)
  const output = cleanText(value.output, MAX_OUTPUT_LENGTH)
  const source = isLanguageCode(value.source) ? value.source : ''
  const target = isLanguageCode(value.target) ? value.target : ''
  const variant = VARIANTS.has(value.variant) ? value.variant : 'lsc'

  if (!input || !output || !source || !target || source === target) return null

  const variantApplied = value.variantApplied !== false
  const effectiveVariant = VARIANTS.has(value.effectiveVariant)
    ? value.effectiveVariant
    : (variantApplied ? variant : 'lsc')

  return {
    id: cleanText(value.id, 160) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    input,
    output,
    source,
    target,
    variant,
    effectiveVariant,
    variantApplied,
    createdAt: cleanText(value.createdAt, 64),
    engine: cleanText(value.engine, 160),
    warning: cleanText(value.warning, 500),
  }
}

export const normalizeHistory = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizeHistoryEntry)
    .filter(Boolean)
    .slice(0, MAX_HISTORY_ITEMS)
}

export const loadTranslationHistory = (storage) => {
  try {
    const historyStorage = storage === undefined ? globalThis.localStorage : storage
    const stored = historyStorage?.getItem(TRANSLATION_HISTORY_KEY)
    return normalizeHistory(stored ? JSON.parse(stored) : [])
  } catch {
    return []
  }
}

export const saveTranslationHistory = (items, storage) => {
  try {
    const historyStorage = storage === undefined ? globalThis.localStorage : storage
    historyStorage?.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(normalizeHistory(items)))
    return true
  } catch {
    return false
  }
}

export const addTranslationHistoryEntry = (items, entry) => {
  const normalizedEntry = normalizeHistoryEntry(entry)
  if (!normalizedEntry) return normalizeHistory(items)

  return normalizeHistory([
    normalizedEntry,
    ...normalizeHistory(items).filter((item) => (
      item.input !== normalizedEntry.input
      || item.source !== normalizedEntry.source
      || item.variant !== normalizedEntry.variant
    )),
  ])
}
