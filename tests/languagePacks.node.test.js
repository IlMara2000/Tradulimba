import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_LANGUAGE_CODES,
  LANGUAGE_PACK_STORAGE_KEY,
  OPTIONAL_LANGUAGE_PACKS,
  getLanguagePack,
  languageHtmlTag,
  languageLabel,
  loadInstalledLanguages,
  normalizeInstalledLanguages,
  saveInstalledLanguages,
  setLanguageInstalled,
} from '../src/features/translation/languagePacks.js'

const memoryStorage = () => {
  const values = new Map()
  return {
    get length() { return values.size },
    clear: () => { values.clear() },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('italiano e sardo restano sempre installati', () => {
  assert.deepEqual(DEFAULT_LANGUAGE_CODES, ['ita', 'srd'])
  assert.deepEqual(normalizeInstalledLanguages(['eng', 'xyz', 'srd']), ['ita', 'srd', 'eng'])
  assert.deepEqual(
    setLanguageInstalled(['ita', 'srd', 'eng'], 'ita', false),
    ['ita', 'srd', 'eng'],
    'una lingua obbligatoria non si rimuove',
  )
})

test('installa e rimuove le lingue facoltative', () => {
  const installed = setLanguageInstalled(['ita', 'srd'], 'jpn', true)
  assert.deepEqual(installed, ['ita', 'srd', 'jpn'])
  assert.deepEqual(setLanguageInstalled(installed, 'jpn', false), ['ita', 'srd'])
  assert.deepEqual(setLanguageInstalled(installed, 'spa', true), ['ita', 'srd', 'spa', 'jpn'])
})

test('include inglese, spagnolo, giapponese e le lingue più tradotte', () => {
  const codes = OPTIONAL_LANGUAGE_PACKS.map((pack) => pack.code)
  for (const code of ['eng', 'spa', 'jpn', 'fra', 'deu', 'por', 'rus', 'ara', 'zho', 'kor', 'hin', 'tur']) {
    assert.ok(codes.includes(code), `manca ${code}`)
  }
  assert.equal(languageLabel('eng'), 'Inglese')
  assert.equal(languageHtmlTag('jpn'), 'ja')
  assert.equal(getLanguagePack('srd')?.required, true)
  assert.equal(getLanguagePack('sconosciuta'), null)
})

test('salva e rilegge le lingue installate', () => {
  const storage = memoryStorage()
  assert.deepEqual(loadInstalledLanguages(storage), ['ita', 'srd'])
  assert.equal(saveInstalledLanguages(['ita', 'srd', 'eng'], storage), true)
  assert.deepEqual(loadInstalledLanguages(storage), ['ita', 'srd', 'eng'])
  assert.deepEqual(JSON.parse(storage.getItem(LANGUAGE_PACK_STORAGE_KEY)), ['ita', 'srd', 'eng'])
})

test('un dato corrotto non rompe il caricamento', () => {
  const storage = memoryStorage()
  storage.setItem(LANGUAGE_PACK_STORAGE_KEY, '{non-json')
  assert.deepEqual(loadInstalledLanguages(storage), ['ita', 'srd'])
})
