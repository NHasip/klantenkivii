import React, { Children, cloneElement, isValidElement, useId, useRef, useState } from 'react';
import { Icon } from './icons';

/*
 * Gedeelde UI-bouwstenen voor alle CRM-pagina's (Kivii design foundation).
 *
 * Huisstijl: rustige canvas-achtergrond (bg-canvas), witte kaarten rounded-2xl met haarlijn-rand en shadow-card,
 * merkgroen = indigo/kivii (500 #aec22b als accent, 600 #667319 voor knoppen en tekst), focus via focus-visible ring.
 * De visuele basis staat als componentklassen in resources/css/app.css (.btn, .card, .input, .badge-*, .table-*),
 * zodat Blade (Livewire) en React precies hetzelfde ogen. Dit bestand voegt alleen gedrag en structuur toe.
 *
 * Pagina's renderen binnen <main class="app-container"> (zie layouts/partials/header.blade.php): voeg zelf
 * geen max-w-7xl/mx-auto/px-* containers toe. Smalle pagina's: <div className="content-narrow">.
 */

/** Klassen samenvoegen; falsy waarden worden overgeslagen. */
export function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

const FOCUS = 'focus-ring';

/** Rendert een icoon op naam ('users') of geeft een meegegeven element ongewijzigd terug. */
function renderIcon(icon, className) {
    if (!icon) return null;
    if (typeof icon === 'string') return <Icon name={icon} className={className} />;
    return icon;
}

/* ------------------------------------------------------------------ Knoppen */

const BUTTON_VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    'danger-ghost': 'btn-danger-ghost',
};

const BUTTON_SIZES = { xs: 'btn-xs', sm: 'btn-sm', md: '', lg: 'btn-lg' };

const BUTTON_ICON_SIZES = { xs: 'h-3.5 w-3.5', sm: 'h-4 w-4', md: 'h-4 w-4', lg: 'h-[1.125rem] w-[1.125rem]' };

/**
 * Klassen voor een knop of knop-achtige link (<a>, Inertia <Link>).
 * @param {{variant?: 'primary'|'secondary'|'ghost'|'danger'|'danger-ghost', size?: 'xs'|'sm'|'md'|'lg', iconOnly?: boolean, className?: string}} opts
 */
export function buttonClasses({ variant = 'primary', size = 'md', iconOnly = false, className = '' } = {}) {
    return cx('btn', BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary, BUTTON_SIZES[size] ?? '', iconOnly && 'btn-icon', className);
}

/**
 * Knop. `icon`/`iconRight` = iconnaam of element. Met `iconOnly` verplicht een `aria-label` meegeven.
 * `loading` toont een spinner en zet de knop op disabled + aria-busy.
 */
export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', loading = false, icon, iconRight, iconOnly = false, children, disabled, ...props }) {
    const iconClass = BUTTON_ICON_SIZES[size] ?? BUTTON_ICON_SIZES.md;
    return (
        <button type={type} className={buttonClasses({ variant, size, iconOnly, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
            {loading ? <Spinner className={iconClass} /> : renderIcon(icon, iconClass)}
            {children}
            {!loading ? renderIcon(iconRight, iconClass) : null}
        </button>
    );
}

/** Draaiende laadindicator (aria-hidden; zet zelf een status-tekst of aria-busy op de context). */
export function Spinner({ className = 'h-4 w-4' }) {
    return (
        <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    );
}

/* ------------------------------------------------------------------ Kaarten en koppen */

/**
 * Kaart (wit vlak, rounded-2xl, haarlijn, zachte schaduw).
 * `padded` (standaard true) geeft card-body padding; `interactive` voegt een hover-lift toe voor klikbare kaarten.
 */
export function Card({ as: Tag = 'section', className = '', padded = true, interactive = false, children, ...props }) {
    return (
        <Tag className={cx('card', padded && 'card-body', interactive && 'card-interactive', className)} {...props}>
            {children}
        </Tag>
    );
}

/**
 * Kop binnen een (gepadde) kaart: titel, optionele beschrijving, acties rechts en optioneel icoon-tegel links.
 * `as` bepaalt het kopniveau (standaard h2).
 */
export function CardHeader({ title, description, actions, icon, tone = 'brand', as: Heading = 'h2', className = '' }) {
    return (
        <div className={cx('mb-5 flex flex-wrap items-start justify-between gap-3', className)}>
            <div className="flex min-w-0 items-start gap-3">
                {icon ? <IconTile icon={icon} tone={tone} size="sm" /> : null}
                <div className="min-w-0">
                    <Heading className="section-heading">{title}</Heading>
                    {description ? <p className="section-description">{description}</p> : null}
                </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

/**
 * Paginakop met h1. Eén per pagina. `back` = { href, label } toont een terug-link boven de titel.
 * `children` komt onder de beschrijving (bijv. badges of meta).
 */
export function PageHeader({ title, description, actions, back, children, className = '' }) {
    return (
        <div className={cx('mb-6 sm:mb-8', className)}>
            {back?.href ? (
                <a href={back.href} className="mb-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900 focus-ring">
                    <Icon name="arrow-left" className="h-4 w-4" />
                    {back.label ?? 'Terug'}
                </a>
            ) : null}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="page-title">{title}</h1>
                    {description ? <p className="page-description">{description}</p> : null}
                    {children}
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
        </div>
    );
}

/**
 * Sectie met kop (h2), beschrijving en acties, gevolgd door de inhoud. Zonder kaart: zet zelf Cards in de inhoud.
 */
export function Section({ title, description, actions, as: Tag = 'section', headingAs: Heading = 'h2', className = '', children, ...props }) {
    return (
        <Tag className={cx('min-w-0', className)} {...props}>
            {title || actions ? (
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        {title ? <Heading className="section-heading">{title}</Heading> : null}
                        {description ? <p className="section-description">{description}</p> : null}
                    </div>
                    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
                </div>
            ) : null}
            {children}
        </Tag>
    );
}

/** Horizontale scheidingslijn, optioneel met label in het midden (bijv. "of"). */
export function Divider({ label, className = '' }) {
    if (!label) return <hr className={cx('divider', className)} />;
    return (
        <div className={cx('flex items-center gap-3', className)} role="separator" aria-label={typeof label === 'string' ? label : undefined}>
            <span className="h-px flex-1 bg-zinc-200/80" aria-hidden="true" />
            <span className="text-xs font-medium text-zinc-400">{label}</span>
            <span className="h-px flex-1 bg-zinc-200/80" aria-hidden="true" />
        </div>
    );
}

/* ------------------------------------------------------------------ Badges, statussen, tegels */

const TONES = ['neutral', 'brand', 'success', 'warning', 'danger', 'info'];

/** Pil-label. tone: neutral | brand | success | warning | danger | info. `dot` toont een statusstip, `icon` een icoon. */
export function Badge({ tone = 'neutral', dot = false, icon, className = '', children }) {
    const t = TONES.includes(tone) ? tone : 'neutral';
    return (
        <span className={cx('badge', `badge-${t}`, className)}>
            {dot ? <StatusDot tone={t} /> : null}
            {renderIcon(icon, 'h-3 w-3')}
            {children}
        </span>
    );
}

const DOT_TONES = {
    neutral: 'bg-zinc-400',
    brand: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
};

/**
 * Kleine statusstip. Kleur alleen is geen signaal: geef `label` mee (sr-only) als er geen zichtbare tekst naast staat.
 * `pulse` voor live/actief.
 */
export function StatusDot({ tone = 'neutral', pulse = false, label, className = '' }) {
    const color = DOT_TONES[tone] ?? DOT_TONES.neutral;
    return (
        <span className={cx('relative inline-flex h-2 w-2 shrink-0', className)}>
            {pulse ? <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', color)} aria-hidden="true" /> : null}
            <span className={cx('relative inline-flex h-2 w-2 rounded-full', color)} aria-hidden="true" />
            {label ? <span className="sr-only">{label}</span> : null}
        </span>
    );
}

const TILE_TONES = {
    neutral: 'bg-zinc-100 text-zinc-600',
    brand: 'bg-indigo-100/80 text-indigo-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-sky-50 text-sky-700',
};

const TILE_SIZES = {
    sm: ['h-8 w-8 rounded-lg', 'h-4 w-4'],
    md: ['h-10 w-10', 'h-5 w-5'],
    lg: ['h-12 w-12', 'h-6 w-6'],
};

/** Icoon in een getinte afgeronde tegel. icon = naam of element; tone zoals Badge; size sm | md | lg. */
export function IconTile({ icon, tone = 'brand', size = 'md', className = '' }) {
    const [box, glyph] = TILE_SIZES[size] ?? TILE_SIZES.md;
    return (
        <span className={cx('icon-tile', box, TILE_TONES[tone] ?? TILE_TONES.brand, className)} aria-hidden="true">
            {renderIcon(icon, glyph)}
        </span>
    );
}

/* ------------------------------------------------------------------ Avatar */

const AVATAR_COLORS = [
    'bg-indigo-100 text-indigo-800',
    'bg-emerald-100 text-emerald-800',
    'bg-sky-100 text-sky-800',
    'bg-amber-100 text-amber-900',
    'bg-rose-100 text-rose-800',
    'bg-violet-100 text-violet-800',
    'bg-teal-100 text-teal-800',
    'bg-orange-100 text-orange-900',
];

const AVATAR_SIZES = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
};

/** Initialen (max 2) uit een naam. */
export function initials(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('');
}

/** Deterministische kleur voor een naam. Zelfde algoritme als <x-avatar> in Blade, dus overal dezelfde kleur. */
export function avatarColor(name = '') {
    let h = 0;
    for (const ch of String(name).trim().toLowerCase()) {
        h = (h * 31 + ch.codePointAt(0)) % 4294967296;
    }
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Ronde avatar met initialen en een vaste zachte kleur per naam, of een foto via `src`.
 * size: xs | sm | md | lg | xl. Decoratief (aria-hidden) tenzij `label` is meegegeven.
 */
export function Avatar({ name = '', src, size = 'md', label, className = '' }) {
    const sizeClass = AVATAR_SIZES[size] ?? AVATAR_SIZES.md;
    const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
    if (src) {
        return <img src={src} alt={label ?? ''} className={cx('shrink-0 rounded-full object-cover ring-1 ring-black/5', sizeClass, className)} />;
    }
    return (
        <span className={cx('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5', sizeClass, avatarColor(name), className)} {...a11y}>
            {initials(name)}
        </span>
    );
}

/* ------------------------------------------------------------------ Lege staat, skeleton, voortgang */

const ILLUSTRATIONS = {
    inbox: (
        <>
            <rect x="14" y="22" width="68" height="46" rx="10" className="fill-white stroke-zinc-300" strokeWidth="1.5" />
            <path d="M14 48h18l5 8h22l5-8h18" className="stroke-zinc-300" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            <path d="M34 34h28M38 41h20" className="stroke-indigo-400" strokeWidth="2.5" strokeLinecap="round" />
        </>
    ),
    search: (
        <>
            <circle cx="44" cy="42" r="20" className="fill-white stroke-zinc-300" strokeWidth="1.5" />
            <path d="m59 57 14 14" className="stroke-zinc-300" strokeWidth="5" strokeLinecap="round" />
            <path d="M35 42h18" className="stroke-indigo-400" strokeWidth="2.5" strokeLinecap="round" />
        </>
    ),
    tasks: (
        <>
            <rect x="22" y="14" width="52" height="62" rx="10" className="fill-white stroke-zinc-300" strokeWidth="1.5" />
            <path d="m32 32 4 4 7-8M32 50l4 4 7-8" className="stroke-indigo-500" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M50 32h14M50 50h10" className="stroke-zinc-300" strokeWidth="2.5" strokeLinecap="round" />
        </>
    ),
    people: (
        <>
            <circle cx="38" cy="34" r="11" className="fill-white stroke-zinc-300" strokeWidth="1.5" />
            <path d="M18 70c2-12 10-18 20-18s18 6 20 18" className="fill-white stroke-zinc-300" strokeWidth="1.5" />
            <circle cx="62" cy="38" r="8" className="fill-indigo-100 stroke-indigo-400" strokeWidth="1.5" />
            <path d="M52 70c1-9 5-14 10-14s10 5 12 14" className="fill-indigo-100 stroke-indigo-400" strokeWidth="1.5" />
        </>
    ),
};

/**
 * Lege staat: titel, uitleg en een actie. Gebruik de tekst om de volgende stap te noemen, niet om sorry te zeggen.
 * `illustration`: 'inbox' | 'search' | 'tasks' | 'people' (klein inline SVG-plaatje) of `icon` (naam/element) voor een icoon-tegel.
 * `compact` voor gebruik binnen een kaart, `bare` zonder gestippelde rand.
 */
export function EmptyState({ title, description, action, icon = null, illustration, compact = false, bare = false, className = '' }) {
    const art = illustration ? ILLUSTRATIONS[illustration] ?? ILLUSTRATIONS.inbox : null;
    return (
        <div
            className={cx(
                'flex flex-col items-center justify-center text-center',
                !bare && 'rounded-2xl border border-dashed border-zinc-300/80 bg-white/60',
                compact ? 'px-4 py-8' : 'px-6 py-12',
                className,
            )}
        >
            {art ? (
                <svg viewBox="0 0 96 90" className={cx('mb-4', compact ? 'h-16 w-16' : 'h-20 w-20')} aria-hidden="true">
                    <ellipse cx="48" cy="80" rx="30" ry="4" className="fill-zinc-200/70" />
                    {art}
                </svg>
            ) : icon ? (
                <div className="mb-3">{typeof icon === 'string' ? <IconTile icon={icon} tone="neutral" /> : <span className="text-zinc-400">{icon}</span>}</div>
            ) : null}
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            {description ? <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</p> : null}
            {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
        </div>
    );
}

/**
 * Laadplaceholder. Zonder props een blok (geef maat via className, bijv. "h-24 w-full").
 * Met `lines` een tekstblok met n regels (laatste regel korter). Voeg op de container aria-busy toe.
 */
export function Skeleton({ lines, className = '' }) {
    if (lines) {
        return (
            <div className={cx('space-y-2.5', className)} aria-hidden="true">
                {Array.from({ length: lines }, (_, i) => (
                    <div key={i} className={cx('skeleton h-3.5', i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
                ))}
            </div>
        );
    }
    return <div className={cx('skeleton', className || 'h-4 w-full')} aria-hidden="true" />;
}

const PROGRESS_TONES = {
    brand: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-zinc-400',
};

/**
 * Voortgangsbalk met role="progressbar". `label` is verplicht voor screenreaders (zichtbaar boven de balk,
 * of verborgen met hideLabel). `showValue` toont het percentage rechts.
 */
export function ProgressBar({ value = 0, max = 100, label, hideLabel = false, showValue = false, tone = 'brand', size = 'md', className = '' }) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (Number(value) / max) * 100)) : 0;
    return (
        <div className={cx('min-w-0', className)}>
            {(label && !hideLabel) || showValue ? (
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    {label && !hideLabel ? <span className="font-medium text-zinc-700">{label}</span> : <span />}
                    {showValue ? <span className="tabular-nums text-zinc-500">{Math.round(pct)}%</span> : null}
                </div>
            ) : null}
            <div
                className={cx('w-full overflow-hidden rounded-full bg-zinc-200/70', size === 'sm' ? 'h-1.5' : 'h-2')}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={Number(value)}
                aria-label={label}
            >
                <div className={cx('h-full rounded-full transition-[width] duration-300', PROGRESS_TONES[tone] ?? PROGRESS_TONES.brand)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ Tooltip, Kbd */

/**
 * Eenvoudige CSS-tooltip bij hover en toetsenbordfocus. Het kind (meestal een knop) krijgt aria-describedby.
 * Alleen voor aanvullende uitleg: essentiele info hoort in zichtbare tekst. side: top | bottom.
 */
export function Tooltip({ content, side = 'top', children, className = '' }) {
    const id = useId();
    const child = Children.only(children);
    const trigger = isValidElement(child) ? cloneElement(child, { 'aria-describedby': cx(child.props['aria-describedby'], id) }) : child;
    return (
        <span className={cx('group/tt relative inline-flex', className)}>
            {trigger}
            <span
                id={id}
                role="tooltip"
                className={cx(
                    'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop',
                    'invisible opacity-0 transition-opacity duration-100 group-focus-within/tt:visible group-focus-within/tt:opacity-100 group-hover/tt:visible group-hover/tt:opacity-100',
                    side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                )}
            >
                {content}
            </span>
        </span>
    );
}

/** Toetsweergave, bijv. <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>. */
export function Kbd({ children, className = '' }) {
    return <kbd className={cx('kbd', className)}>{children}</kbd>;
}

/* ------------------------------------------------------------------ Tabs */

/**
 * Toegankelijke tabs (WAI-ARIA tablist): pijltjes links/rechts, Home/End, roving tabindex.
 * items: [{ value, label, count?, icon? }]. Gecontroleerd via value + onChange, of ongecontroleerd met defaultValue.
 * variant: 'underline' (standaard) | 'pill'. Koppel panelen met <TabPanel idBase value active>.
 * Geef `idBase` mee als je TabPanel gebruikt (zelfde waarde op beide).
 */
export function Tabs({ items = [], value, defaultValue, onChange, variant = 'underline', idBase, label, className = '' }) {
    const autoId = useId();
    const base = idBase ?? autoId;
    const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
    const current = value !== undefined ? value : internal;
    const refs = useRef([]);

    const select = (v, i) => {
        if (value === undefined) setInternal(v);
        onChange?.(v);
        refs.current[i]?.focus();
    };

    const onKeyDown = (e, i) => {
        const last = items.length - 1;
        const map = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
        if (e.key in map) {
            e.preventDefault();
            const next = map[e.key];
            select(items[next].value, next);
        }
    };

    const pill = variant === 'pill';
    return (
        <div
            role="tablist"
            aria-label={label}
            className={cx(pill ? 'inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100/80 p-1' : 'flex gap-5 overflow-x-auto border-b border-zinc-200 scrollbar-none', className)}
        >
            {items.map((item, i) => {
                const active = item.value === current;
                return (
                    <button
                        key={item.value}
                        ref={(el) => (refs.current[i] = el)}
                        type="button"
                        role="tab"
                        id={`${base}-tab-${item.value}`}
                        aria-selected={active}
                        aria-controls={`${base}-panel-${item.value}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => select(item.value, i)}
                        onKeyDown={(e) => onKeyDown(e, i)}
                        className={cx(
                            'inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                            pill
                                ? cx('h-8 rounded-lg px-3', active ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5' : 'text-zinc-600 hover:text-zinc-900')
                                : cx('-mb-px h-10 rounded-t-md border-b-2 px-0.5', active ? 'border-indigo-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'),
                        )}
                    >
                        {renderIcon(item.icon, cx('h-4 w-4', active ? 'text-indigo-600' : 'text-zinc-400'))}
                        {item.label}
                        {item.count !== undefined && item.count !== null ? (
                            <span className={cx('rounded-full px-1.5 text-2xs font-semibold tabular-nums', active ? 'bg-indigo-100 text-indigo-800' : 'bg-zinc-200/70 text-zinc-600')}>{item.count}</span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

/** Paneel bij Tabs. Inactieve panelen worden niet gerenderd (zet `keepMounted` om ze verborgen te houden). */
export function TabPanel({ idBase, value, active, keepMounted = false, className = '', children }) {
    if (!active && !keepMounted) return null;
    return (
        <div role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} hidden={!active} tabIndex={0} className={cx('focus:outline-none', className)}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ Gegevens */

/**
 * Label/waarde-lijst (<dl>). items: [{ label, value, hint? }]; lege waarden tonen "Niet ingevuld".
 * columns: 1 | 2 | 3. layout: 'stacked' (label boven waarde) | 'inline' (label links, vanaf sm).
 */
export function KeyValue({ items = [], columns = 1, layout = 'stacked', className = '' }) {
    const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[columns] ?? '';
    const inline = layout === 'inline';
    return (
        <dl className={cx('grid gap-x-6', inline ? 'divide-y divide-zinc-100' : cx('gap-y-4', cols), className)}>
            {items.filter(Boolean).map((item, i) => {
                const empty = item.value === null || item.value === undefined || item.value === '';
                return (
                    <div key={item.key ?? (typeof item.label === 'string' ? item.label : i)} className={cx('min-w-0', inline && 'py-2.5 first:pt-0 last:pb-0 sm:grid sm:grid-cols-3 sm:gap-4')}>
                        <dt className="text-xs font-medium text-zinc-500">{item.label}</dt>
                        <dd className={cx('min-w-0 break-words text-sm', inline ? 'mt-0.5 sm:col-span-2 sm:mt-0' : 'mt-1', empty ? 'text-zinc-400' : 'text-zinc-900')}>
                            {empty ? 'Niet ingevuld' : item.value}
                            {item.hint ? <span className="mt-0.5 block text-xs text-zinc-500">{item.hint}</span> : null}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}

/** Alias van KeyValue. */
export const DescriptionList = KeyValue;

/**
 * Statistiektegel. `icon` (naam/element) toont een getinte tegel in `tone`; zonder icoon een accentbalk.
 * `trend` = { value: '+12%', direction: 'up'|'down'|'flat', positive?: boolean } (positive bepaalt groen/rood,
 * standaard: up = goed). `href` maakt de tegel klikbaar.
 */
export function Stat({ label, value, sub, href, tone = 'neutral', icon, trend }) {
    const toneBar = { neutral: 'bg-zinc-200', brand: 'bg-indigo-500', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500', info: 'bg-sky-500' }[tone] ?? 'bg-zinc-200';
    let trendNode = null;
    if (trend?.value) {
        const dir = trend.direction ?? 'flat';
        const good = trend.positive ?? dir === 'up';
        const color = dir === 'flat' ? 'text-zinc-500 bg-zinc-100' : good ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
        const dirLabel = dir === 'up' ? 'Gestegen' : dir === 'down' ? 'Gedaald' : 'Gelijk';
        trendNode = (
            <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums', color)}>
                {dir !== 'flat' ? <Icon name={dir === 'up' ? 'arrow-up-right' : 'arrow-down-right'} className="h-3 w-3" strokeWidth={2.25} /> : null}
                <span className="sr-only">{dirLabel}: </span>
                {trend.value}
            </span>
        );
    }
    const content = (
        <>
            {!icon && tone !== 'neutral' ? <span className={cx('absolute inset-y-4 left-0 w-1 rounded-r-full', toneBar)} aria-hidden="true" /> : null}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm font-medium text-zinc-500">{label}</div>
                {icon ? <IconTile icon={icon} tone={tone === 'neutral' ? 'neutral' : tone} size="sm" /> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="break-words text-2xl font-semibold tabular-nums tracking-display text-zinc-900">{value}</span>
                {trendNode}
            </div>
            {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
        </>
    );
    const base = 'card relative block p-4 sm:p-5';
    return href ? (
        <a href={href} className={cx(base, 'card-interactive', FOCUS)}>
            {content}
        </a>
    ) : (
        <div className={base}>{content}</div>
    );
}

/**
 * Regel in een activiteitenfeed. Render binnen <ActivityList>. icon + tone voor het bolletje,
 * children/title = tekst, meta = extra regel, time = tijdstip (string of <time>).
 */
export function ActivityItem({ icon = 'activity', tone = 'neutral', title, meta, time, children, className = '' }) {
    return (
        <li className={cx('group/act relative flex gap-3 pb-5 last:pb-0', className)}>
            <span className="absolute left-4 top-9 -bottom-0 w-px -translate-x-1/2 bg-zinc-200 group-last/act:hidden" aria-hidden="true" />
            <IconTile icon={icon} tone={tone} size="sm" className="relative ring-4 ring-white" />
            <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <div className="min-w-0 text-sm text-zinc-800">{title ?? children}</div>
                    {time ? <div className="shrink-0 text-xs tabular-nums text-zinc-400">{time}</div> : null}
                </div>
                {meta ? <div className="mt-0.5 text-xs text-zinc-500">{meta}</div> : null}
                {title && children ? <div className="mt-2 text-sm text-zinc-600">{children}</div> : null}
            </div>
        </li>
    );
}

/** Lijst-container voor ActivityItem. */
export function ActivityList({ className = '', children, ...props }) {
    return (
        <ul className={cx('min-w-0', className)} {...props}>
            {children}
        </ul>
    );
}

/* ------------------------------------------------------------------ Formulieren */

/** Basisklassen voor input/select/textarea (zelfde als .input in Blade). */
export const inputClasses = 'input';

/**
 * Formulierveld: zichtbaar label, hint of foutmelding onder het veld. `id` koppelt label aan input.
 * Zet op de input zelf aria-invalid en aria-describedby={`${id}-error`} / {`${id}-hint`} voor screenreaders.
 */
export function Field({ id, label, hint, error, required = false, className = '', children }) {
    return (
        <div className={cx('min-w-0', className)}>
            {label ? (
                <label htmlFor={id} className="label mb-1.5">
                    {label}
                    {required ? <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span> : null}
                </label>
            ) : null}
            {children}
            {hint && !error ? <p id={id ? `${id}-hint` : undefined} className="field-hint">{hint}</p> : null}
            {error ? (
                <p id={id ? `${id}-error` : undefined} className="field-error" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Tabelklassen. Gebruik: <div className={tableClasses.wrapper}><table className={tableClasses.table}>
 * <thead className={tableClasses.thead}><tr><th className={tableClasses.th}>..</th></tr></thead>
 * <tbody className={tableClasses.tbody}><tr className={tableClasses.tr}><td className={tableClasses.td}>..</td></tr></tbody></table></div>
 */
export const tableClasses = {
    wrapper: 'table-wrap',
    table: 'table-base',
    thead: 'table-head',
    th: 'table-th',
    tbody: 'divide-y divide-zinc-100',
    tr: 'table-row',
    td: 'table-td',
};

/*
 * Bestandskiezer met Nederlandse knop en statustekst in plaats van de native
 * "Choose Files / No file chosen". Het echte input blijft focusbaar (sr-only),
 * dus Tab + Enter/Spatie werkt; de focusring staat op de knop via focus-within.
 */
export function FilePicker({ id, multiple = false, accept, disabled = false, onChange, files = [], buttonLabel, className = '', describedBy }) {
    const list = Array.isArray(files) ? files.filter(Boolean) : files ? [files] : [];
    const statusId = id ? `${id}-status` : undefined;
    const status = list.length === 0 ? 'Geen bestand gekozen' : list.length === 1 ? list[0]?.name || '1 bestand gekozen' : `${list.length} bestanden gekozen`;
    return (
        <div className={cx('flex min-w-0 flex-wrap items-center gap-3', className)}>
            <label
                className={cx(
                    buttonClasses({ variant: 'secondary', size: 'md' }),
                    'focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
            >
                <input id={id} type="file" className="sr-only" multiple={multiple} accept={accept} disabled={disabled} aria-describedby={cx(statusId, describedBy) || undefined} onChange={onChange} />
                <Icon name="upload" className="h-4 w-4 text-zinc-500" />
                {buttonLabel ?? (multiple ? 'Bestanden kiezen' : 'Bestand kiezen')}
            </label>
            <span id={statusId} className="min-w-0 truncate text-sm text-zinc-600" aria-live="polite">
                {status}
            </span>
        </div>
    );
}
