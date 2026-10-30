import React, { useEffect, useState } from 'react';

// IBAN in groepen van 4, hoofdletters (alleen weergave, opgeslagen waarde blijft ongewijzigd).
export function formatIban(value) {
    if (!value) return '';
    return String(value).replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // val terug op de oude methode
        }
    }
    try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
    } catch {
        return false;
    }
}

export default function CopyButton({ value, label = 'Kopieer' }) {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!toast) return undefined;
        const handle = setTimeout(() => setToast(null), 2000);
        return () => clearTimeout(handle);
    }, [toast]);

    if (!value) return null;

    const onClick = async () => {
        const ok = await copyText(String(value));
        setToast({ id: Date.now(), ok });
    };

    return (
        <>
            <button
                type="button"
                onClick={onClick}
                aria-label={`${label}: ${value}`}
                className="ml-2 inline-flex items-center rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
            >
                Kopieer
            </button>
            {toast && (
                <span
                    key={toast.id}
                    role="status"
                    aria-live="polite"
                    className={`fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg ${
                        toast.ok ? 'bg-zinc-900' : 'bg-rose-600'
                    }`}
                >
                    {toast.ok ? 'Gekopieerd' : 'Kopiëren mislukt'}
                </span>
            )}
        </>
    );
}
