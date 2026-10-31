/*
 * Kivii CRM service worker (minimaal).
 * - /build/: gehashte Vite-assets, cache-first (een bestandsnaam verandert mee met de inhoud).
 * - /icons/: vaste bestandsnamen, dus stale-while-revalidate: direct uit de cache, op de achtergrond vernieuwd.
 *   Een nieuw icoon is daardoor bij de volgende keer laden zichtbaar.
 * - Al het andere (HTML, Inertia-, Livewire- en API-verzoeken) gaat altijd rechtstreeks naar het netwerk en wordt
 *   nooit gecachet: geauthenticeerde inhoud blijft dus nooit op het apparaat achter.
 * Verhoog de versie in CACHE als de cache-opzet verandert; bij activeren worden oudere kivii-caches verwijderd.
 */
const CACHE = 'kivii-static-v2';

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
