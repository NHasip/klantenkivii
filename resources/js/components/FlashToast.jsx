import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

/**
 * Toont de gedeelde flash-melding (props.flash.status / props.flash.error) na
 * Inertia-bezoeken (router.post/patch/delete + redirect). Bij de eerste volledige
 * paginalading toont de Blade-layout de melding al; latere bezoeken (ook redirects)
 * tonen hem via de 'success'- en 'navigate'-events.
 */
export function FlashToast() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Zowel 'success' (formulierbezoek) als 'navigate' (elke paginawissel, ook na een
        // redirect) kan de flash dragen; per pagina-object maar een keer tonen.
        const seen = new WeakSet();
        let initial = true;
        const show = (page) => {
            if (!page || typeof page !== 'object' || seen.has(page)) return;
            seen.add(page);
            const flash = page?.props?.flash;
            if (!flash) return;
            const error = typeof flash.error === 'string' && flash.error.trim() ? flash.error : null;
            const status = typeof flash.status === 'string' && flash.status.trim() ? flash.status : null;
            if (!error && !status) return;
            setToast({ id: Date.now(), tone: error ? 'error' : 'success', text: error ?? status });
        };
        const offSuccess = router.on('success', (event) => show(event?.detail?.page));
        const offNavigate = router.on('navigate', (event) => {
            // De eerste volledige paginalading toont de Blade-layout al.
            if (initial) {
                initial = false;
                if (event?.detail?.page) seen.add(event.detail.page);
                return;
            }
            show(event?.detail?.page);
        });
        return () => {
            offSuccess();
            offNavigate();
        };
    }, []);

    useEffect(() => {
        if (!toast || toast.tone === 'error') return undefined;
        const handler = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(handler);
    }, [toast]);

    if (!toast) return null;

    const isError = toast.tone === 'error';

    return (
        <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`fixed bottom-4 left-4 right-4 z-[65] rounded-xl border p-4 text-sm shadow-lg sm:left-auto sm:w-96 ${
                isError ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>{toast.text}</div>
                <button type="button" className="shrink-0 text-xs font-semibold" onClick={() => setToast(null)}>
                    Sluiten
                </button>
            </div>
        </div>
    );
}
