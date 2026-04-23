import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ConfirmProvider } from './components/ConfirmProvider';

const pages = import.meta.glob('./Pages/**/*.jsx');

createInertiaApp({
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
            </ConfirmProvider>
        );
    },
});
