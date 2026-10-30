import React from 'react';

// Fallback labels for customer statuses (backend sends statusLabels, these cover raw/legacy values).
export const CUSTOMER_STATUS_LABELS = {
    lead: 'Demo aangevraagd',
    demo_aangevraagd: 'Demo aangevraagd',
    demo_gepland: 'Demo',
    proefperiode: 'Demo',
    actief: 'Actief',
    opgezegd: 'Opgezegd',
    verloren: 'Verloren',
};

// Text/background pairs chosen for a contrast ratio of at least 4.5:1 (800 shade on 50/100 tint).
const STATUS_CLASSES = {
    demo_aangevraagd: 'bg-sky-50 text-sky-800 ring-sky-200',
    proefperiode: 'bg-amber-50 text-amber-800 ring-amber-200',
    actief: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    opgezegd: 'bg-rose-50 text-rose-800 ring-rose-200',
    verloren: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
};

export function normalizeCustomerStatus(value) {
    if (value === 'lead') return 'demo_aangevraagd';
    if (value === 'demo_gepland') return 'proefperiode';
    return value;
}

export function customerStatusLabel(value, labels = {}) {
    const normalized = normalizeCustomerStatus(value);
    return labels?.[normalized] || CUSTOMER_STATUS_LABELS[normalized] || CUSTOMER_STATUS_LABELS[value] || value || '-';
}

const RAW_STATUS_PATTERN = /\b(lead|demo_aangevraagd|demo_gepland|proefperiode|actief|opgezegd|verloren)\b/g;

// Translates raw status values in stored texts (e.g. "proefperiode -> actief") to Dutch labels at display time.
export function translateStatusText(text, labels = {}) {
    if (!text) return text;
    return String(text)
        .replace(RAW_STATUS_PATTERN, (match) => customerStatusLabel(match, labels))
        .replace(/\s->\s/g, ' naar ');
}

// Oude statusregels als "Status gewijzigd: Demo naar Demo" (zelfde van/naar na labelvertaling)
// zijn geen echte wijziging; die verbergen we alleen bij het tonen, de data blijft staan.
export function isNoopStatusChange(activity, labels = {}) {
    if (!activity || activity.type !== 'status_wijziging' || !activity.titel) return false;
    const text = translateStatusText(activity.titel, labels).replace(/^[^:]*:\s*/, '');
    const match = text.match(/^(.+?)\s+naar\s+(.+)$/i);
    if (!match) return false;
    return match[1].trim().toLowerCase() === match[2].trim().toLowerCase();
}

// Visible keyboard focus for links, buttons and summaries inside a page wrapper.
export const FOCUS_SCOPE = [
    '[&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-indigo-600',
    '[&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-indigo-600',
    '[&_summary:focus-visible]:outline [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-2 [&_summary:focus-visible]:outline-indigo-600',
].join(' ');

export default function StatusBadge({ status, labels, className = '' }) {
    const normalized = normalizeCustomerStatus(status);
    const tone = STATUS_CLASSES[normalized] || 'bg-zinc-100 text-zinc-700 ring-zinc-300';
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`.trim()}
        >
            {customerStatusLabel(status, labels)}
        </span>
    );
}
