import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Icon } from '../../../components/icons';
import StatusBadge, { FOCUS_SCOPE } from '../../../components/StatusBadge';
import {
    Avatar,
    Button,
    Card,
    CardHeader,
    EmptyState,
    PageHeader,
    ProgressBar,
    Skeleton,
    Spinner,
    Stat,
    StatusDot,
    Tooltip,
    buttonClasses,
    cx,
    inputClasses,
    tableClasses,
} from '../../../components/ui';

const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

const STATUS_TABS = [
    { value: 'alle', label: 'Alle', tone: null },
    { value: 'demo_aangevraagd', label: 'Demo aangevraagd', tone: 'info' },
    { value: 'proefperiode', label: 'Demo', tone: 'warning' },
    { value: 'actief', label: 'Actief', tone: 'success' },
    { value: 'opgezegd', label: 'Opgezegd', tone: 'danger' },
    { value: 'verloren', label: 'Verloren', tone: 'neutral' },
];

const SORT_DEFAULT_DIR = {
    naam: 'asc',
    status: 'asc',
    plaats: 'asc',
    omzet: 'desc',
    demo_eind: 'asc',
    volgende_actie: 'asc',
    bijgewerkt: 'desc',
    actief_vanaf: 'desc',
};

const SORT_OPTIONS = [
    { value: 'bijgewerkt:desc', label: 'Laatst bijgewerkt' },
    { value: 'naam:asc', label: 'Naam (A-Z)' },
    { value: 'naam:desc', label: 'Naam (Z-A)' },
    { value: 'volgende_actie:asc', label: 'Volgende actie (eerst)' },
    { value: 'demo_eind:asc', label: 'Demo eindigt (eerst)' },
    { value: 'omzet:desc', label: 'MRR (hoog-laag)' },
    { value: 'plaats:asc', label: 'Plaats (A-Z)' },
    { value: 'status:asc', label: 'Status' },
    { value: 'actief_vanaf:desc', label: 'Actief vanaf (nieuwste)' },
];

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const MODULE_CHIP_LIMIT = 2;

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
        return new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));
    } catch {
        return String(isoString);
    }
}

function formatShortDate(value) {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(value instanceof Date ? value : new Date(value));
    } catch {
        return String(value);
    }
}

function formatDueShort(isoString) {
    if (!isoString) return null;
    try {
        const date = new Date(isoString);
        const sameYear = date.getFullYear() === new Date().getFullYear();
        return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit' }).format(date);
    } catch {
        return String(isoString);
    }
}

function parseDateOnly(value) {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysFromToday(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date.getTime());
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function toLocalDateInput(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

/* ------------------------------------------------------------------ Celinhoud */

// Demo-einddatum met een kleine voortgangsbalk (verstreken deel van de demo) en een tekst bij bijna/verlopen.
function DemoEnd({ value, start, status, computed = false }) {
    const end = ['proefperiode', 'demo_gepland', 'demo_aangevraagd'].includes(status) ? parseDateOnly(value) : null;
    if (!end) return <span className="text-zinc-400">-</span>;
    const days = daysFromToday(end);
    const running = status === 'proefperiode';
    const begin = parseDateOnly(start);
    const total = begin ? Math.max(1, Math.round((end - begin) / 86400000)) : null;
    const elapsed = total !== null ? Math.min(total, Math.max(0, total - days)) : null;
    let tone = 'brand';
    let note = days === 0 ? 'Eindigt vandaag' : days > 0 ? `Nog ${days} ${days === 1 ? 'dag' : 'dagen'}` : `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dag' : 'dagen'} verlopen`;
    let noteClass = 'text-zinc-500';
    if (running && days < 0) {
        tone = 'danger';
        noteClass = 'font-medium text-rose-700';
    } else if (running && days <= 3) {
        tone = 'warning';
        noteClass = 'font-medium text-amber-800';
    }
    if (!running) note = 'Nog niet gestart';
    return (
        <div className="w-36 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
                <span className={cx('whitespace-nowrap text-sm', running && days < 0 ? 'font-semibold text-rose-700' : 'text-zinc-800')}>{formatShortDate(end)}</span>
                {computed ? (
                    <span className="cursor-help text-2xs text-zinc-400" title="Niet opgeslagen: berekend uit startdatum en demoduur">
                        berekend
                        <span className="sr-only">, niet opgeslagen maar berekend uit startdatum en demoduur</span>
                    </span>
                ) : null}
            </div>
            {running && elapsed !== null ? (
                <ProgressBar value={elapsed} max={total} size="sm" tone={tone} label={`Demo ${elapsed} van ${total} dagen verstreken`} hideLabel className="mt-1.5" />
            ) : null}
            <div className={cx('mt-1 text-xs', noteClass)}>{note}</div>
        </div>
    );
}

function NextAction({ action, compact = false }) {
    if (!action) return <span className="text-sm text-zinc-400">Geen actie gepland</span>;
    const due = action.due_at ? new Date(action.due_at) : null;
    const overdue = due && due.getTime() < Date.now();
    const isAppointment = action.soort === 'Afspraak';
    return (
        <div className={cx('flex min-w-0 items-start gap-2', !compact && 'max-w-[15rem]')}>
            <span
                className={cx('mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md', overdue ? 'bg-rose-50 text-rose-700' : isAppointment ? 'bg-sky-50 text-sky-700' : 'bg-zinc-100 text-zinc-600')}
                aria-hidden="true"
            >
                <Icon name={isAppointment ? 'calendar' : 'check-square'} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
                <div className="truncate text-sm text-zinc-800" title={action.titel}>
                    <span className="sr-only">{action.soort}: </span>
                    {action.titel || action.soort}
                </div>
                <div className={cx('text-xs', overdue ? 'font-medium text-rose-700' : 'text-zinc-500')}>
                    {due ? `${formatDueShort(action.due_at)}${overdue ? ', te laat' : ''}` : `${action.soort}, geen datum`}
                </div>
            </div>
        </div>
    );
}

// Bovenste actieve modules als chips, de rest als "+n" met de volledige lijst in de tooltip.
function ModuleChips({ modules, limit = MODULE_CHIP_LIMIT }) {
    const list = Array.isArray(modules) ? modules : [];
    if (list.length === 0) return <span className="text-sm text-zinc-400">Geen modules</span>;
    const shown = list.slice(0, limit);
    const rest = list.length - shown.length;
    return (
        <ul className="flex min-w-0 flex-wrap items-center gap-1" aria-label={`Actieve modules: ${list.join(', ')}`}>
            {shown.map((name) => (
                <li key={name} className="inline-flex max-w-[9rem] items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-800 ring-1 ring-inset ring-indigo-200/70">
                    <Icon name="package" className="h-3 w-3 shrink-0 text-indigo-600" />
                    <span className="truncate">{name}</span>
                </li>
            ))}
            {rest > 0 ? (
                <li>
                    <Tooltip content={list.slice(limit).join(', ')}>
                        <span tabIndex={0} className="inline-flex cursor-default items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600 focus-ring">
                            +{rest}
                            <span className="sr-only"> meer modules</span>
                        </span>
                    </Tooltip>
                </li>
            ) : null}
        </ul>
    );
}

function CompanyIdentity({ company, size = 'md', linked = true }) {
    const name = company.bedrijfsnaam || 'Naamloos bedrijf';
    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar name={name} size={size} />
            <div className="min-w-0">
                {linked && company.show_url ? (
                    <Link href={company.show_url} className="block truncate rounded font-semibold text-zinc-900 hover:text-indigo-700" title={name}>
                        {name}
                    </Link>
                ) : (
                    <span className="block truncate font-semibold text-zinc-900" title={name}>
                        {name}
                    </span>
                )}
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Icon name="map-pin" className="h-3 w-3 shrink-0 text-zinc-400" />
                    <span className="truncate">{company.plaats || 'Plaats onbekend'}</span>
                </span>
            </div>
        </div>
    );
}

// Snelle contactknoppen (bellen/mailen). In de tabel met tooltip (nummer/adres), op kaarten met title zodat
// een tooltip aan de schermrand geen horizontale scroll veroorzaakt. `reserve` houdt lege plekken vrij voor uitlijning.
function ContactActions({ company, large = false, reserve = false }) {
    const name = company.bedrijfsnaam || 'klant';
    const size = large ? 'md' : 'sm';
    const items = [
        company.hoofd_telefoon ? { key: 'tel', href: telHref(company.hoofd_telefoon), label: `Bel ${name}`, tip: company.hoofd_telefoon, icon: 'phone' } : { key: 'tel' },
        company.hoofd_email ? { key: 'mail', href: `mailto:${company.hoofd_email}`, label: `Mail ${name}`, tip: company.hoofd_email, icon: 'mail' } : { key: 'mail' },
    ];
    return (
        <>
            {items.map((item) => {
                if (!item.href) return reserve ? <span key={item.key} className="inline-block h-8 w-8" aria-hidden="true" /> : null;
                const link = (
                    <a href={item.href} className={buttonClasses({ variant: 'ghost', size, iconOnly: true })} aria-label={item.label} title={large ? item.tip : undefined}>
                        <Icon name={item.icon} className="h-4 w-4" />
                    </a>
                );
                return large ? <React.Fragment key={item.key}>{link}</React.Fragment> : <Tooltip key={item.key} content={item.tip}>{link}</Tooltip>;
            })}
        </>
    );
}

function SortHeader({ field, label, sort, dir, onSort, className, align = 'left' }) {
    const active = sort === field;
    const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
        <th scope="col" aria-sort={ariaSort} className={cx(tableClasses.th, 'px-3', align === 'right' && 'text-right', className)}>
            <button
                type="button"
                onClick={() => onSort(field)}
                className={cx('group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-zinc-100 hover:text-zinc-900', active && 'text-zinc-900')}
            >
                {label}
                <Icon
                    name={active ? (dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'}
                    className={cx('h-3.5 w-3.5', active ? 'text-indigo-700' : 'text-zinc-300 group-hover/sort:text-zinc-500')}
                    strokeWidth={2}
                />
            </button>
        </th>
    );
}

function Pagination({ links, lastPage }) {
    if (!Array.isArray(links) || links.length <= 1) return null;
    if (lastPage !== undefined && lastPage !== null && Number(lastPage) <= 1) return null;
    return (
        <nav aria-label="Paginering" className="flex flex-wrap items-center gap-1">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        preserveScroll={false}
                        className={cx(
                            'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
                            link.active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-white hover:shadow-card'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="inline-flex h-9 min-w-[2.25rem] cursor-not-allowed items-center justify-center rounded-lg px-3 text-sm text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            )}
        </nav>
    );
}

function ListEmptyState({ isTrashView, hasActiveFilters, onClear, createUrl, bare = false }) {
    if (hasActiveFilters) {
        return (
            <EmptyState
                bare={bare}
                illustration="search"
                title="Geen klanten gevonden"
                description="Geen enkele klant past bij deze zoekterm of filters. Probeer een kortere zoekterm of wis de filters."
                action={<Button variant="secondary" icon="x" onClick={onClear}>Filters wissen</Button>}
            />
        );
    }
    if (isTrashView) {
        return <EmptyState bare={bare} illustration="inbox" title="De prullenbak is leeg" description="Verwijderde klanten komen hier terecht. Je kunt ze daarna herstellen of definitief verwijderen." />;
    }
    return (
        <EmptyState
            bare={bare}
            illustration="people"
            title="Nog geen klanten"
            description="Voeg je eerste garagebedrijf toe om demo's, modules en incasso op een plek bij te houden."
            action={createUrl ? <Link href={createUrl} className={buttonClasses()}><Icon name="plus" className="h-4 w-4" />Nieuwe klant</Link> : null}
        />
    );
}

// Klik op een rij/kaart opent de klant, behalve bij klikken op links, knoppen of invoervelden.
function isInteractiveTarget(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest('a, button, input, select, textarea, label, [tabindex]')) return true;
    const selection = window.getSelection ? window.getSelection() : null;
    return Boolean(selection && selection.toString().length > 0);
}

/* ------------------------------------------------------------------ Kaart */

function CompanyCard({ company, isTrashView, bulkEnabled, isSelected, onToggle, onOpen, onRestore, onForceDelete, statusLabels }) {
    const inDemo = ['demo_aangevraagd', 'proefperiode'].includes(company.status);
    return (
        <article
            onClick={(e) => onOpen(e, company)}
            className={cx(
                'card flex min-w-0 flex-col p-4 transition-[box-shadow,border-color] duration-150',
                company.show_url && 'cursor-pointer hover:border-zinc-300 hover:shadow-card-hover',
                isSelected && 'border-indigo-300 ring-2 ring-indigo-200'
            )}
        >
            <div className="flex items-start gap-3">
                {bulkEnabled ? (
                    <input type="checkbox" className="checkbox mt-3 h-5 w-5 shrink-0" checked={isSelected} onChange={() => onToggle(company.id)} aria-label={`Selecteer ${company.bedrijfsnaam}`} />
                ) : null}
                <div className="min-w-0 flex-1">
                    <CompanyIdentity company={company} />
                </div>
                <StatusBadge status={company.status} labels={statusLabels} className="mt-1 shrink-0" />
            </div>

            {!isTrashView ? (
                <div className="mt-4">
                    <ModuleChips modules={company.modules} limit={3} />
                </div>
            ) : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-zinc-50/80 p-3 text-sm">
                <div className="min-w-0">
                    <dt className="text-xs text-zinc-500">MRR excl.</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">{formatEuro(company.omzet_excl)}</dd>
                </div>
                {inDemo && !isTrashView ? (
                    <div className="min-w-0">
                        <dt className="text-xs text-zinc-500">Demo eindigt</dt>
                        <dd className="mt-0.5">
                            <DemoEnd value={company.demo_eind_op} start={company.demo_start_op} status={company.status} computed={company.demo_eind_berekend} />
                        </dd>
                    </div>
                ) : (
                    <div className="min-w-0">
                        <dt className="text-xs text-zinc-500">{isTrashView ? 'Verwijderd op' : 'Gebruikers'}</dt>
                        <dd className="mt-0.5 tabular-nums text-zinc-800">{isTrashView ? formatDateTime(company.deleted_at) : company.actieve_seats}</dd>
                    </div>
                )}
                {!isTrashView ? (
                    <div className="col-span-2 min-w-0">
                        <dt className="mb-1 text-xs text-zinc-500">Volgende actie</dt>
                        <dd>
                            <NextAction action={company.volgende_actie} compact />
                        </dd>
                    </div>
                ) : null}
            </dl>

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                {isTrashView ? (
                    <>
                        {company.restore_url ? (
                            <Button variant="secondary" size="md" icon="refresh" className="flex-1" onClick={() => onRestore(company)}>
                                Herstellen
                            </Button>
                        ) : null}
                        {company.force_delete_url ? (
                            <Button variant="danger-ghost" size="md" icon="trash" className="flex-1" onClick={() => onForceDelete(company)}>
                                Definitief verwijderen
                            </Button>
                        ) : null}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1">
                            <ContactActions company={company} large />
                        </div>
                        <span className="ml-auto text-xs text-zinc-400">Bijgewerkt {formatShortDate(company.updated_at)}</span>
                        {company.show_url ? (
                            <Link href={company.show_url} className={buttonClasses({ variant: 'secondary', size: 'sm' })} aria-label={`Open ${company.bedrijfsnaam}`}>
                                Open
                                <Icon name="arrow-right" className="h-4 w-4" />
                            </Link>
                        ) : null}
                    </>
                )}
            </div>
        </article>
    );
}

function CardSkeleton() {
    return (
        <div className="card p-4" aria-hidden="true">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
            </div>
            <Skeleton className="mt-4 h-5 w-1/2" />
            <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        </div>
    );
}

/* ------------------------------------------------------------------ Pagina */

export default function Index({ companies, totals, statusCounts, trashCount, filters, statusLabels, sourceOptions, urls }) {
    const safeCompanies = companies && typeof companies === 'object' ? companies : { data: [], links: [], total: 0, per_page: 15 };
    const rows = Array.isArray(safeCompanies.data) ? safeCompanies.data : [];
    const safeFilters = filters && typeof filters === 'object' ? filters : {};
    const safeStatusLabels = statusLabels && typeof statusLabels === 'object' ? statusLabels : {};
    const safeSourceOptions = Array.isArray(sourceOptions) ? sourceOptions : [];
    const safeCounts = statusCounts && typeof statusCounts === 'object' ? statusCounts : {};
    const safeUrls = urls && typeof urls === 'object' ? urls : { index: '/garagebedrijven', create: '/garagebedrijven/nieuw', purge_trash: null };

    const confirm = useConfirm();
    const [filtering, setFiltering] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const { data, setData } = useForm({
        view: safeFilters.view || 'actief',
        search: safeFilters.search || '',
        status: safeFilters.status || 'alle',
        tag: safeFilters.tag || '',
        bron: safeFilters.bron || '',
        sort: safeFilters.sort || 'bijgewerkt',
        dir: safeFilters.dir || 'desc',
        perPage: safeFilters.perPage || safeCompanies.per_page || 15,
        weergave: safeFilters.weergave === 'kaarten' ? 'kaarten' : 'lijst',
    });
    // Use the view the server actually rendered; it falls back to 'actief' when the trash is unavailable.
    const isTrashView = (safeFilters.view || data.view) === 'prullenbak';
    // Status en sortering zoals de server ze heeft toegepast (ongeldige waarden vallen terug op de standaard).
    const activeStatus = safeFilters.status || 'alle';
    const activeSort = safeFilters.sort || data.sort;
    const activeDir = safeFilters.dir || data.dir;
    const cardView = data.weergave === 'kaarten';
    const nowDate = new Date();
    const exportForm = useForm({
        maand: String(nowDate.getMonth() + 1),
        jaar: String(nowDate.getFullYear()),
        uitvoerdatum: toLocalDateInput(nowDate),
    });
    const jaarOpties = [];
    for (let i = nowDate.getFullYear() - 1; i <= nowDate.getFullYear() + 2; i += 1) jaarOpties.push(String(i));

    // Skeleton pas na een korte vertraging tonen, zodat snelle verzoeken niet knipperen.
    useEffect(() => {
        if (!filtering) {
            setShowSkeleton(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setShowSkeleton(true), 200);
        return () => window.clearTimeout(timer);
    }, [filtering]);

    const restoreCompany = async (company) => {
        const ok = await confirm({ title: 'Klant herstellen', message: `Weet je zeker dat je "${company.bedrijfsnaam}" wilt herstellen?`, confirmText: 'Herstel', cancelText: 'Annuleren' });
        if (!ok) return;
        router.post(company.restore_url, {}, { preserveScroll: true });
    };

    const forceDeleteCompany = async (company) => {
        const ok = await confirm({
            title: 'Definitief verwijderen',
            message: `Weet je zeker dat je "${company.bedrijfsnaam}" definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
            confirmText: 'Definitief verwijderen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.delete(company.force_delete_url, { preserveScroll: true });
    };

    const purgeTrash = async () => {
        const ok = await confirm({
            title: 'Prullenbak leegmaken',
            message: 'Weet je zeker dat je alle klanten in de prullenbak definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
            confirmText: 'Alles verwijderen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.delete(safeUrls.purge_trash, { preserveScroll: true });
    };

    // Alleen niet-standaard waarden in de URL zetten, zodat links kort en deelbaar blijven.
    const toQuery = (values) => {
        const query = {};
        if (values.view && values.view !== 'actief') query.view = values.view;
        if (values.search && values.search.trim() !== '') query.search = values.search.trim();
        if (values.status && values.status !== 'alle') query.status = values.status;
        if (values.tag && values.tag.trim() !== '') query.tag = values.tag.trim();
        if (values.bron) query.bron = values.bron;
        if (values.sort && !(values.sort === 'bijgewerkt' && values.dir === 'desc')) {
            query.sort = values.sort;
            query.dir = values.dir;
        }
        if (Number(values.perPage) !== 15) query.perPage = values.perPage;
        if (values.weergave === 'kaarten') query.weergave = 'kaarten';
        return query;
    };

    const runFilter = (nextData, options = {}) => {
        router.get(safeUrls.index, toQuery(nextData), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setFiltering(true),
            onFinish: () => setFiltering(false),
            ...options,
        });
    };

    const lastSearchRef = useRef(data.search);
    const lastTagRef = useRef(data.tag);

    const updateAndRun = (changes, options) => {
        const nextData = { ...data, ...changes };
        if ('search' in changes) lastSearchRef.current = nextData.search;
        if ('tag' in changes) lastTagRef.current = nextData.tag;
        setData(nextData);
        runFilter(nextData, options);
    };

    // Bij wisselen tussen Klanten en Prullenbak de filters resetten, anders lijkt de andere lijst leeg.
    const switchView = (view) => {
        updateAndRun({ view, search: '', status: 'alle', tag: '', bron: '' }, { preserveScroll: false });
    };

    // Lijst/kaarten direct omzetten en in de URL onthouden.
    const switchLayout = (weergave) => {
        if (weergave === data.weergave) return;
        updateAndRun({ weergave });
    };

    const submit = (event) => {
        event.preventDefault();
        lastSearchRef.current = data.search;
        lastTagRef.current = data.tag;
        runFilter(data);
    };

    const submitOnEnter = (event) => {
        if (event.key === 'Enter') submit(event);
    };

    // Live zoeken: na 300 ms zonder typen automatisch filteren.
    useEffect(() => {
        if (data.search === lastSearchRef.current && data.tag === lastTagRef.current) return undefined;
        const timer = window.setTimeout(() => {
            lastSearchRef.current = data.search;
            lastTagRef.current = data.tag;
            runFilter(data);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [data.search, data.tag]);

    const extraFilterCount = (data.tag && data.tag.trim() !== '' ? 1 : 0) + (data.bron ? 1 : 0);
    const searchActive = Boolean(data.search && data.search.trim() !== '');
    const hasActiveFilters = extraFilterCount > 0 || searchActive || activeStatus !== 'alle';

    const clearFilters = () => updateAndRun({ search: '', status: 'alle', tag: '', bron: '' });

    const onSort = (field) => {
        const dir = activeSort === field ? (activeDir === 'asc' ? 'desc' : 'asc') : SORT_DEFAULT_DIR[field] || 'asc';
        updateAndRun({ sort: field, dir });
    };

    const openCompany = (event, company) => {
        if (!company.show_url || isInteractiveTarget(event)) return;
        if (event.metaKey || event.ctrlKey) {
            window.open(company.show_url, '_blank', 'noopener');
            return;
        }
        router.visit(company.show_url);
    };

    // Selectie voor bulkacties (alleen binnen de huidige pagina).
    const pageIds = useMemo(() => rows.map((row) => row.id), [rows]);
    const pageKey = pageIds.join(',');
    const [selected, setSelected] = useState([]);
    useEffect(() => {
        setSelected((prev) => prev.filter((id) => pageIds.includes(id)));
    }, [pageKey]);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const someSelected = selected.length > 0 && !allSelected;
    const selectAllRef = useRef(null);
    const selectAllCardsRef = useRef(null);
    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
        if (selectAllCardsRef.current) selectAllCardsRef.current.indeterminate = someSelected;
    }, [someSelected, cardView]);
    const toggleAll = () => setSelected(allSelected ? [] : pageIds);
    const toggleOne = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const bulkEnabled = !isTrashView;

    const [bulkTag, setBulkTag] = useState('');
    const [bulkTagOpen, setBulkTagOpen] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkTagError, setBulkTagError] = useState('');

    const exportSelected = () => {
        if (!safeUrls.export_csv || selected.length === 0) return;
        const query = new URLSearchParams({ ids: selected.join(',') });
        window.location.href = `${safeUrls.export_csv}?${query.toString()}`;
    };

    const addTagToSelected = (event) => {
        event.preventDefault();
        const tag = bulkTag.trim();
        if (!safeUrls.bulk_tag || !tag || selected.length === 0) return;
        if (tag.includes(',')) {
            setBulkTagError('Een tag mag geen komma bevatten.');
            return;
        }
        setBulkTagError('');
        router.post(
            safeUrls.bulk_tag,
            { ids: selected, tag },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBulkBusy(true),
                onFinish: () => setBulkBusy(false),
                onError: (errors) => setBulkTagError(errors?.tag || errors?.ids || 'De tag kon niet worden toegevoegd.'),
                onSuccess: () => {
                    setBulkTag('');
                    setBulkTagOpen(false);
                    setSelected([]);
                },
            }
        );
    };

    const [exportOpen, setExportOpen] = useState(false);
    const exportIncasso = () => {
        if (!safeUrls.export_incasso_batch || !exportForm.data.uitvoerdatum) return;
        const query = new URLSearchParams({ maand: exportForm.data.maand, jaar: exportForm.data.jaar, uitvoerdatum: exportForm.data.uitvoerdatum });
        window.location.href = `${safeUrls.export_incasso_batch}?${query.toString()}`;
    };

    // "Volgende actie" alleen tonen als minstens een rij een waarde heeft (en pas vanaf xl).
    const showNextAction = !isTrashView && rows.some((c) => c?.volgende_actie);
    const columnCount = isTrashView ? 5 : 6 + (showNextAction ? 1 : 0) + (bulkEnabled ? 1 : 0);
    const totalCount = Number(safeCompanies.total || 0);
    const skeletonRows = Math.min(Math.max(rows.length, 4), 8);

    const filterChips = [
        activeStatus !== 'alle' ? { key: 'status', label: `Status: ${safeStatusLabels[activeStatus] || activeStatus}`, clear: { status: 'alle' } } : null,
        searchActive ? { key: 'search', label: `Zoek: "${data.search.trim()}"`, clear: { search: '' } } : null,
        data.tag.trim() ? { key: 'tag', label: `Tag: ${data.tag.trim()}`, clear: { tag: '' } } : null,
        data.bron ? { key: 'bron', label: `Bron: ${SOURCE_LABELS[data.bron] || data.bron}`, clear: { bron: '' } } : null,
    ].filter(Boolean);

    const segmentClass = (active) =>
        cx(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-ring',
            active ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5' : 'text-zinc-600 hover:text-zinc-900'
        );

    const TD = cx(tableClasses.td, 'px-3');
    const TH = cx(tableClasses.th, 'px-3');

    return (
        <div className={cx('space-y-5', FOCUS_SCOPE)}>
            <Head title={isTrashView ? 'Prullenbak klanten' : 'Klanten'} />

            <PageHeader
                title={isTrashView ? 'Prullenbak' : 'Klanten'}
                description={isTrashView ? 'Herstel verwijderde klanten of verwijder ze definitief.' : 'Alle garagebedrijven met hun status, modules en wat er als volgende moet gebeuren.'}
                actions={
                    <>
                        {!isTrashView && safeUrls.export_incasso_batch ? (
                            <Button variant="secondary" icon="download" onClick={() => setExportOpen((open) => !open)} aria-expanded={exportOpen} aria-controls="incasso-export-panel">
                                Incasso exporteren
                            </Button>
                        ) : null}
                        {!isTrashView && safeUrls.create ? (
                            <Link href={safeUrls.create} className={buttonClasses()}>
                                <Icon name="plus" className="h-4 w-4" />
                                Nieuwe klant
                            </Link>
                        ) : null}
                        {isTrashView && safeUrls.purge_trash && Number(trashCount || 0) > 0 ? (
                            <Button variant="danger" icon="trash" onClick={purgeTrash}>
                                Prullenbak leegmaken
                            </Button>
                        ) : null}
                    </>
                }
            >
                <div className="mt-4 inline-flex rounded-xl bg-zinc-200/60 p-1" role="group" aria-label="Lijst kiezen">
                    <button type="button" onClick={() => switchView('actief')} aria-pressed={!isTrashView} className={segmentClass(!isTrashView)}>
                        <Icon name="users" className="h-4 w-4" />
                        Klanten
                    </button>
                    <button type="button" onClick={() => switchView('prullenbak')} aria-pressed={isTrashView} className={segmentClass(isTrashView)}>
                        <Icon name="trash" className="h-4 w-4" />
                        Prullenbak
                        <span className="rounded-full bg-zinc-200 px-1.5 text-2xs font-semibold tabular-nums text-zinc-700">{Number(trashCount || 0)}</span>
                    </button>
                </div>
            </PageHeader>

            {!isTrashView ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Stat
                        icon="building"
                        tone="brand"
                        label={activeStatus === 'alle' && extraFilterCount === 0 && !searchActive ? 'Bedrijven' : 'Bedrijven (gefilterd)'}
                        value={Number(totals?.bedrijven ?? totalCount).toLocaleString('nl-NL')}
                    />
                    <Stat icon="euro" tone="success" label="MRR actieve klanten" value={formatEuro(totals?.omzet_excl ?? 0)} sub="Excl. btw, alleen status Actief" />
                    <Stat icon="sparkles" tone="warning" label="Demo-pijplijn" value={formatEuro(totals?.omzet_demo_excl ?? 0)} sub="Excl. btw, klanten in demo" />
                </div>
            ) : null}

            {!isTrashView && exportOpen ? (
                <Card id="incasso-export-panel" aria-labelledby="incasso-export-title">
                    <CardHeader
                        icon="credit-card"
                        title={<span id="incasso-export-title">ING incasso exporteren</span>}
                        description="Alle klanten met status Actief en complete SEPA-gegevens komen in de batch."
                        actions={<Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Incasso exporteren sluiten" onClick={() => setExportOpen(false)} />}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                        <div>
                            <label className="label mb-1.5" htmlFor="exportForm-maand">Maand</label>
                            <select id="exportForm-maand" className={inputClasses} value={exportForm.data.maand} onChange={(e) => exportForm.setData('maand', e.target.value)}>
                                {MONTHS.map((label, i) => (
                                    <option key={label} value={String(i + 1)}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label mb-1.5" htmlFor="exportForm-jaar">Jaar</label>
                            <select id="exportForm-jaar" className={inputClasses} value={exportForm.data.jaar} onChange={(e) => exportForm.setData('jaar', e.target.value)}>
                                {jaarOpties.map((jaar) => (
                                    <option key={jaar} value={jaar}>{jaar}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label mb-1.5" htmlFor="exportForm-uitvoerdatum">Uitvoerdatum</label>
                            <input id="exportForm-uitvoerdatum" type="date" className={inputClasses} value={exportForm.data.uitvoerdatum} onChange={(e) => exportForm.setData('uitvoerdatum', e.target.value)} />
                        </div>
                        <Button icon="download" onClick={exportIncasso} disabled={!exportForm.data.uitvoerdatum || !safeUrls.export_incasso_batch}>
                            Exporteren
                        </Button>
                    </div>
                </Card>
            ) : null}

            {/* Werkbalk: statuspillen, zoeken, filters en weergave */}
            <Card padded={false}>
                <nav aria-label="Filter op status" className="scrollbar-none overflow-x-auto border-b border-zinc-100 px-3 py-3 sm:px-4">
                    <ul className="flex min-w-max gap-1.5">
                        {STATUS_TABS.map((tab) => {
                            const active = activeStatus === tab.value;
                            const label = tab.value === 'alle' ? tab.label : safeStatusLabels[tab.value] || tab.label;
                            return (
                                <li key={tab.value}>
                                    <button
                                        type="button"
                                        onClick={() => updateAndRun({ status: tab.value })}
                                        aria-pressed={active}
                                        className={cx(
                                            'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors focus-ring',
                                            active ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
                                        )}
                                    >
                                        {tab.tone ? <StatusDot tone={tab.tone} /> : <Icon name="layers" className={cx('h-4 w-4', active ? 'text-white/80' : 'text-zinc-400')} />}
                                        {label}
                                        <span className={cx('rounded-full px-1.5 text-2xs font-semibold tabular-nums', active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600')}>
                                            {Number(safeCounts[tab.value] || 0).toLocaleString('nl-NL')}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <form id="gc-filters" role="search" onSubmit={submit} className="flex flex-col gap-3 p-3 sm:px-4 lg:flex-row lg:items-end">
                    <div className="flex min-w-0 flex-1 items-end gap-2">
                        <div className="min-w-0 flex-1">
                            <label className="sr-only" htmlFor="gc-search">Zoeken</label>
                            <div className="relative">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    id="gc-search"
                                    type="search"
                                    className={cx(inputClasses, 'pl-9 pr-9')}
                                    aria-describedby="gc-search-hint"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                    onKeyDown={submitOnEnter}
                                    placeholder="Zoek op bedrijf, e-mail, telefoon, plaats of IBAN"
                                />
                                {filtering ? (
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                                        <Spinner className="h-4 w-4" />
                                    </span>
                                ) : null}
                            </div>
                            <p id="gc-search-hint" className="sr-only">De lijst wordt bijgewerkt terwijl je typt.</p>
                        </div>
                        <Button
                            variant="secondary"
                            icon="sliders"
                            className="lg:hidden"
                            onClick={() => setFiltersOpen((open) => !open)}
                            aria-expanded={filtersOpen}
                            aria-controls="gc-filter-fields"
                        >
                            Filters
                            {extraFilterCount > 0 ? (
                                <span className="rounded-full bg-indigo-600 px-1.5 text-2xs font-semibold text-white">
                                    {extraFilterCount}
                                    <span className="sr-only"> actief</span>
                                </span>
                            ) : null}
                        </Button>
                    </div>

                    <div id="gc-filter-fields" className={cx('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-end', filtersOpen ? 'grid' : 'hidden lg:flex')}>
                        <div className="min-w-0 lg:w-36">
                            <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor="gc-tag">Tag</label>
                            <div className="relative">
                                <Icon name="tag" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input id="gc-tag" className={cx(inputClasses, 'pl-9')} value={data.tag} onChange={(e) => setData('tag', e.target.value)} onKeyDown={submitOnEnter} placeholder="bijv. premium" />
                            </div>
                        </div>
                        <div className="min-w-0 lg:w-40">
                            <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor="gc-bron">Bron</label>
                            <select id="gc-bron" className={inputClasses} value={data.bron} onChange={(e) => updateAndRun({ bron: e.target.value })}>
                                <option value="">Alle bronnen</option>
                                {safeSourceOptions.map((source) => (
                                    <option key={source} value={source}>{SOURCE_LABELS[source] || source}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2 min-w-0 sm:col-span-1 lg:w-48">
                            <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor="gc-sort">Sorteren</label>
                            <select
                                id="gc-sort"
                                className={inputClasses}
                                value={`${activeSort}:${activeDir}`}
                                onChange={(e) => {
                                    const [sort, dir] = e.target.value.split(':');
                                    updateAndRun({ sort, dir });
                                }}
                            >
                                {!SORT_OPTIONS.some((o) => o.value === `${activeSort}:${activeDir}`) ? <option value={`${activeSort}:${activeDir}`}>Huidige sortering</option> : null}
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="hidden shrink-0 rounded-xl bg-zinc-100 p-1 md:inline-flex md:self-start lg:self-end" role="group" aria-label="Weergave">
                        <button type="button" onClick={() => switchLayout('lijst')} aria-pressed={!cardView} className={segmentClass(!cardView)}>
                            <Icon name="list" className="h-4 w-4" />
                            Lijst
                        </button>
                        <button type="button" onClick={() => switchLayout('kaarten')} aria-pressed={cardView} className={segmentClass(cardView)}>
                            <Icon name="grid" className="h-4 w-4" />
                            Kaarten
                        </button>
                    </div>
                </form>
            </Card>

            <div className="flex min-h-[2rem] flex-wrap items-center gap-2 px-1 text-sm" aria-live="polite">
                <span className="mr-1 font-medium text-zinc-800">
                    {filtering ? 'Bezig met laden...' : `${totalCount.toLocaleString('nl-NL')} ${totalCount === 1 ? 'klant' : 'klanten'}`}
                </span>
                {filterChips.map((chip) => (
                    <button
                        key={chip.key}
                        type="button"
                        onClick={() => updateAndRun(chip.clear)}
                        className="inline-flex max-w-[16rem] items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1.5 text-xs font-medium text-zinc-700 shadow-card ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 focus-ring"
                    >
                        <span className="truncate">{chip.label}</span>
                        <Icon name="x" className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span className="sr-only">Filter verwijderen</span>
                    </button>
                ))}
                {filterChips.length > 1 ? (
                    <button type="button" onClick={clearFilters} className="rounded text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline focus-ring">
                        Alles wissen
                    </button>
                ) : null}
            </div>

            {bulkEnabled && selected.length > 0 ? (
                <div role="region" aria-label="Bulkacties" className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-pop sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="inline-flex items-center gap-2 font-semibold">
                        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-xs font-bold tabular-nums text-zinc-900">{selected.length}</span>
                        geselecteerd
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        {safeUrls.export_csv ? (
                            <Button variant="secondary" size="sm" icon="download" onClick={exportSelected}>
                                Exporteren (CSV)
                            </Button>
                        ) : null}
                        {safeUrls.bulk_tag && !bulkTagOpen ? (
                            <Button variant="secondary" size="sm" icon="tag" onClick={() => setBulkTagOpen(true)}>
                                Tag toevoegen
                            </Button>
                        ) : null}
                        {safeUrls.bulk_tag && bulkTagOpen ? (
                            <form onSubmit={addTagToSelected} className="flex flex-wrap items-center gap-2">
                                <label htmlFor="gc-bulk-tag" className="sr-only">Tag</label>
                                <input
                                    id="gc-bulk-tag"
                                    autoFocus
                                    className={cx(inputClasses, 'h-8 w-44 py-1 text-zinc-900')}
                                    value={bulkTag}
                                    maxLength={50}
                                    aria-invalid={bulkTagError ? 'true' : undefined}
                                    aria-describedby={bulkTagError ? 'gc-bulk-tag-error' : undefined}
                                    onChange={(e) => {
                                        setBulkTag(e.target.value);
                                        if (bulkTagError) setBulkTagError('');
                                    }}
                                    placeholder="Nieuwe tag"
                                />
                                <Button type="submit" size="sm" icon="check" loading={bulkBusy} disabled={!bulkTag.trim()}>
                                    Toevoegen
                                </Button>
                                <button
                                    type="button"
                                    className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white focus-ring"
                                    onClick={() => {
                                        setBulkTagOpen(false);
                                        setBulkTag('');
                                        setBulkTagError('');
                                    }}
                                >
                                    Annuleren
                                </button>
                                {bulkTagError ? (
                                    <p id="gc-bulk-tag-error" role="alert" className="w-full text-xs font-medium text-rose-300">
                                        {bulkTagError}
                                    </p>
                                ) : null}
                            </form>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white focus-ring sm:ml-auto"
                        onClick={() => setSelected([])}
                    >
                        <Icon name="x" className="h-4 w-4" />
                        Selectie wissen
                    </button>
                </div>
            ) : null}

            {/* Kaarten: altijd op mobiel, en op grotere schermen als de kaartweergave is gekozen. */}
            <div className={cx(cardView ? '' : 'md:hidden')} aria-busy={filtering || undefined}>
                {bulkEnabled && rows.length > 0 ? (
                    <label className="mb-3 flex min-h-[2.5rem] items-center gap-3 px-1 text-sm text-zinc-700">
                        <input ref={selectAllCardsRef} type="checkbox" className="checkbox h-5 w-5" checked={allSelected} onChange={toggleAll} />
                        Alles op deze pagina selecteren
                    </label>
                ) : null}
                {rows.length === 0 && !showSkeleton ? (
                    <ListEmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} createUrl={safeUrls.create} />
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                        {showSkeleton
                            ? Array.from({ length: Math.min(skeletonRows, 6) }, (_, i) => <CardSkeleton key={i} />)
                            : rows.map((company) => (
                                  <CompanyCard
                                      key={company.id}
                                      company={company}
                                      isTrashView={isTrashView}
                                      bulkEnabled={bulkEnabled}
                                      isSelected={selected.includes(company.id)}
                                      onToggle={toggleOne}
                                      onOpen={openCompany}
                                      onRestore={restoreCompany}
                                      onForceDelete={forceDeleteCompany}
                                      statusLabels={safeStatusLabels}
                                  />
                              ))}
                    </div>
                )}
            </div>

            {/* Tabel vanaf md in lijstweergave */}
            {!cardView ? (
                <div className={cx(tableClasses.wrapper, 'hidden md:block')} aria-busy={filtering || undefined}>
                    <table className={tableClasses.table}>
                        <caption className="sr-only">{isTrashView ? 'Verwijderde klanten' : 'Klanten'}, sorteerbaar via de kolomkoppen</caption>
                        <thead className={tableClasses.thead}>
                            <tr>
                                {bulkEnabled ? (
                                    <th scope="col" className="w-10 py-3 pl-5 pr-1">
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            className="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            disabled={rows.length === 0}
                                            aria-label="Alles op deze pagina selecteren"
                                        />
                                    </th>
                                ) : null}
                                <SortHeader field="naam" label="Klant" sort={activeSort} dir={activeDir} onSort={onSort} />
                                <SortHeader field="status" label="Status" sort={activeSort} dir={activeDir} onSort={onSort} />
                                {!isTrashView ? <th scope="col" className={TH}>Modules</th> : null}
                                <SortHeader field="omzet" label="MRR excl." sort={activeSort} dir={activeDir} onSort={onSort} align="right" />
                                {!isTrashView ? <SortHeader field="demo_eind" label="Demo eindigt" sort={activeSort} dir={activeDir} onSort={onSort} /> : null}
                                {showNextAction ? <SortHeader field="volgende_actie" label="Volgende actie" sort={activeSort} dir={activeDir} onSort={onSort} className="hidden xl:table-cell" /> : null}
                                {isTrashView ? <th scope="col" className={TH}>Verwijderd op</th> : null}
                                <th scope="col" className={cx(TH, 'text-right')}>
                                    <span className="sr-only">Acties</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className={tableClasses.tbody}>
                            {showSkeleton
                                ? Array.from({ length: skeletonRows }, (_, i) => (
                                      <tr key={`sk-${i}`} aria-hidden="true">
                                          <td colSpan={columnCount} className="px-5 py-3.5">
                                              <div className="flex items-center gap-4">
                                                  <Skeleton className="h-9 w-9 rounded-full" />
                                                  <div className="w-56">
                                                      <Skeleton className="h-3.5 w-3/4" />
                                                      <Skeleton className="mt-2 h-3 w-1/3" />
                                                  </div>
                                                  <Skeleton className="h-5 w-20 rounded-full" />
                                                  <Skeleton className="hidden h-5 w-32 lg:block" />
                                                  <Skeleton className="ml-auto h-4 w-16" />
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                                : null}
                            {!showSkeleton && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columnCount} className="p-2">
                                        <ListEmptyState bare isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} createUrl={safeUrls.create} />
                                    </td>
                                </tr>
                            ) : null}
                            {!showSkeleton &&
                                rows.map((company) => {
                                    const isSelected = selected.includes(company.id);
                                    return (
                                        <tr
                                            key={company.id}
                                            onClick={(e) => openCompany(e, company)}
                                            className={cx('group transition-colors', company.show_url && 'cursor-pointer', isSelected ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-zinc-50/80')}
                                        >
                                            {bulkEnabled ? (
                                                <td className="py-3.5 pl-5 pr-1">
                                                    <input type="checkbox" className="checkbox" checked={isSelected} onChange={() => toggleOne(company.id)} aria-label={`Selecteer ${company.bedrijfsnaam}`} />
                                                </td>
                                            ) : null}
                                            <td className={cx(TD, 'w-full min-w-[12rem] max-w-[18rem]')}>
                                                <CompanyIdentity company={company} size="sm" />
                                            </td>
                                            <td className={cx(TD, 'whitespace-nowrap')}>
                                                <StatusBadge status={company.status} labels={safeStatusLabels} />
                                            </td>
                                            {!isTrashView ? (
                                                <td className={cx(TD, 'min-w-[9rem] max-w-[14rem]')}>
                                                    <ModuleChips modules={company.modules} />
                                                </td>
                                            ) : null}
                                            <td className={cx(TD, 'whitespace-nowrap text-right font-medium tabular-nums text-zinc-900')}>
                                                {Number(company.omzet_excl || 0) > 0 ? formatEuro(company.omzet_excl) : <span className="font-normal text-zinc-400">{formatEuro(0)}</span>}
                                            </td>
                                            {!isTrashView ? (
                                                <td className={TD}>
                                                    <DemoEnd value={company.demo_eind_op} start={company.demo_start_op} status={company.status} computed={company.demo_eind_berekend} />
                                                </td>
                                            ) : null}
                                            {showNextAction ? (
                                                <td className={cx(TD, 'hidden xl:table-cell')}>
                                                    <NextAction action={company.volgende_actie} />
                                                </td>
                                            ) : null}
                                            {isTrashView ? <td className={cx(TD, 'whitespace-nowrap text-zinc-500')}>{formatDateTime(company.deleted_at)}</td> : null}
                                            <td className={cx(TD, 'whitespace-nowrap text-right')}>
                                                {isTrashView ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {company.restore_url ? (
                                                            <Button variant="secondary" size="sm" icon="refresh" onClick={() => restoreCompany(company)}>
                                                                Herstellen
                                                            </Button>
                                                        ) : null}
                                                        {company.force_delete_url ? (
                                                            <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => forceDeleteCompany(company)}>
                                                                Definitief verwijderen
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <ContactActions company={company} reserve />
                                                        {company.show_url ? (
                                                            <Link
                                                                href={company.show_url}
                                                                className={cx(
                                                                    buttonClasses({ variant: 'secondary', size: 'sm' }),
                                                                    'ml-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                                                                )}
                                                                aria-label={`Open ${company.bedrijfsnaam}`}
                                                            >
                                                                Open
                                                                <Icon name="arrow-right" className="h-3.5 w-3.5" />
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            ) : null}

            <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <label htmlFor="gc-perPage">Per pagina</label>
                    <select id="gc-perPage" className={cx(inputClasses, 'h-9 w-20 py-1')} value={data.perPage} onChange={(e) => updateAndRun({ perPage: Number(e.target.value) })}>
                        {[10, 15, 25, 50].map((value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                </div>
                <Pagination links={safeCompanies.links} lastPage={safeCompanies.last_page} />
            </div>
        </div>
    );
}
