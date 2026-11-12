import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url))

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
