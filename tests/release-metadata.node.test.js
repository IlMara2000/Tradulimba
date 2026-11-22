import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  comparePixels,
  decodePng,
  downsampleNearest,
  findRasterizer,
  rasterizeSvg,
  readIcoFrames,
} from './helpers/raster.mjs'

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url))
const projectPath = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const SVG_SMALL = 'public/favicon-small.svg'
const SMALL_RENDER_SIZE = 512
const RASTERIZER = findRasterizer()
const hex = (rgb) => '#' + rgb.map((value) => value.toString(16).padStart(2, '0')).join('')

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

// Il confronto è pixel su pixel: se un altro rasterizzatore ha prodotto l'ICO,
// i pixel di anti-aliasing sugli angoli possono cambiare di uno o due valori.
// In quel caso si rigenerano le icone sulla stessa macchina e i due lati tornano
// coerenti, invece di allentare il confronto e perdere il controllo vero.
test('i frame 16 e 32 sono il raster del disegno piccolo, non del grande', {
  skip: RASTERIZER ? false : 'nessun rasterizzatore SVG nel PATH (rsvg-convert, resvg, inkscape, magick, qlmanage)',
}, () => {
  const frames = readIcoFrames(readProjectFile('public/favicon.ico'))
  const master = rasterizeSvg(projectPath(SVG_SMALL), SMALL_RENDER_SIZE)
  assert.equal(master.width, SMALL_RENDER_SIZE)

  for (const size of [16, 32]) {
    const frame = frames.find((candidate) => candidate.size === size)
    assert.ok(frame, `manca il frame ${size} px`)

    const found = decodePng(frame.png)
    assert.equal(found.width, size)
    const expected = downsampleNearest(master, size)
    const differences = comparePixels(expected, found)

    if (differences.length > 0) {
      const first = differences[0]
      assert.fail(
        `frame ${size} px: ${differences.length} pixel diversi dal raster di ${SVG_SMALL}; `
        + `il primo a (${first.x}, ${first.y}) atteso ${hex(first.expected)} trovato ${hex(first.found)}. `
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
