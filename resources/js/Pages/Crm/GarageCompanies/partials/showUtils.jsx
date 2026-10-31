import React from 'react';
import { Link } from '@inertiajs/react';
import { Field, cx, inputClasses } from '../../../../components/ui';

/*
 * Gedeelde helpers voor het klantdossier (Show.jsx en de tab-partials).
 * Alleen weergave en formatting; geen eigen state.
 */

export function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

// "YYYY-MM-DD" als lokale datum lezen (new Date() leest dat als UTC en kan een dag verschuiven).
function parseDate(value) {
    const text = String(value);
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(text);
}

export function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = parseDate(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    try {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch {
        return String(isoString);
    }
}

export function formatDate(isoString) {
    if (!isoString) return '-';
    const date = parseDate(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    try {
        return new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } catch {
        return String(isoString);
    }
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

// Lokale datum/tijd voor date/datetime-local inputs (toISOString geeft UTC en verschuift de tijd).
export function toLocalDateInput(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toLocalDateTimeInput(date) {
    return `${toLocalDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Datumvelden zonder betekenisvolle tijd: toon alleen de datum.
export function toDateOnly(value) {
    return value ? String(value).slice(0, 10) : '';
}

// Bewaar de oorspronkelijke waarde (incl. tijd) als de datum niet is gewijzigd, zodat bestaande data intact blijft.
export function keepOriginalIfSameDate(value, original) {
    if (value && original && String(original).slice(0, 10) === value) return original;
    return value;
}

export const DATE_ONLY_FIELDS = ['proefperiode_start', 'actief_vanaf', 'opgezegd_op', 'verloren_op'];

// Keuze 'huidig concept' in de verstuurdialoog van de welkomstmail.
export const CURRENT_DRAFT = '__huidig__';

export function roleLabel(value) {
    if (!value) return '-';
    const text = String(value).trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

export const MANDATE_STATUSES = ['pending', 'actief', 'ingetrokken'];

export const MANDATE_STATUS_LABELS = {
    pending: 'In afwachting',
    actief: 'Actief',
    ingetrokken: 'Ingetrokken',
};

export const MANDATE_STATUS_TONES = {
    pending: 'warning',
    actief: 'success',
    ingetrokken: 'neutral',
};

export const WELCOME_STATUS_LABELS = {
    draft: 'Concept',
    concept: 'Concept',
    sent: 'Verstuurd',
    failed: 'Mislukt',
};

export const WELCOME_STATUS_TONES = {
    draft: 'warning',
    concept: 'warning',
    sent: 'success',
    failed: 'danger',
};

export const CHANNEL_LABELS = {
    popup: 'Pop-up',
    email: 'E-mail',
    beide: 'Pop-up en e-mail',
};

export const ACTIVITY_TYPE_LABELS = {
    status_wijziging: 'Statuswijziging',
    notitie: 'Notitie',
    taak: 'Taak',
    afspraak: 'Afspraak',
    demo: 'Demo',
    mandate: 'Mandaat',
    module: 'Module',
    systeem: 'Systeem',
};

export const TABS = [
    { key: 'overzicht', label: 'Overzicht', icon: 'grid' },
    { key: 'contact', label: 'Contact & gebruikers', icon: 'users' },
    { key: 'abonnement', label: 'Abonnement', icon: 'credit-card' },
    { key: 'activiteit', label: 'Activiteit', icon: 'activity' },
    { key: 'demo_status', label: 'Demo & status', icon: 'sparkles' },
];

export const WELCOME_TAB = { key: 'welkomst', label: 'Welkomstmail', icon: 'mail' };

// Icoon en kleur per tijdlijntype (mails herkennen we aan de titel).
const ACTIVITY_VISUALS = {
    status_wijziging: { icon: 'refresh', tone: 'info' },
    notitie: { icon: 'message-square', tone: 'brand' },
    taak: { icon: 'check-square', tone: 'warning' },
    afspraak: { icon: 'calendar', tone: 'info' },
    demo: { icon: 'sparkles', tone: 'brand' },
    mandate: { icon: 'credit-card', tone: 'success' },
    module: { icon: 'package', tone: 'neutral' },
    systeem: { icon: 'settings', tone: 'neutral' },
};

export function activityVisual(activity) {
    if (activity?.type !== 'notitie' && /mail/i.test(`${activity?.titel || ''}`)) return { icon: 'mail', tone: 'info' };
    if (activity?.type === 'taak' && activity?.done_at) return { icon: 'check-circle', tone: 'success' };
    return ACTIVITY_VISUALS[activity?.type] || { icon: 'activity', tone: 'neutral' };
}

export function activityTypeLabel(activity) {
    if (!activity?.type) return 'Activiteit';
    return ACTIVITY_TYPE_LABELS[activity.type] || activity.type.replace(/_/g, ' ');
}

// Relatieve dag voor groepering in de tijdlijn: Vandaag, Gisteren of de datum voluit.
export function dayLabel(value) {
    if (!value) return 'Onbekende datum';
    const date = parseDate(value);
    if (Number.isNaN(date.getTime())) return 'Onbekende datum';
    const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
    if (diff === 0) return 'Vandaag';
    if (diff === 1) return 'Gisteren';
    try {
        return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(date);
    } catch {
        return formatDate(value);
    }
}

export function formatTime(value) {
    if (!value) return '';
    const date = parseDate(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(date);
    } catch {
        return '';
    }
}

// Korte datum zonder jaar als het dit jaar is ("12 nov"), anders met jaar.
export function formatShortDate(value) {
    if (!value) return '-';
    const date = parseDate(value);
    if (Number.isNaN(date.getTime())) return String(value);
    try {
        return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(date);
    } catch {
        return formatDate(value);
    }
}

export function personName(person) {
    if (!person) return '';
    return `${person.voornaam || ''} ${person.achternaam || ''}`.trim();
}

export function telHref(value) {
    return `tel:${String(value).replace(/[^\d+]/g, '')}`;
}

export const CRM_TASK_STATUS = {
    open: { label: 'Open', tone: 'neutral' },
    in_behandeling: { label: 'In behandeling', tone: 'info' },
    wacht_op_klant: { label: 'Wacht op klant', tone: 'warning' },
    afgerond: { label: 'Afgerond', tone: 'success' },
};

export const CRM_TASK_PRIORITY = {
    laag: 'Laag',
    normaal: 'Normaal',
    hoog: 'Hoog',
    kritiek: 'Kritiek',
};

// Oude ?tab= waarden blijven werken: ze openen de nieuwe tab en scrollen naar de sectie.
export const LEGACY_TABS = {
    klantpersonen: { tab: 'contact', anchor: 'sectie-contactpersonen' },
    gebruikers: { tab: 'contact', anchor: 'sectie-gebruikers' },
    seats: { tab: 'contact', anchor: 'sectie-gebruikers' },
    modules: { tab: 'abonnement', anchor: 'sectie-modules' },
    incasso: { tab: 'abonnement', anchor: 'sectie-incasso' },
    timeline: { tab: 'activiteit', anchor: 'sectie-tijdlijn' },
    taken_afspraken: { tab: 'activiteit', anchor: 'sectie-klantafspraken' },
};

export const TIMELINE_FILTERS = [
    { key: 'alles', label: 'Alles' },
    { key: 'notities', label: 'Notities' },
    { key: 'status', label: 'Status' },
    { key: 'incasso', label: 'Incasso' },
    { key: 'email', label: 'E-mail' },
    { key: 'taken', label: 'Taken' },
];

function isEmailActivity(activity) {
    return /mail/i.test(`${activity.titel || ''}`);
}

export function matchesTimelineFilter(activity, filter) {
    switch (filter) {
        case 'notities':
            return activity.type === 'notitie';
        case 'status':
            return activity.type === 'status_wijziging' || activity.type === 'demo';
        case 'incasso':
            return activity.type === 'mandate' || /incasso|mandaat/i.test(`${activity.titel || ''}`);
        case 'email':
            return isEmailActivity(activity);
        case 'taken':
            return activity.type === 'taak' || activity.type === 'afspraak';
        default:
            return true;
    }
}

export function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export function dateShortcut(kind) {
    const date = new Date();
    if (kind === 'morgen') date.setDate(date.getDate() + 1);
    if (kind === 'volgende_week') date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
    if (kind === 'vandaag') {
        // 09:00 als dat nog moet komen, anders het volgende hele uur;
        // valt dat na middernacht, dan morgen 09:00.
        const now = new Date();
        if (date <= now) {
            date.setTime(now.getTime());
            date.setHours(now.getHours() + 1, 0, 0, 0);
            if (date.getDate() !== now.getDate()) {
                date.setHours(9, 0, 0, 0);
            }
        }
    }
    return toLocalDateTimeInput(date);
}

export function isOverdue(dueAt) {
    if (!dueAt) return false;
    const date = new Date(dueAt);
    return !Number.isNaN(date.getTime()) && date < new Date();
}

export function tabUrl(key, anchor) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    url.hash = anchor ? `#${anchor}` : '';
    return url.toString();
}

export function withTabParam(href, key) {
    if (!href) return href;
    try {
        const url = new URL(href, window.location.origin);
        url.searchParams.set('tab', key);
        return url.toString();
    } catch {
        return href;
    }
}

export function scrollToForm(id) {
    window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

export function numberValue(value) {
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeIban(value) {
    return value ? String(value).replace(/\s+/g, '').toUpperCase() : '';
}

// Laravel levert Engelse labels ("&laquo; Previous") zonder taalbestand.
function paginationLabel(label) {
    return String(label ?? '')
        .replace(/Previous/i, 'Vorige')
        .replace(/Next/i, 'Volgende');
}

export function Pagination({ links, lastPage, tabKey }) {
    if (!links || links.length <= 1) return null;
    if (lastPage !== undefined && lastPage !== null && Number(lastPage) <= 1) return null;

    return (
        <nav aria-label="Paginering tijdlijn" className="mt-6 flex flex-wrap gap-2">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={tabKey ? withTabParam(link.url, tabKey) : link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={cx(
                            'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium',
                            link.active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        )}
                        preserveScroll
                        dangerouslySetInnerHTML={{ __html: paginationLabel(link.label) }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="inline-flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 px-3 text-sm text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: paginationLabel(link.label) }}
                    />
                )
            )}
        </nav>
    );
}

export function ToolbarButton({ active, disabled, onClick, children, title }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active === undefined ? undefined : Boolean(active)}
            onClick={onClick}
            disabled={disabled}
            className={cx(
                'tap-target inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold transition',
                active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-200/70',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
}

/*
 * Formulierveld gekoppeld aan een Inertia useForm: label, input, foutmelding.
 * as = 'input' | 'textarea' | 'select' (opties als children).
 */
export function FormField({ form, name, id, label, as = 'input', required = false, hint, className = '', children, onChange, inputClassName = '', ...inputProps }) {
    const error = form.errors?.[name];
    const Tag = as;
    return (
        <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
            <Tag
                id={id}
                name={name}
                value={form.data[name] ?? ''}
                onChange={onChange || ((event) => form.setData(name, event.target.value))}
                aria-invalid={error ? true : undefined}
                aria-required={required || undefined}
                className={cx(inputClasses, error && 'border-rose-400', inputClassName)}
                {...inputProps}
            >
                {children}
            </Tag>
        </Field>
    );
}

export function CheckboxField({ id, label, checked, onChange, description, className = '' }) {
    return (
        <label htmlFor={id} className={cx('tap-target flex min-h-9 cursor-pointer items-start gap-2.5 text-sm text-zinc-800', className)}>
            <input
                id={id}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                checked={Boolean(checked)}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span>
                <span className="font-medium">{label}</span>
                {description ? <span className="block text-xs text-zinc-500">{description}</span> : null}
            </span>
        </label>
    );
}

// Samenvatting onder een formulier als de server validatiefouten teruggeeft.
export function FormErrorSummary({ form }) {
    if (!form.hasErrors || form.processing) return null;
    return (
        <p role="alert" className="text-sm font-medium text-rose-700">
            Niet alle velden zijn juist ingevuld. Controleer de gemarkeerde velden.
        </p>
    );
}

export function FormActions({ children, form }) {
    return (
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
            {form ? <div className="sm:mr-auto"><FormErrorSummary form={form} /></div> : null}
            {children}
        </div>
    );
}

export function Notice({ tone = 'warning', title, children, action, className = '' }) {
    const tones = {
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        danger: 'border-rose-200 bg-rose-50 text-rose-900',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        info: 'border-sky-200 bg-sky-50 text-sky-900',
        neutral: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    };
    return (
        <div className={cx('flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between', tones[tone] ?? tones.warning, className)}>
            <div className="min-w-0">
                {title ? <p className="font-semibold">{title}</p> : null}
                {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}

export function DetailList({ items, columns = 2 }) {
    return (
        <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-4 text-sm', columns === 2 && 'sm:grid-cols-2')}>
            {items.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-xs font-medium text-zinc-500">{label}</dt>
                    <dd className="mt-0.5 break-words text-zinc-900">{value || <span className="text-zinc-400">Niet ingevuld</span>}</dd>
                </div>
            ))}
        </dl>
    );
}

export function FieldGroup({ title, children }) {
    return (
        <fieldset className="min-w-0">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
    );
}
