import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSardinian } from '../src/features/linguistics/index.js'
import { analyzeWord, splitWordSyllables } from '../src/features/linguistics/syllables.js'
import { transcribeWord } from '../src/features/linguistics/phonology.js'
import {
  analyzeOrthography,
  normalizeSardinian,
} from '../src/features/linguistics/orthography.js'
import { adaptToVariant, compareVarieties } from '../src/features/linguistics/varieties.js'

const syllables = (word) => splitWordSyllables(word).map((syllable) => syllable.text)

test('divide le parole sarde rispettando digrammi e geminate', () => {
  assert.deepEqual(syllables('domo'), ['do', 'mo'])
  assert.deepEqual(syllables('abba'), ['ab', 'ba'])
  assert.deepEqual(syllables('sedda'), ['sed', 'da'])
  assert.deepEqual(syllables('matessi'), ['ma', 'tes', 'si'])
  assert.deepEqual(syllables('iscola'), ['i', 'sco', 'la'])
  assert.deepEqual(syllables('cuadru'), ['cua', 'dru'])
  assert.deepEqual(syllables('cras'), ['cras'])
})

test('la scansione vocalica spiega gli esempi sdruccioli della norma', () => {
  assert.deepEqual(syllables('fìgiu'), ['fì', 'gi', 'u'])
  assert.deepEqual(syllables('màllia'), ['màl', 'li', 'a'])
  assert.deepEqual(syllables('campànnia'), ['cam', 'pàn', 'ni', 'a'])
  assert.deepEqual(syllables('provìntzia'), ['pro', 'vìn', 'tzi', 'a'])
  assert.deepEqual(syllables('istùdiu'), ['i', 'stù', 'di', 'u'])
  assert.deepEqual(syllables('gràtzias'), ['grà', 'tzi', 'as'])
  assert.deepEqual(syllables('faeddare'), ['fa', 'ed', 'da', 're'])
})

test('accento: obbligatorio su tronche e sdrucciole, assente sulle piane', () => {
  assert.equal(analyzeWord('domo').stressType, 'piana')
  assert.equal(analyzeWord('domo').accentCorrect, true)

  const figs = analyzeWord('fìgiu')
  assert.equal(figs.stressType, 'sdrucciola')
  assert.equal(figs.stressedIndex, 0)
  assert.equal(figs.accentCorrect, true)

  assert.equal(analyzeWord('tribù').stressType, 'tronca')
  assert.equal(analyzeWord('tribù').accentCorrect, true)
  assert.equal(analyzeWord('cras').stressType, 'monosillabo')
  assert.equal(analyzeWord('cras').accentCorrect, true)

  assert.equal(analyzeWord('dómo').accentCorrect, false)
})

test('trascrive in IPA i suoni caratteristici del sardo', () => {
  assert.equal(transcribeWord('domo', 'lsc').ipa, 'ˈdɔmo')
  assert.equal(transcribeWord('abba', 'lsc').ipa, 'ˈabba')
  assert.equal(transcribeWord('fìgiu', 'lsc').ipa, 'ˈfidʒu')
  assert.equal(transcribeWord('sedda', 'lsc').ipa, 'ˈseɖɖa')
  assert.equal(transcribeWord('petza', 'lsc').ipa, 'ˈpetsa')
  assert.equal(transcribeWord('chelu', 'lsc').ipa, 'ˈkelu')
  assert.equal(transcribeWord('gherra', 'lsc').ipa, 'ˈɡerra')
  assert.equal(transcribeWord('bìngia', 'lsc').ipa, 'ˈbindʒa')
  assert.equal(transcribeWord('màllia', 'lsc').ipa, 'ˈmaʎʎa')
  assert.equal(transcribeWord('campànnia', 'lsc').ipa, 'kamˈpaɲɲa')
  assert.equal(transcribeWord('gràtzias', 'lsc').ipa, 'ˈɡratsjas')
  assert.equal(transcribeWord('istùdiu', 'lsc').ipa, 'isˈtudju')
  assert.equal(transcribeWord('pische', 'lsc').ipa, 'ˈpiske')
})

test('il campidanese applica finali -u/-i e lenizione', () => {
  assert.equal(transcribeWord('domo', 'campidanese').ipa, 'ˈdɔmu')
  assert.equal(transcribeWord('meda', 'campidanese').ipa, 'ˈmeða')
  assert.equal(transcribeWord('abba', 'campidanese').ipa, 'ˈabba')
  assert.equal(transcribeWord('fìgiu', 'campidanese').ipa, 'ˈfidʒu')
})

test('la guida di lettura resta in grafia italiana', () => {
  assert.equal(transcribeWord('màllia', 'lsc').reading, 'màglia')
  assert.equal(transcribeWord('campànnia', 'lsc').reading, 'campàgnia')
  assert.equal(transcribeWord('petza', 'lsc').reading, 'pezza')
  assert.equal(transcribeWord('maju', 'lsc').reading, 'maiu')
  assert.equal(transcribeWord('casa', 'lsc').reading, 'cassa')
})

test('segnala accenti sbagliati, q e preposizione elisa', () => {
  const accent = analyzeOrthography('dómo est sa domo')
  assert.equal(accent[0].code, 'ACCENTO_INUTILE')
  assert.equal(accent[0].suggestion, 'domo')
  assert.equal(accent[0].reference, 'LSC §4.2.6')

  const q = analyzeOrthography('su quadru')
  assert.equal(q[0].code, 'GRAFEMA_Q')
  assert.equal(q[0].suggestion, 'cuadru')

  const elision = analyzeOrthography("su pane d'istiu")
  assert.equal(elision[0].code, 'ELISIONE_DE')
  assert.equal(elision[0].reference, 'LSC §4.2.3')

  const known = analyzeOrthography('su figiu est mannu')
  assert.equal(known[0].code, 'ACCENTO_MANCANTE')
  assert.equal(known[0].suggestion, 'fìgiu')

  const doubled = analyzeOrthography('pizza')
  assert.equal(doubled[0].code, 'GRAFEMA_DOPPIA')
  assert.equal(doubled[0].reference, 'LSC §4.2.4')
})

test('segnala un possibile italianismo senza riscrivere il testo', () => {
  const issues = analyzeOrthography('grazie pro su pane')
  assert.equal(issues[0].code, 'ITALIANISMO')
  assert.equal(issues[0].suggestion, 'gràtzias')
  assert.equal(issues[0].severity, 'info')
})

test('normalizza solo le forme non ambigue', () => {
  assert.deepEqual(
    normalizeSardinian('su quadru e sa glia').text,
    'su cuadru e sa llia',
  )
  assert.equal(normalizeSardinian('petza e binu').text, 'petza e binu')
  assert.equal(normalizeSardinian('Qatar').text, 'Qatar')
  assert.equal(normalizeSardinian('organizare').text, 'organizare')
})

test('adatta il campidanese con regole dichiarate', () => {
  const result = adaptToVariant('Sos domos sunt mannas', 'campidanese')
  assert.equal(result.text, 'Is domus sunt mannas')
  assert.ok(result.changes.some((change) => change.from === 'Sos' && change.to === 'Is'))

  assert.equal(adaptToVariant('Deo so in domo', 'campidanese').text, 'Deu so in domu')
  assert.equal(adaptToVariant('Sas féminas andant a sa pratza', 'campidanese').text, 'Is féminas andant a sa pratza')
  assert.equal(adaptToVariant('Bonas dies, comente istas?', 'campidanese').text, 'Bonas dies, comenti istas?')
  assert.equal(adaptToVariant('Sos domos', 'logudorese').text, 'Sos domos')
})

test('analizza una frase completa con IPA, sillabe e note', () => {
  const analysis = analyzeSardinian('Sas domos sunt mannas', { variant: 'lsc' })

  assert.equal(analysis.variant, 'lsc')
  assert.equal(analysis.ipa, 'sas ˈdɔmos sunt ˈmannas')
  assert.equal(analysis.words.length, 4)
  assert.deepEqual(analysis.words[1].syllables, ['do', 'mos'])
  assert.equal(analysis.words[1].stressedIndex, 0)
  assert.equal(analysis.truncated, false)
  assert.equal(analysis.issueCounts.errors, 0)
  assert.ok(analysis.notes.some((note) => /sas domos/i.test(note)))
})

test('il confronto tra varietà restituisce sempre le tre forme', () => {
  const comparison = compareVarieties('Sos domos sunt mannas')
  assert.deepEqual(comparison.map((entry) => entry.id), ['lsc', 'campidanese', 'logudorese'])
  assert.equal(comparison[1].text, 'Is domus sunt mannas')
})
