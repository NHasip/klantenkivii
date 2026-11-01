/*
 * Kivii CRM service worker (minimaal).
 * - /build/: gehashte Vite-assets, cache-first (een bestandsnaam verandert mee met de inhoud).
 * - /icons/: vaste bestandsnamen, dus stale-while-revalidate: direct uit de cache, op de achtergrond vernieuwd.
 *   Een nieuw icoon is daardoor bij de volgende keer laden zichtbaar.
 * - Al het andere (HTML, Inertia-, Livewire- en API-verzoeken) gaat altijd rechtstreeks naar het netwerk en wordt
 *   nooit gecachet: geauthenticeerde inhoud blijft dus nooit op het apparaat achter.
 * - Pushmeldingen: 'push' toont de melding, 'notificationclick' opent of focust het CRM op de bijbehorende pagina.
 * Verhoog de versie in CACHE als de cache-opzet verandert; bij activeren worden oudere kivii-caches verwijderd.
 */
const CACHE = 'kivii-static-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('kivii-') && key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

const fetchAndStore = (request) =>
    caches.open(CACHE).then(async (cache) => {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
    });

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith('/build/')) {
        event.respondWith(caches.match(request, { cacheName: CACHE }).then((cached) => cached || fetchAndStore(request)));
        return;
    }

    if (url.pathname.startsWith('/icons/')) {
        const network = fetchAndStore(request);
        event.waitUntil(network.catch(() => undefined));
        event.respondWith(caches.match(request, { cacheName: CACHE }).then((cached) => cached || network));
    }
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { body: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'Kivii CRM';
    const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-192.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        data: { url: data.url || '/dashboard' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const raw = (event.notification.data && event.notification.data.url) || '/dashboard';
    let target;
    try {
        target = new URL(raw, self.location.origin);
        if (target.origin !== self.location.origin) target = new URL('/dashboard', self.location.origin);
    } catch (e) {
        target = new URL('/dashboard', self.location.origin);
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
            const same = clientList.find((client) => client.url === target.href);
            if (same && 'focus' in same) return same.focus();

            const existing = clientList.find((client) => new URL(client.url).origin === self.location.origin);
            if (existing && 'focus' in existing) {
                try {
                    if ('navigate' in existing) await existing.navigate(target.href);
                } catch (e) {
                    // Navigeren kan mislukken (bijv. niet-gecontroleerde client); dan alleen focussen.
                }
                return existing.focus();
            }

            return self.clients.openWindow ? self.clients.openWindow(target.href) : undefined;
        }),
    );
});
