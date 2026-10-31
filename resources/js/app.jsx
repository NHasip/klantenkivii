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
