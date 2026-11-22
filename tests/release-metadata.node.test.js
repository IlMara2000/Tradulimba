import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  colourCounts,
  compareWithOutlineTolerance,
  componentsWhere,
  decodePng,
  downsampleNearest,
  findRasterizer,
  rasterizeSvg,
  readIcoFrames,
  rgbToHex,
} from './helpers/raster.mjs'

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url))
const projectPath = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const SVG_SMALL = 'public/favicon-small.svg'
const SMALL_RENDER_SIZE = 512
const RASTERIZER = findRasterizer()
// In CI (REQUIRE_RASTERIZER=1) l'assenza di un rasterizzatore è un errore, non
// uno skip: il confronto coi frame non deve poter passare per mancanza di mezzi.
const REQUIRE_RASTERIZER = process.env.REQUIRE_RASTERIZER === '1'
const hex = rgbToHex

test('metadati social e CSP restano sincronizzati', () => {
  const html = readProjectFile('index.html').toString('utf8')
  const vercel = readProjectFile('vercel.json').toString('utf8')
  const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]

  assert.ok(structuredData)
  assert.doesNotThrow(() => JSON.parse(structuredData))
  const hash = createHash('sha256').update(structuredData).digest('base64')
  assert.match(vercel, new RegExp(`sha256-${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  assert.match(html, /<link rel="canonical" href="https:\/\/tradulimba\.space\/"/)
  assert.match(html, /tradulimba-social\.png/)
})

test('la card social ha dimensioni Open Graph 1200 × 630', () => {
  const image = readProjectFile('public/tradulimba-social.png')
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG')
  assert.equal(image.readUInt32BE(16), 1200)
  assert.equal(image.readUInt32BE(20), 630)
})

test('i PNG del logo sono generati a risoluzione nativa, non scalati', () => {
  const sizes = [
    ['public/favicon-96x96.png', 96],
    ['public/web-app-manifest-192x192.png', 192],
    ['public/web-app-manifest-512x512.png', 512],
    ['public/apple-touch-icon.png', 180],
  ]
  for (const [file, expected] of sizes) {
    const image = readProjectFile(file)
    assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG')
    assert.equal(image.readUInt32BE(16), expected, `${file} width`)
    assert.equal(image.readUInt32BE(20), expected, `${file} height`)
  }
})

test('l’SVG del favicon è vettoriale e aggiornato', () => {
  const svg = readProjectFile('public/favicon.svg').toString('utf8')
  assert.match(svg, /<svg/)
  assert.match(svg, /viewBox="0 0 128 128"/)
  assert.match(svg, /<rect/)
  assert.match(svg, /<path/)
  assert.match(svg, /<rect.*height="22"/)
  assert.match(svg, /<circle.*r="5"/)
})

test('il favicon.ico contiene i frame 16, 32, 48 e 64 px', () => {
  const ico = readProjectFile('public/favicon.ico')
  assert.equal(ico.readUInt16LE(0), 0, 'riservato')
  assert.equal(ico.readUInt16LE(2), 1, 'tipo icona')

  const count = ico.readUInt16LE(4)
  const frames = []
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16
    const width = ico[entry] || 256
    const height = ico[entry + 1] || 256
    const bytes = ico.readUInt32LE(entry + 8)
    const offset = ico.readUInt32LE(entry + 12)

    assert.equal(width, height, `frame ${width}×${height} non quadrato`)
    assert.ok(offset + bytes <= ico.length, `frame ${width} px troncato`)

    // Ogni frame è un PNG: il suo IHDR deve dichiarare la stessa taglia della voce.
    const payload = ico.subarray(offset, offset + bytes)
    assert.equal(payload.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `frame ${width} senza firma PNG`)
    assert.equal(payload.subarray(12, 16).toString('ascii'), 'IHDR')
    assert.equal(payload.readUInt32BE(16), width, `frame ${width} con IHDR ${payload.readUInt32BE(16)}`)
    assert.equal(payload.readUInt32BE(20), height)

    frames.push(width)
  }

  for (const size of [16, 32, 48, 64]) {
    assert.ok(frames.includes(size), `manca il frame ${size} px (trovati: ${frames.join(', ')})`)
  }
})

// Colori del disegno piccolo: fondo, nuvoletta e le quattro barre.
const SMALL_PALETTE = ['#2a6684', '#4b7721', '#eef0f2', '#f4aa0a', '#f58214', '#ffffff']
const SMALL_LIGHTS = new Set(['#eef0f2', '#ffffff'])
const SMALL_BARS = ['#4b7721', '#f4aa0a', '#f58214', '#2a6684']

// Controlli che leggono solo i pixel dell'ICO: valgono anche dove non c'è un
// rasterizzatore SVG, e colgono il caso «icone rigenerate dal disegno grande»
// perché quel render è sfumato (centinaia di colori) e ha il punto arancione
// staccato sopra le barre.
test('i frame 16 e 32 hanno la palette del disegno piccolo e nessun punto', () => {
  const frames = readIcoFrames(readProjectFile('public/favicon.ico'))

  for (const size of [16, 32]) {
    const frame = frames.find((candidate) => candidate.size === size)
    assert.ok(frame, `manca il frame ${size} px`)
    const image = decodePng(frame.png)
    assert.equal(image.width, size)

    const colours = [...colourCounts(image).keys()].sort()
    assert.deepEqual(
      colours,
      SMALL_PALETTE,
      `frame ${size} px: ${colours.length} colori invece di 6 — un raster sfumato del disegno grande ne porta centinaia`,
    )

    const bars = componentsWhere(image, (rgb) => !SMALL_LIGHTS.has(rgbToHex(rgb)))
    assert.equal(
      bars.length,
      4,
      `frame ${size} px: ${bars.length} componenti colorate invece di 4 — un quinto pezzo è il punto arancione del disegno grande`,
    )

    const ordered = bars.sort((left, right) => left.left - right.left)
    assert.deepEqual(
      ordered.map((bar) => bar.colour),
      SMALL_BARS,
      `frame ${size} px: le barre non hanno l'ordine di colore del disegno piccolo`,
    )

    const baseline = ordered[0].bottom
    for (const bar of ordered) {
      assert.equal(bar.bottom, baseline, `frame ${size} px: la barra ${bar.colour} non finisce sulla stessa riga delle altre`)
    }
  }
})

// Il confronto è pixel su pixel, con una sola eccezione dichiarata: gli angoli
// della nuvoletta, dove l'anti-aliasing di un rasterizzatore può far cadere il
// bordo sul fondo invece che sul bianco (o viceversa). Quelle differenze sono
// contate e ammesse entro un margine stretto; qualunque differenza che tocchi
// una barra, il punto o un colore estraneo resta un errore, anche su un solo
// pixel. Così la CI (macos-latest, qlmanage di un'altra versione di macOS) non
// diventa rossa per un angolo, ma un ICO rigenerato dal disegno grande o
// ridisegnato continua a fallire.
// Quanti pixel di bordo possono differire per anti-aliasing: una manciata sugli
// angoli della nuvoletta, non un contorno ridisegnato.
const OUTLINE_TOLERANCE = (size) => Math.max(2, Math.round(size * size * 0.02))

test('il confronto diretto tollera il bordo antialiasato e niente altro', () => {
  const image = (rows) => ({
    width: rows[0].length,
    height: rows.length,
    channels: 3,
    pixels: Buffer.from(rows.flatMap(
      (row) => row.flatMap((colour) => [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16))),
    )),
  })

  const base = [['#eef0f2', '#ffffff'], ['#ffffff', '#ffffff']]
  const cornerShifted = [['#ffffff', '#ffffff'], ['#ffffff', '#ffffff']]
  const tolerated = compareWithOutlineTolerance(image(base), image(cornerShifted), SMALL_LIGHTS)
  assert.deepEqual(tolerated.fatal, [])
  assert.equal(tolerated.outline.length, 1)

  const barMoved = [['#eef0f2', '#4b7721'], ['#ffffff', '#ffffff']]
  const fatal = compareWithOutlineTolerance(image(base), image(barMoved), SMALL_LIGHTS)
  assert.equal(fatal.fatal.length, 1)
  assert.equal(fatal.outline.length, 0)
})

test('i frame 16 e 32 sono il raster del disegno piccolo, non del grande', {
  skip: RASTERIZER || REQUIRE_RASTERIZER
    ? false
    : 'nessun rasterizzatore SVG nel PATH (rsvg-convert, resvg, inkscape, magick, qlmanage)',
}, () => {
  if (!RASTERIZER) {
    assert.fail(
      'REQUIRE_RASTERIZER=1 ma nel PATH non c\'è nessun rasterizzatore SVG '
      + '(rsvg-convert, resvg, inkscape, magick, qlmanage): il confronto dei frame non può essere saltato',
    )
  }

  const frames = readIcoFrames(readProjectFile('public/favicon.ico'))
  const master = rasterizeSvg(projectPath(SVG_SMALL), SMALL_RENDER_SIZE)
  assert.equal(master.width, SMALL_RENDER_SIZE)

  for (const size of [16, 32]) {
    const frame = frames.find((candidate) => candidate.size === size)
    assert.ok(frame, `manca il frame ${size} px`)

    const found = decodePng(frame.png)
    assert.equal(found.width, size)
    const expected = downsampleNearest(master, size)
    const { fatal, outline } = compareWithOutlineTolerance(expected, found, SMALL_LIGHTS)

    if (outline.length > 0) {
      const first = outline[0]
      console.log(
        `frame ${size} px: ${outline.length} pixel di bordo diversi per anti-aliasing `
        + `(primo a (${first.x}, ${first.y}): atteso ${hex(first.expected)}, trovato ${hex(first.found)})`,
      )
    }
    assert.ok(
      outline.length <= OUTLINE_TOLERANCE(size),
      `frame ${size} px: ${outline.length} pixel di bordo diversi, oltre il margine di anti-aliasing `
      + `(${OUTLINE_TOLERANCE(size)}): il disegno o il rasterizzatore sono cambiati. `
      + 'Rilancia python3 scripts/generate-icons.py sulla stessa macchina che genera l’ICO.',
    )

    if (fatal.length > 0) {
      const first = fatal[0]
      assert.fail(
        `frame ${size} px: ${fatal.length} pixel diversi dal raster di ${SVG_SMALL} fuori dal bordo `
        + `antialiasato; il primo a (${first.x}, ${first.y}) atteso ${hex(first.expected)} trovato ${hex(first.found)}. `
        + 'Il frame è stato generato da un altro disegno: rilancia python3 scripts/generate-icons.py.',
      )
    }
  }
})

test('manifest e hosting descrivono la release stabile senza catch-all', () => {
  const manifest = JSON.parse(readProjectFile('public/site.webmanifest').toString('utf8'))
  const vercel = JSON.parse(readProjectFile('vercel.json').toString('utf8'))
  const serviceWorker = readProjectFile('public/sw.js').toString('utf8')
  const releaseCopy = [
    readProjectFile('src/App.jsx').toString('utf8'),
    readProjectFile('README.md').toString('utf8'),
    readProjectFile('.env.example').toString('utf8'),
  ].join('\n')

  assert.equal(manifest.id, '/')
  assert.ok(manifest.icons.some(({ sizes }) => sizes === '192x192'))
  assert.ok(manifest.icons.some(({ sizes }) => sizes === '512x512'))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.display_override, undefined)
  assert.match(serviceWorker, /html\.matchAll\([^\n]+\\\/assets\\\//)
  assert.deepEqual(vercel.rewrites, [
    { source: '/corvoc/rec', destination: '/corvoc/rec/index.html' },
    { source: '/corvoc/rec/', destination: '/corvoc/rec/index.html' },
    { source: '/api/script', destination: '/api/corvoc/script' },
    { source: '/api/record', destination: '/api/corvoc/record' },
    { source: '/api/audio', destination: '/api/corvoc/audio' },
    { source: '/api/report', destination: '/api/corvoc/report' },
    { source: '/', destination: '/index.html' },
  ])
  assert.ok(vercel.rewrites.every(({ source }) => !source.includes(':path') && !source.includes('(.*)')))
  const permissions = vercel.headers
    .flatMap(({ headers }) => headers)
    .find(({ key }) => key === 'Permissions-Policy')
  assert.match(permissions.value, /microphone=\(self\)/)
  assert.doesNotMatch(releaseCopy, /\b(beta|prototipo)\b/i)
})
