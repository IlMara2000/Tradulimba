const CACHE_NAME = 'tradulimba-v6'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
]

const cacheResponse = async (request, response) => {
  if (!response?.ok) return response

  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())
  return response
}

const networkFirst = async (request, fallback) => {
  try {
    return await cacheResponse(request, await fetch(request))
  } catch {
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : undefined)
  }
}

const cacheFirst = async (request) => {
  const cached = await caches.match(request)
  if (cached) return cached

  return cacheResponse(request, await fetch(request))
}

const precacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(STATIC_ASSETS)

  const response = await fetch('/index.html', { cache: 'no-store' })
  if (!response.ok) return

  const html = await response.text()
  const hashedAssets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)]
    .map((match) => match[1])

  await cache.addAll([...new Set(hashedAssets)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell()
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (!STATIC_ASSETS.includes(url.pathname)) return

  event.respondWith(networkFirst(request))
})
