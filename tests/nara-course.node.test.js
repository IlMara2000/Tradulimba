import assert from 'node:assert/strict'
import test from 'node:test'
import { NARA_LEVEL_IDS, NARA_LEVELS } from '../src/features/nara/naraCourse.js'
import { NARA_LEVEL_IDS as NARA_CATALOG_IDS } from '../src/features/nara/naraCatalog.js'

test('il corso contiene 11 livelli ordinati e 4 sfide ciascuno', () => {
  assert.equal(NARA_LEVELS.length, 11)
  assert.equal(new Set(NARA_LEVEL_IDS).size, 11)
  assert.deepEqual(NARA_CATALOG_IDS, NARA_LEVEL_IDS)

  NARA_LEVELS.forEach((level, levelIndex) => {
    assert.equal(level.number, levelIndex + 1)
    assert.equal(level.questions.length, 4)
    assert.equal(new Set(level.questions.map(({ id }) => id)).size, 4)
  })
})

test('ogni sfida ha una sola risposta valida e una spiegazione', () => {
  for (const level of NARA_LEVELS) {
    for (const question of level.questions) {
      assert.ok(question.prompt.length > 0)
      assert.ok(question.options.length >= 3)
      assert.ok(Number.isInteger(question.answer))
      assert.ok(question.answer >= 0 && question.answer < question.options.length)
      assert.ok(question.note.length > 0)
    }
  }
})
