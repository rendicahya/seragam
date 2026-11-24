// Dimuat ke service worker lewat workbox.importScripts (vite.config.ts).
// Harus sama dengan PUSH_API di src/lib/push-config.ts.
const PUSH_API = 'https://seragam-push.rendicahya.workers.dev';

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pakai seragam apa hari ini?', {
      body: data.body || '',
      tag: data.tag || 'seragam',
      // Pengingat pagi memakai tag yang sama dengan pengingat malam sebelumnya; tanpa ini
      // penggantiannya terjadi diam-diam (tanpa bunyi/getar) jika notifikasi malam belum ditutup.
      renotify: true,
      icon: 'icons/icon-192.png',
      // Foto seragam; ditampilkan besar di Android, diabaikan di browser yang tidak mendukung.
      ...(data.image && { image: data.image }),
      lang: 'id',
      data: { url: data.url || self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })(),
  );
});

// Browser kadang mengganti langganan push; daftarkan yang baru agar pengingat tetap sampai.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription?.options;
      const subscription =
        event.newSubscription || (options ? await self.registration.pushManager.subscribe(options) : null);
      if (!subscription) return;
      await fetch(`${PUSH_API}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, replaces: event.oldSubscription?.endpoint }),
      });
    })(),
  );
});
