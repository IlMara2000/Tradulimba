import assert from 'node:assert/strict'
import test from 'node:test'
import { GLOSSARY_ENTRIES, GLOSSARY_REFERENCE } from '../src/features/translation/glossaryData.js'
import { NARA_LEVELS } from '../src/features/nara/naraCourse.js'

const questionsById = new Map(
  NARA_LEVELS.flatMap((level) => level.questions.map((question) => [question.id, { level, question }])),
)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Stessa regola usata dal glossario: \b non regge le lettere accentate del sardo.
const attests = (material, term) => new RegExp(
  `(^|[^\\p{L}])${escapeRegExp(term).replace(/\s+/g, '\\s+')}([^\\p{L}]|$)`,
  'iu',
).test(material)

const questionMaterial = (question) => [question.prompt, question.note, ...question.options]
  .filter(Boolean)
  .join(' ')

// Parole troppo comuni per dire qualcosa sulla coerenza di una nota: se due note
// condividono solo queste, la nota del glossario non è ancorata a quella del corso.
const STOPWORDS = new Set([
  'anche', 'che', 'chi', 'come', 'con', 'dei', 'del', 'degli', 'della', 'delle',
  'dello', 'dopo', 'forma', 'fra', 'gli', 'lei', 'lui', 'molto', 'nella', 'nelle',
  'nello', 'non', 'per', 'perche', 'percio', 'piu', 'quando', 'quella', 'quello',
  'questa', 'queste', 'questi', 'questo', 'significa', 'sono', 'sua', 'sui', 'suo',
  'tra', 'una', 'uno', 'vale',
])

const contentWords = (text) => new Set(
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word)),
)

const sharedWords = (left, right) => {
  const rightWords = contentWords(right)
  return [...contentWords(left)].filter((word) => rightWords.has(word))
}

test('ogni voce ha un termine, una forma sarda e una provenienza', () => {
  assert.ok(GLOSSARY_ENTRIES.length > 0)
  assert.match(GLOSSARY_REFERENCE, /\S/)

  const seen = new Map()
  for (const entry of GLOSSARY_ENTRIES) {
    for (const field of ['it', 'srd', 'level', 'question']) {
      assert.equal(typeof entry[field], 'string', `${entry.it}: campo ${field} mancante`)
      assert.ok(entry[field].trim(), `${entry.it}: campo ${field} vuoto`)
    }
    if (entry.note !== undefined) {
      assert.equal(typeof entry.note, 'string', `${entry.it}: nota non testuale`)
      assert.ok(entry.note.trim(), `${entry.it}: nota vuota`)
    }

    const key = entry.it.toLocaleLowerCase('it')
    assert.equal(seen.has(key), false, `voce duplicata: ${entry.it}`)
    seen.set(key, entry)
  }
})

test('la provenienza punta a una domanda della lezione indicata', () => {
  for (const entry of GLOSSARY_ENTRIES) {
    const source = questionsById.get(entry.question)
    assert.ok(source, `${entry.it}: la domanda ${entry.question} non esiste nel corso`)
    assert.equal(
      source.level.id,
      entry.level,
      `${entry.it}: la domanda ${entry.question} appartiene a ${source.level.id}, non a ${entry.level}`,
    )
  }
})

test('la forma sarda è attestata nel materiale della domanda indicata', () => {
  for (const entry of GLOSSARY_ENTRIES) {
    const { question } = questionsById.get(entry.question)
    assert.ok(
      attests(questionMaterial(question), entry.srd),
      `${entry.it}: “${entry.srd}” non compare in ${entry.question}`,
    )
  }
})

test('le note del glossario restano ancorate alla nota del corso', () => {
  const noted = GLOSSARY_ENTRIES.filter((entry) => entry.note)

  for (const entry of noted) {
    const { question } = questionsById.get(entry.question)

    assert.ok(question.note, `${entry.it}: ${entry.question} non ha una nota del corso a cui appoggiarsi`)
    assert.ok(
      sharedWords(entry.note, question.note).length > 0,
      `${entry.it}: la nota «${entry.note}» non riprende nulla dalla nota del corso «${question.note}»`,
    )
  }
})

test('nessuna voce usa una forma sarda inventata fuori dal corso', () => {
  const courseMaterial = [
    ...NARA_LEVELS.flatMap((level) => [
      ...(level.dialogue || []).map(([, line]) => line),
      ...level.questions.map(questionMaterial),
    ]),
    ...NARA_LEVELS.map((level) => level.objective),
    ...NARA_LEVELS.map((level) => level.title),
  ].join(' ')

  for (const entry of GLOSSARY_ENTRIES) {
    assert.ok(
      attests(courseMaterial, entry.srd),
      `${entry.it}: “${entry.srd}” non compare in nessuna lezione`,
    )
  }
})
