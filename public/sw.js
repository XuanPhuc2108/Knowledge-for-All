const CACHE_PREFIX = 'knowledge-for-all-shell-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const APP_SHELL = ['/', '/manifest.webmanifest', '/pwa-icon.svg', '/pwa-icon-maskable.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/functions/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || /\.(?:css|js|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })),
    )
  }
})
