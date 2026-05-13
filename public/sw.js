const CACHE = 'celox-v1'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Network-first for same-origin GET requests; skip Supabase API calls
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return
  if (e.request.url.includes('supabase.co')) return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// Push notifications
self.addEventListener('push', e => {
  let data = { title: 'Celox AI', body: 'יש פעילות חדשה בצי שלך' }
  try { if (e.data) Object.assign(data, e.data.json()) } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/Gemini_Generated_Image_46ku0t46ku0t46ku.png',
      badge: '/Gemini_Generated_Image_46ku0t46ku0t46ku.png',
      data,
      dir:  'rtl',
      lang: 'he',
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: 'window' }).then(windows => {
    const existing = windows.find(w => w.url.includes(self.location.origin))
    if (existing) return existing.focus()
    return clients.openWindow(e.notification.data?.url || '/')
  }))
})
