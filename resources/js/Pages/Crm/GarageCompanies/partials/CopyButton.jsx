import React, { useEffect, useState } from 'react';
import { Icon } from '../../../../components/icons';

// IBAN in groepen van 4, hoofdletters (alleen weergave, opgeslagen waarde blijft ongewijzigd).
export function formatIban(value) {
    if (!value) return '';
    return String(value).replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

export async function copyText(text) {
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
                title={label}
                className="ml-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-ring"
            >
                <Icon name={toast?.ok ? 'check' : 'copy'} className={`h-3.5 w-3.5 ${toast?.ok ? 'text-emerald-600' : ''}`} />
                <span className="font-sans">{toast?.ok ? 'Gekopieerd' : 'Kopieer'}</span>
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
