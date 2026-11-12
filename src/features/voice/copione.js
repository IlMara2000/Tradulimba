import { normalizeVoiceText, normalizeVoiceVariant } from './corpus.js'

/**
 * Appiattisce voice/copione.json in righe registrabili. Lo usano sia il
 * costruttore del manifest sia lo studio di registrazione, così id e testi
 * restano identici nei due percorsi.
 *
 * @param {any} data
 * @returns {Array<{
 *   text: string,
 *   normalized: string,
 *   variant: 'lsc' | 'campidanese' | 'logudorese',
 *   kind: 'word' | 'phrase',
 *   group: string | null,
 *   groupLabel: string | null,
 *   speaker: string | null,
 *   synthesisExcluded: boolean,
 * }>}
 */
export const flattenCopione = (data) => {
  const rows = []
  const excluded = new Set(
    (Array.isArray(data?.excludeSynthesis) ? data.excludeSynthesis : [])
      .map((text) => normalizeVoiceText(text))
      .filter(Boolean),
  )
  const defaultSpeaker = typeof data?.speaker === 'string' && data.speaker.trim()
    ? data.speaker.trim()
    : null

  const push = (text, variant, kind, group, groupLabel, speaker) => {
    if (typeof text !== 'string') return
    const clean = text.trim()
    if (!clean || clean.length > 1000) return
    rows.push({
      text: clean,
      normalized: normalizeVoiceText(clean),
      variant: normalizeVoiceVariant(variant),
      kind: kind === 'word' ? 'word' : 'phrase',
      group: typeof group === 'string' ? group : null,
      groupLabel: typeof groupLabel === 'string' ? groupLabel : null,
      speaker: typeof speaker === 'string' && speaker.trim() ? speaker.trim() : defaultSpeaker,
      synthesisExcluded: false,
    })
  }

  for (const group of Array.isArray(data?.groups) ? data.groups : []) {
    const label = typeof group.label === 'string' ? group.label : null
    for (const text of Array.isArray(group.texts) ? group.texts : []) {
      push(text, group.variant, group.kind, group.id, label, group.speaker)
    }
  }
  for (const entry of Array.isArray(data?.entries) ? data.entries : []) {
    push(entry.text, entry.variant, entry.kind, entry.group, entry.groupLabel, entry.speaker)
  }

  const unique = new Map()
  for (const row of rows) {
    const key = `${row.variant}:${row.normalized}`
    if (!unique.has(key)) {
      row.synthesisExcluded = excluded.has(row.normalized)
      unique.set(key, row)
    }
  }
  return [...unique.values()]
}
