/**
 * Gedeelde app-shell-hulpjes voor alle layouts (Inertia via app.jsx, Livewire/Blade via app.js; beide laden bootstrap.js).
 * Als module draait dit na het klassieke @livewireScripts-script.
 *
 * - Verlopen sessie/CSRF bij Livewire (419/401): geen native "This page has expired"-venster, maar een volledige
 *   herlaadactie (verlopen sessie komt dan op het inlogscherm uit).
 * - Terug naar de app na lang in de achtergrond (> 30 min): pagina herladen zodat sessie- en CSRF-token vers zijn.
 * - Eigen axios-verzoeken (bijv. Taken): bij 419 eerst een vers CSRF-token ophalen en een keer opnieuw proberen;
 *   blijft het 419 of is het 401 (sessie verlopen), dan herladen (naar het inlogscherm).
 * - --kivii-header-h: echte hoogte van de sticky kopbalk (2FA-banner, notch), voor sticky tops en scroll-padding-top.
 */

import axios from 'axios';

const RELOAD_KEY = 'kivii-reload-at';
const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Volledig herladen. Geen herlaadlus: als deze pagina zelf net door zo'n herlaadactie is geopend (binnen 1s na de
 * vorige) en nog geen 10s open is, wordt niet opnieuw herladen (false); de aanroeper valt dan terug op het standaardgedrag.
 */
export function kiviiReload(url = null) {
    try {
        const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
        const loadedAt = window.performance?.timeOrigin || Date.now();
        // Deze pagina heeft al een herlaadactie gestart (bijv. twee mislukte verzoeken tegelijk): niets meer doen.
        if (last > loadedAt) return true;
        if (last && loadedAt - last < 1000 && Date.now() - loadedAt < 10000) return false;
        window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch (e) {
        // sessionStorage niet beschikbaar (privémodus): gewoon herladen.
    }
    if (url && url !== window.location.href) {
        window.location.href = url;
    } else {
        window.location.reload();
    }
    return true;
}

window.kiviiReload = kiviiReload;

// Livewire: 419 (CSRF/sessie verlopen) en 401 stil afhandelen met een herlaadactie.
function registerLivewireHooks() {
    const Livewire = window.Livewire;
    if (!Livewire || typeof Livewire.hook !== 'function' || window.__kiviiLivewireHooks) return;
    window.__kiviiLivewireHooks = true;
    Livewire.hook('request', ({ fail }) => {
        fail(({ status, preventDefault }) => {
            // Alleen het native venster onderdrukken als de herlaadactie echt doorgaat.
            if ((status === 419 || status === 401) && kiviiReload()) {
                preventDefault();
            }
        });
    });
}

if (window.Livewire) {
    registerLivewireHooks();
} else {
    document.addEventListener('livewire:init', registerLivewireHooks);
}

// axios (niet Inertia: Inertia-verzoeken handelt app.jsx/bootstrap/app.php af).
axios.interceptors.response.use(undefined, async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const headers = config?.headers || {};
    const isInertia = typeof headers.get === 'function' ? !!headers.get('X-Inertia') : !!headers['X-Inertia'];
    if (!config || isInertia || (status !== 419 && status !== 401)) throw error;

    if (status === 419 && !config.__kiviiRetried) {
        try {
            // Elke GET via de web-middleware zet een nieuw XSRF-TOKEN-cookie.
            await axios.get(window.location.pathname, { headers: { Accept: 'text/html' }, __kiviiRetried: true });
        } catch (e) {
            // negeren; de herhaalpoging hieronder beslist.
        }
        if (typeof headers.delete === 'function') headers.delete('X-XSRF-TOKEN');
        else delete headers['X-XSRF-TOKEN'];
        return axios.request({ ...config, headers, __kiviiRetried: true });
    }

    kiviiReload();
    throw error;
});

// Lang in de achtergrond (iOS: app-wissel, scherm uit): bij terugkeer herladen, tenzij er een veld gefocust is.
let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : null;

function isEditing() {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    return el.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

function reloadIfStale() {
    if (hiddenAt === null) return;
    const away = Date.now() - hiddenAt;
    hiddenAt = null;
    if (away > STALE_AFTER_MS && !isEditing()) kiviiReload();
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
    } else {
        reloadIfStale();
    }
});
window.addEventListener('pagehide', () => {
    hiddenAt = Date.now();
});
window.addEventListener('pageshow', (event) => {
    // Uit de back/forward-cache: de pagina (en het CSRF-token) kan oud zijn.
    if (event.persisted) reloadIfStale();
});

// Hoogte van de sticky kopbalk als CSS-variabele.
function observeHeader() {
    const header = document.getElementById('kivii-header');
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
        root.style.setProperty('--kivii-header-h', `${Math.round(header.getBoundingClientRect().height)}px`);
    };
    update();
    if (typeof ResizeObserver === 'function') {
        new ResizeObserver(update).observe(header);
    } else {
        window.addEventListener('resize', update);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeHeader);
} else {
    observeHeader();
}
