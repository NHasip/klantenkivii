import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ConfirmProvider } from './components/ConfirmProvider';
import { FlashToast } from './components/FlashToast';

const pages = import.meta.glob('./Pages/**/*.jsx');

// De Blade-navigatie (zijbalk, drawer, onderbalk in layouts/partials/header.blade.php) wordt maar één keer gerenderd.
// Na elke Inertia-navigatie (ook terug/vooruit) de nieuwe URL melden, zodat die het actieve menu-item bijwerkt.
router.on('navigate', (event) => {
    const url = event?.detail?.page?.url || window.location.href;
    window.dispatchEvent(new CustomEvent('kivii-navigate', { detail: { url } }));
});

// Verlopen sessie of CSRF-token: Inertia krijgt dan een niet-Inertia-antwoord (419-pagina, of de inlogpagina na een
// redirect) en zou dat in een modal tonen. In plaats daarvan een volledige paginalading: naar het inloggen of de
// huidige pagina opnieuw (met verse tokens).
router.on('invalid', (event) => {
    const response = event?.detail?.response;
    const status = Number(response?.status || 0);
    const finalUrl = response?.request?.responseURL || '';
    let finalPath = '';
    try {
        finalPath = finalUrl ? new URL(finalUrl, window.location.href).pathname : '';
    } catch (e) {
        finalPath = '';
    }
    const landedOnLogin = /\/login\/?$/.test(finalPath);
    const method = String(response?.config?.method || 'get').toLowerCase();
    const reload = (url) => (window.kiviiReload ? window.kiviiReload(url) : ((window.location.href = url || window.location.href), true));

    let target = null;
    if (landedOnLogin) {
        target = finalUrl;
    } else if (status === 401 || status === 419) {
        target = window.location.href;
    } else if (status === 403 && method === 'get' && finalUrl) {
        // Geen toegang tot de gevraagde pagina: die pagina volledig tonen in plaats van in een modal.
        target = finalUrl;
    }
    // kiviiReload weigert een tweede herlaadactie binnen 10s; dan de standaardmodal laten zien (geen "dode" knop).
    if (target && reload(target)) event.preventDefault();
});

createInertiaApp({
    title: (title) => (title ? `${title} - Kivii CRM` : 'Kivii CRM'),
    resolve: async (name) => {
        const page = pages[`./Pages/${name}.jsx`];
        if (!page) {
            throw new Error(`Inertia page not found: ${name}`);
        }
        const module = await page();
        return module.default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <ConfirmProvider>
                <App {...props} />
                <FlashToast />
            </ConfirmProvider>
        );
    },
});
