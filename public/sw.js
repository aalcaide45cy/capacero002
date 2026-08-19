/**
 * Capa Cero 3D - Service Worker & Web Push Engine
 * Version: 2.0.0
 */

const CACHE_NAME = 'capacero-pwa-v2.0';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-emblem.webp',
  '/logo-capa-cero.webp'
];

// 1. Instalación del Service Worker y Precache de assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache parcial en SW:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Fetch: Network-First con fallback a cache
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET de mismo origen
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // No cachear llamadas a APIs dinámicas, YouTube embeds o Google Sheets
  if (
    url.origin !== location.origin ||
    url.pathname.startsWith('/api') ||
    url.search.includes('timestamp=')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// =========================================================================
// 🔔 4. RECEPTOR NATIVO DE NOTIFICACIONES PUSH (VAPID)
// =========================================================================
const GOOGLE_SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg/exec';

self.addEventListener('push', (event) => {
  let getDataPromise;

  if (event.data) {
    try {
      const payload = event.data.json();
      getDataPromise = Promise.resolve(payload);
    } catch (e) {
      try {
        getDataPromise = Promise.resolve({ body: event.data.text() });
      } catch (err) {
        getDataPromise = Promise.resolve({});
      }
    }
  } else {
    // Si el push se envió como ping VAPID directo sin cifrado, consultar última notificación de Google Sheets
    getDataPromise = fetch(GOOGLE_SHEETS_WEBHOOK + '?action=latest_notification')
      .then((res) => res.json())
      .catch(() => ({
        title: 'Capa Cero 3D',
        body: '¡Nuevo tutorial o actualización disponible en la academia!',
        url: 'https://www.capacero3d.com'
      }));
  }

  event.waitUntil(
    getDataPromise.then((data) => {
      const finalTitle = data.title || 'Capa Cero 3D';
      const notificationOptions = {
        body: data.body || '¡Nuevo tutorial o actualización disponible en la academia!',
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        image: data.image || undefined,
        data: {
          url: data.url || 'https://www.capacero3d.com'
        },
        tag: 'capacero-notification-' + (data.timestamp || Date.now()),
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 300]
      };

      return self.registration.showNotification(finalTitle, notificationOptions);
    })
  );
});

// =========================================================================
// 👆 5. CLIC EN LA NOTIFICACIÓN
// =========================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta, enfocarla y redirigir
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Si no está abierta, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
