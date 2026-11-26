import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  extractBlock,
  groupById,
  isBlockCurrent,
  markerEnd,
  markerStart,
  renderGroupTable,
  renderMarkdownTable,
  replaceBlock,
  rowsOf,
} from '../src/features/voice/copioneTable.js'

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const readText = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const copione = readJson('voice/copione.json')
const doc = readText('docs/copione-registrazione-voce.md')

test('genera una tabella numerata dal gruppo', () => {
  const table = renderMarkdownTable(['Prima frase.', 'Seconda frase.'])
  assert.equal(table, [
    '| # | Frase |',
    '| --- | --- |',
    '| 1 | Prima frase. |',
    '| 2 | Seconda frase. |',
    '',
  ].join('\n'))
})

test('legge le 48 righe del gruppo campidanese-frasi', () => {
  const group = groupById(copione, 'campidanese-frasi')
  assert.ok(group)
  assert.equal(rowsOf(group).length, 48)
})

test('sostituisce solo il blocco delimitato dai marcatori', () => {
  const markdown = `prima\n${markerStart('x')}\nvecchio\n${markerEnd('x')}\ndopo\n`
  const next = replaceBlock(markdown, 'x', '| # | Frase |\n| --- | --- |\n| 1 | Nuova |\n')

  assert.equal(
    next,
    `prima\n${markerStart('x')}\n| # | Frase |\n| --- | --- |\n| 1 | Nuova |\n${markerEnd('x')}\ndopo\n`,
  )
  assert.equal(extractBlock(next, 'x'), '| # | Frase |\n| --- | --- |\n| 1 | Nuova |')
})

test('la tabella generata ha 48 righe e la frase 6 è quella di controllo', () => {
  const table = renderGroupTable(copione, 'campidanese-frasi')
  const lines = table.trim().split('\n')
  assert.equal(lines.length, 50)
  assert.match(lines[7], /^\| 6 \| Sa x de Puxeddu no est sa sc de Pusceddu\. \|$/u)
})

test('il documento del progetto è allineato al copione', () => {
  assert.equal(isBlockCurrent(doc, copione, 'campidanese-frasi'), true)
})
