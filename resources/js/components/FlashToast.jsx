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
            className={`fixed bottom-4 left-4 right-4 z-[65] rounded-xl border bg-white p-4 text-sm shadow-lg sm:left-auto sm:w-96 ${
                isError ? 'border-rose-200' : 'border-emerald-200'
            }`}
        >
            <div className="flex items-start gap-3">
                {isError ? (
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                )}
                <div className={`min-w-0 flex-1 pt-px ${isError ? 'text-rose-900' : 'text-zinc-800'}`}>{toast.text}</div>
                <button
                    type="button"
                    className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    onClick={() => setToast(null)}
                    aria-label="Melding sluiten"
                >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
