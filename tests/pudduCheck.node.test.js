import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSnapshotUpdate,
  checkPudduForm,
  formatResult,
  formatUpdatePreview,
  lemmaParts,
  parseForms,
  parsePudduPage,
  pudduUrl,
} from '../src/features/linguistics/pudduCheck.js'

const FOUND = '<strong style="font-size: large;" >matéssi, matéssiu</strong>'
const FOUND_ONE = '<strong style="font-size: large;" >manèra</strong>'
const FOUND_NUMBERED = '<strong style="font-size: large;" >mercàtu 1, mercàu</strong>'
const ABSENT = '<p>Parola non trovata</p>'
const ERROR = '<title>Whoops! There was an error.</title>'

test('legge il lemma e le varianti dalla pagina del dizionario', () => {
  assert.deepEqual(parsePudduPage(FOUND), {
    status: 'found',
    lemma: 'matéssi',
    variants: ['matéssiu'],
    raw: 'matéssi, matéssiu',
    reason: null,
  })
  assert.deepEqual(parsePudduPage(FOUND_ONE), {
    status: 'found',
    lemma: 'manèra',
    variants: [],
    raw: 'manèra',
    reason: null,
  })
})

test('legge anche un lemma con numero di omonimia', () => {
  assert.deepEqual(parsePudduPage(FOUND_NUMBERED), {
    status: 'found',
    lemma: 'mercàtu',
    variants: ['mercàu'],
    raw: 'mercàtu 1, mercàu',
    reason: null,
  })
})

test('toglie il numero delle omonimie dalle varianti', () => {
  assert.deepEqual(lemmaParts('mercàtu 1, mercàu'), ['mercàtu', 'mercàu'])
  assert.deepEqual(lemmaParts('dí, día'), ['dí', 'día'])
  assert.deepEqual(lemmaParts('  '), [])
})

test('riconosce una forma assente e una pagina di errore', () => {
  assert.equal(parsePudduPage(ABSENT).status, 'absent')
  assert.equal(parsePudduPage(ABSENT).lemma, null)

  const broken = parsePudduPage(ERROR)
  assert.equal(broken.status, 'error')
  assert.match(broken.reason, /errore del dizionario/)

  assert.equal(parsePudduPage('<html>senza nulla</html>').status, 'error')
})

test('legge le forme da testo, con commenti e duplicati', () => {
  const input = `
    # forme di prova
    manèra, matessi
    matessi   # duplicato
    iscriiri
    s'agatat
  `
  assert.deepEqual(parseForms(input), ['manèra', 'matessi', 'iscriiri', "s'agatat"])
})

test('costruisce un URL codificato', () => {
  assert.equal(pudduUrl("s'agatat"), 'https://ditzionariu.nor-web.eu/it/faeddu/s%27agatat')
  assert.equal(pudduUrl(' manèra '), 'https://ditzionariu.nor-web.eu/it/faeddu/man%C3%A8ra')
})

test('formatta i tre esiti', () => {
  assert.equal(
    formatResult({ form: 'matessi', status: 'found', lemma: 'matéssi', variants: ['matéssiu'], raw: 'matéssi, matéssiu', reason: null }),
    'matessi: lemma matéssi (varianti: matéssiu)',
  )
  assert.equal(
    formatResult({ form: 'manèra', status: 'found', lemma: 'manèra', variants: [], raw: 'manèra', reason: null }),
    'manèra: lemma manèra',
  )
  assert.equal(
    formatResult({ form: 'pronuntziant', status: 'absent', lemma: null, variants: [], raw: null, reason: null }),
    'pronuntziant: assente («non trovata»)',
  )
  assert.equal(
    formatResult({ form: "s'agatat", status: 'error', lemma: null, variants: [], raw: null, reason: 'errore del dizionario' }),
    "s'agatat: non verificabile (errore del dizionario)",
  )
})

test('interroga il dizionario con un fetch iniettato', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init?.method })
    return { ok: true, status: 200, text: async () => FOUND }
  }

  const result = await checkPudduForm('matessi', { fetchImpl })
  assert.deepEqual(result, {
    form: 'matessi',
    status: 'found',
    lemma: 'matéssi',
    variants: ['matéssiu'],
    raw: 'matéssi, matéssiu',
    reason: null,
  })
  assert.deepEqual(calls, [{
    url: 'https://ditzionariu.nor-web.eu/it/faeddu/matessi',
    method: 'POST',
  }])
})

test('un errore HTTP o di rete non fa cadere il controllo', async () => {
  const httpError = await checkPudduForm('x', {
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
  })
  assert.equal(httpError.status, 'error')
  assert.match(httpError.reason, /HTTP 503/)

  const networkError = await checkPudduForm('x', {
    fetchImpl: async () => { throw new Error('offline') },
  })
  assert.equal(networkError.status, 'error')
  assert.match(networkError.reason, /rete: offline/)

  const empty = await checkPudduForm('', { fetchImpl: async () => ({ ok: true, status: 200, text: async () => '' }) })
  assert.equal(empty.status, 'error')
  assert.match(empty.reason, /forma vuota/)
})

test('aggiorna lo snapshot solo con le forme trovate, senza rimuovere nulla', () => {
  const snapshot = {
    fonte: 'Puddu',
    consultato: '2026-01-01',
    nota: 'prova',
    lemmi: {
      bidda: { lemma: 'bídha', varianti: ['vidha'], gruppo: 'noun', consultato: '2026-01-01' },
    },
  }
  /** @type {any[]} */
  const results = [
    { form: 'bidda', status: 'found', lemma: 'bídha', variants: [], raw: 'bídha', reason: null },
    { form: 'matessi', status: 'found', lemma: 'matéssi', variants: ['matéssiu'], raw: 'matéssi, matéssiu', reason: null },
    { form: 'pronuntziant', status: 'absent', lemma: null, variants: [], raw: null, reason: null },
    { form: "s'agatat", status: 'error', lemma: null, variants: [], raw: null, reason: 'errore del dizionario' },
  ]

  const built = buildSnapshotUpdate(snapshot, results, { today: '2026-11-26' })

  assert.equal(built.snapshot.consultato, '2026-11-26')
  assert.deepEqual(built.snapshot.lemmi.bidda, {
    lemma: 'bídha',
    varianti: ['vidha'],
    gruppo: 'noun',
    consultato: '2026-11-26',
  })
  assert.deepEqual(built.snapshot.lemmi.matessi, {
    lemma: 'matéssi, matéssiu',
    varianti: [],
    consultato: '2026-11-26',
  })
  assert.equal(built.snapshot.lemmi.pronuntziant, undefined)
  assert.equal(built.snapshot.lemmi["s'agatat"], undefined)
  assert.deepEqual(built.changes.map(({ form, action }) => ({ form, action })), [
    { form: 'bidda', action: 'updated' },
    { form: 'matessi', action: 'added' },
  ])
  assert.deepEqual(built.skipped.map(({ form }) => form), ['pronuntziant', "s'agatat"])
  // Lo snapshot di partenza non viene mutato.
  assert.equal(snapshot.lemmi.bidda.consultato, '2026-01-01')
  assert.equal(snapshot.lemmi.matessi, undefined)
})

test('l’anteprima distingue aggiunte, aggiornamenti e forme saltate', () => {
  const preview = formatUpdatePreview({
    changes: [
      { form: 'bidda', action: 'updated', lemma: 'bídha' },
      { form: 'matessi', action: 'added', lemma: 'matéssi, matéssiu' },
    ],
    skipped: [{ form: 'pronuntziant', status: 'absent', reason: null }],
  })
  assert.equal(preview, [
    '~ bidda: lemma bídha',
    '+ matessi: lemma matéssi, matéssiu',
    '= pronuntziant: assente',
  ].join('\n'))
})

test('avvisa quando il lemma del dizionario differisce da quello del lessico', () => {
  const snapshot = {
    consultato: '2026-01-01',
    lemmi: {
      bidda: { lemma: 'bídha', varianti: ['vidha'] },
      traballu: { lemma: 'trabàlliu, trabàllu', varianti: [] },
    },
  }
  const entries = [
    { srd: 'bidda', lemma: 'bídha', variants: ['vidha'] },
    { srd: 'traballu', lemma: 'trabàlliu', variants: ['trabàllu'] },
  ]
  /** @type {any[]} */
  const results = [
    { form: 'bidda', status: 'found', lemma: 'bídha', variants: [], raw: 'bídha', reason: null },
    { form: 'traballu', status: 'found', lemma: 'trabàlliu', variants: ['trabàllu'], raw: 'trabàlliu, trabàllu', reason: null },
  ]

  const built = buildSnapshotUpdate(snapshot, results, { today: '2026-11-26', entries })
  assert.deepEqual(built.warnings, [
    'traballu: il dizionario dice «trabàlliu, trabàllu», il lessico ha «trabàlliu»',
    'traballu: varianti del lessico assenti dallo snapshot: trabàllu',
  ])

  assert.deepEqual(
    buildSnapshotUpdate(snapshot, results, { today: '2026-11-26' }).warnings,
    [],
    'senza lessico non ci sono avvisi',
  )
})
