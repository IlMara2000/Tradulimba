// Tabella del copione di registrazione generata da voice/copione.json.
//
// Il documento contiene blocchi delimitati da marcatori; lo script
// scripts/copione-table.mjs li sostituisce con la tabella del gruppo. Il test
// controlla che il blocco coincida con il JSON, così una modifica al copione
// senza rigenerare il documento fa fallire la CI invece di passare in silenzio.

export const DEFAULT_TABLE_GROUP = 'campidanese-frasi'

export const markerStart = (groupId) => `<!-- copione-table:${groupId}:start -->`
export const markerEnd = (groupId) => `<!-- copione-table:${groupId}:end -->`

/**
 * @param {any} copione
 * @param {string} groupId
 * @returns {any | null}
 */
export const groupById = (copione, groupId) => {
  const groups = Array.isArray(copione?.groups) ? copione.groups : []
  return groups.find((group) => group?.id === groupId) || null
}

/**
 * @param {any} group
 * @returns {string[]}
 */
export const rowsOf = (group) => (Array.isArray(group?.texts) ? group.texts : [])
  .filter((text) => typeof text === 'string' && text.trim())
  .map((text) => text.trim())

const cell = (value) => String(value ?? '').replace(/\|/gu, '\\|').replace(/\n/gu, ' ')

/**
 * @param {string[]} texts
 * @param {{ header?: [string, string] }} [options]
 * @returns {string}
 */
export const renderMarkdownTable = (texts, { header = ['#', 'Frase'] } = {}) => {
  const lines = [
    `| ${header[0]} | ${header[1]} |`,
    '| --- | --- |',
  ]
  texts.forEach((text, index) => {
    lines.push(`| ${index + 1} | ${cell(text)} |`)
  })
  return `${lines.join('\n')}\n`
}

/**
 * @param {any} copione
 * @param {string} [groupId]
 * @param {{ header?: [string, string] }} [options]
 * @returns {string}
 */
export const renderGroupTable = (copione, groupId = DEFAULT_TABLE_GROUP, options) => {
  const group = groupById(copione, groupId)
  if (!group) throw new Error(`Gruppo non trovato in voice/copione.json: ${groupId}`)
  return renderMarkdownTable(rowsOf(group), options)
}

const blockBounds = (markdown, groupId) => {
  const start = markerStart(groupId)
  const startIndex = markdown.indexOf(start)
  if (startIndex === -1) return null
  const afterStart = startIndex + start.length
  const endIndex = markdown.indexOf(markerEnd(groupId), afterStart)
  if (endIndex === -1) return null
  return { afterStart, endIndex }
}

/**
 * Contenuto del blocco, senza i marcatori e senza spazi ai bordi.
 * @param {string} markdown
 * @param {string} [groupId]
 * @returns {string | null}
 */
export const extractBlock = (markdown, groupId = DEFAULT_TABLE_GROUP) => {
  const bounds = blockBounds(markdown, groupId)
  return bounds ? markdown.slice(bounds.afterStart, bounds.endIndex).trim() : null
}

/**
 * Sostituisce solo il contenuto tra i due marcatori, lasciando il resto intatto.
 * @param {string} markdown
 * @param {string} groupId
 * @param {string} table
 * @returns {string}
 */
export const replaceBlock = (markdown, groupId, table) => {
  const bounds = blockBounds(markdown, groupId)
  if (!bounds) {
    throw new Error(`Marcatori mancanti per ${groupId}: ${markerStart(groupId)} … ${markerEnd(groupId)}`)
  }
  return `${markdown.slice(0, bounds.afterStart)}\n${table.trimEnd()}\n${markdown.slice(bounds.endIndex)}`
}

/**
 * Il blocco nel documento coincide con la tabella generata?
 * @param {string} markdown
 * @param {any} copione
 * @param {string} [groupId]
 * @param {{ header?: [string, string] }} [options]
 * @returns {boolean}
 */
export const isBlockCurrent = (markdown, copione, groupId = DEFAULT_TABLE_GROUP, options) => {
  const current = extractBlock(markdown, groupId)
  if (current === null) return false
  return current === renderGroupTable(copione, groupId, options).trim()
}
