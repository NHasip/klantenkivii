import React from 'react';

/*
 * Gedeelde UI-bouwstenen voor alle CRM-pagina's.
 * Huisstijl: neutrale zinc-tinten, merkgroen = indigo-600/700 (zie tailwind.config.js),
 * kaarten rounded-xl met border-zinc-200 en shadow-sm, focus via focus-visible ring.
 */

export function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';

const BUTTON_VARIANTS = {
    primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700',
    secondary: 'bg-white text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm hover:bg-zinc-50',
    ghost: 'text-zinc-700 hover:bg-zinc-100',
    danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
    'danger-ghost': 'text-rose-700 hover:bg-rose-50',
};

const BUTTON_SIZES = {
    xs: 'h-7 px-2 text-xs gap-1',
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-2',
    lg: 'h-10 px-4 text-sm gap-2',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
    return cx(
        'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        FOCUS,
        BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
        className,
    );
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', loading = false, children, disabled, ...props }) {
    return (
        <button type={type} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
            {loading ? <Spinner className="h-4 w-4" /> : null}
            {children}
        </button>
    );
}

export function Spinner({ className = 'h-4 w-4' }) {
    return (
        <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    );
}

export function Card({ as: Tag = 'section', className = '', padded = true, children, ...props }) {
    return (
        <Tag className={cx('min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm', padded && 'p-4 sm:p-5', className)} {...props}>
            {children}
        </Tag>
    );
}

export function CardHeader({ title, description, actions, className = '' }) {
    return (
        <div className={cx('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
                {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

export function PageHeader({ title, description, actions, children }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
                {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
                {children}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

const BADGE_TONES = {
    neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
    brand: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
    danger: 'bg-rose-50 text-rose-800 ring-rose-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export function Badge({ tone = 'neutral', className = '', children }) {
    return (
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE_TONES[tone] ?? BADGE_TONES.neutral, className)}>
            {children}
        </span>
    );
}

export function EmptyState({ title, description, action, icon = null, className = '' }) {
    return (
        <div className={cx('flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-10 text-center', className)}>
            {icon ? <div className="mb-3 text-zinc-400">{icon}</div> : null}
            <p className="text-sm font-semibold text-zinc-800">{title}</p>
            {description ? <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}

export const inputClasses = cx(
    'block w-full rounded-lg border-zinc-300 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400',
    'focus:border-indigo-600 focus:ring-indigo-600 disabled:bg-zinc-50 disabled:text-zinc-500',
);

export function Field({ id, label, hint, error, required = false, className = '', children }) {
    return (
        <div className={cx('min-w-0', className)}>
            {label ? (
                <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-800">
                    {label}
                    {required ? <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span> : null}
                </label>
            ) : null}
            {children}
            {hint && !error ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
            {error ? <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{error}</p> : null}
        </div>
    );
}

export const tableClasses = {
    wrapper: 'min-w-0 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm',
    table: 'min-w-full divide-y divide-zinc-200 text-sm',
    thead: 'bg-zinc-50',
    th: 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500',
    tbody: 'divide-y divide-zinc-100',
    tr: 'hover:bg-zinc-50/80',
    td: 'px-4 py-3 align-middle text-zinc-700',
};

export function Stat({ label, value, sub, href, tone = 'neutral' }) {
    const toneBar = { neutral: 'bg-zinc-200', brand: 'bg-indigo-500', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }[tone] ?? 'bg-zinc-200';
    const content = (
        <>
            <span className={cx('absolute inset-y-3 left-0 w-1 rounded-r', toneBar)} aria-hidden="true" />
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
            <div className="mt-1 break-words text-xl font-semibold tabular-nums text-zinc-900 sm:text-2xl">{value}</div>
            {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
        </>
    );
    const base = 'relative block min-w-0 rounded-xl border border-zinc-200 bg-white p-3 pl-4 shadow-sm sm:p-4 sm:pl-5';
    return href ? (
        <a href={href} className={cx(base, 'transition hover:border-zinc-300 hover:shadow', FOCUS)}>{content}</a>
    ) : (
        <div className={base}>{content}</div>
    );
}

/*
 * Bestandskiezer met Nederlandse knop en statustekst in plaats van de native
 * "Choose Files / No file chosen". Het echte input blijft focusbaar (sr-only),
 * dus Tab + Enter/Spatie werkt; de focusring staat op de knop via focus-within.
 */
export function FilePicker({ id, multiple = false, accept, disabled = false, onChange, files = [], buttonLabel, className = '', describedBy }) {
    const list = Array.isArray(files) ? files.filter(Boolean) : files ? [files] : [];
    const statusId = id ? `${id}-status` : undefined;
    const status =
        list.length === 0
            ? 'Geen bestand gekozen'
            : list.length === 1
              ? list[0]?.name || '1 bestand gekozen'
              : `${list.length} bestanden gekozen`;
    return (
        <div className={cx('flex min-w-0 flex-wrap items-center gap-3', className)}>
            <label
                className={cx(
                    buttonClasses({ variant: 'secondary', size: 'md' }),
                    'focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
            >
                <input
                    id={id}
                    type="file"
                    className="sr-only"
                    multiple={multiple}
                    accept={accept}
                    disabled={disabled}
                    aria-describedby={cx(statusId, describedBy) || undefined}
                    onChange={onChange}
                />
                {buttonLabel ?? (multiple ? 'Bestanden kiezen' : 'Bestand kiezen')}
            </label>
            <span id={statusId} className="min-w-0 truncate text-sm text-zinc-600" aria-live="polite">
                {status}
            </span>
        </div>
    );
}
