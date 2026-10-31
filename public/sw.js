/*
 * Kivii CRM service worker (minimaal).
 * - Cachet alleen statische, gehashte assets onder /build/ en /icons/ (cache-first, die bestanden veranderen nooit).
 * - Al het andere (HTML, Inertia-, Livewire- en API-verzoeken) gaat altijd rechtstreeks naar het netwerk en wordt
 *   nooit gecachet: geauthenticeerde inhoud blijft dus nooit op het apparaat achter.
 */
const CACHE = 'kivii-static-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('kivii-') && key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (!url.pathname.startsWith('/build/') && !url.pathname.startsWith('/icons/')) return;

    event.respondWith(
        caches.open(CACHE).then(async (cache) => {
            const cached = await cache.match(request);
            if (cached) return cached;
            const response = await fetch(request);
            if (response.ok && response.type === 'basic') cache.put(request, response.clone());
            return response;
        }),
    );
});
