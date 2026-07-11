// Service Worker for CryptoTrader Pro
// Version: 7 (bump this number every time you push update)
// Auto-update: network-first strategy, skipWaiting, clients.claim

const CACHE_VERSION = '7'
const CACHE_NAME = `crypto-trader-pro-v${CACHE_VERSION}`
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.svg']

// Install event — cache static assets + skip waiting (auto-update)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate event — clean ALL old caches + claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL caches that don't match current version
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event — NETWORK-FIRST for everything (always get latest)
// Only fall back to cache if network fails
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip cross-origin requests (Binance, CoinGecko, Telegram)
  if (url.origin !== self.location.origin) return

  // Network-first for ALL requests (static + API)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline fallback
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/')
        })
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: data.tag || 'crypto-alert',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'CryptoTrader Alert', options)
    )
  } catch (err) {
    console.error('Push notification error:', err)
  }
})

// Notification click — focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

// Message handler — allow page to trigger update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
