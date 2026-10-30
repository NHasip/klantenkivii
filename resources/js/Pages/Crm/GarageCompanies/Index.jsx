import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import StatusBadge, { FOCUS_SCOPE } from '../../../components/StatusBadge';
import { Button, Card, EmptyState, PageHeader, Spinner, Stat, buttonClasses, cx, inputClasses, tableClasses } from '../../../components/ui';

const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

const STATUS_TABS = [
    { value: 'alle', label: 'Alle' },
    { value: 'demo_aangevraagd', label: 'Demo aangevraagd' },
    { value: 'proefperiode', label: 'Demo' },
    { value: 'actief', label: 'Actief' },
    { value: 'opgezegd', label: 'Opgezegd' },
    { value: 'verloren', label: 'Verloren' },
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

const MOBILE_SORT_OPTIONS = [
    { value: 'bijgewerkt:desc', label: 'Laatst bijgewerkt' },
    { value: 'naam:asc', label: 'Naam (A-Z)' },
    { value: 'naam:desc', label: 'Naam (Z-A)' },
    { value: 'volgende_actie:asc', label: 'Volgende actie (eerst)' },
    { value: 'demo_eind:asc', label: 'Demo eindigt (eerst)' },
    { value: 'omzet:desc', label: 'Omzet (hoog-laag)' },
    { value: 'plaats:asc', label: 'Plaats (A-Z)' },
    { value: 'status:asc', label: 'Status' },
];

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
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(isoString));
    } catch {
        return String(isoString);
    }
}

function formatDate(value) {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
            value instanceof Date ? value : new Date(value)
        );
    } catch {
        return String(value);
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

function PhoneIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.15a1.5 1.5 0 0 1 1.46 1.14l.62 2.5a1.5 1.5 0 0 1-.6 1.6l-.98.7a11.04 11.04 0 0 0 5.9 5.9l.7-.98a1.5 1.5 0 0 1 1.6-.6l2.5.62A1.5 1.5 0 0 1 18 14.35v1.15a1.5 1.5 0 0 1-1.5 1.5H15C8 17 3 12 3 5V3.5Z" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 4a2 2 0 0 0-2 2v.4l9 5.1 9-5.1V6a2 2 0 0 0-2-2H3Z" />
            <path d="M19 8.7l-8.5 4.8a1 1 0 0 1-1 0L1 8.7V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.7Z" />
        </svg>
    );
}

function DemoEnd({ value, status, computed = false }) {
    const date = ['proefperiode', 'demo_gepland', 'demo_aangevraagd'].includes(status) ? parseDateOnly(value) : null;
    if (!date) return <span className="text-zinc-400">-</span>;
    const computedNote = computed ? (
        <span className="text-xs font-normal text-zinc-400" title="Niet opgeslagen: berekend uit startdatum en demoduur">(berekend)</span>
    ) : null;
    const days = daysFromToday(date);
    const relevant = status === 'proefperiode';
    if (relevant && days < 0) {
        return (
            <span className="inline-flex flex-col">
                <span className="font-semibold text-rose-700">{formatDate(date)}</span>
                <span className="text-xs text-rose-700">Verlopen</span>
                {computedNote}
            </span>
        );
    }
    if (relevant && days <= 3) {
        return (
            <span className="inline-flex flex-col">
                <span className="font-semibold text-amber-800">{formatDate(date)}</span>
                <span className="text-xs text-amber-800">{days === 0 ? 'Vandaag' : `Over ${days} ${days === 1 ? 'dag' : 'dagen'}`}</span>
                {computedNote}
            </span>
        );
    }
    if (computedNote) {
        return (
            <span className="inline-flex flex-col">
                <span className="text-zinc-700">{formatDate(date)}</span>
                {computedNote}
            </span>
        );
    }
    return <span className="text-zinc-700">{formatDate(date)}</span>;
}

function NextAction({ action }) {
    if (!action) return <span className="text-zinc-400">-</span>;
    const due = action.due_at ? new Date(action.due_at) : null;
    const overdue = due && due.getTime() < Date.now();
    return (
        <span className="inline-flex max-w-[16rem] flex-col">
            <span className="truncate text-zinc-800" title={action.titel}>
                <span className="text-xs font-semibold text-zinc-500">{action.soort}: </span>
                {action.titel || '-'}
            </span>
            <span className={cx('text-xs', overdue ? 'font-semibold text-rose-700' : 'text-zinc-500')}>
                {due ? `${formatDateTime(action.due_at)}${overdue ? ' (te laat)' : ''}` : 'Geen datum'}
            </span>
        </span>
    );
}

// Compactere cellen dan de standaard tabel zodat alle kolommen op 1920px passen; horizontaal scrollen blijft de fallback.
const TABLE_TH = tableClasses.th.replace('px-4', 'px-3');
const TABLE_TD = tableClasses.td.replace('px-4', 'px-3');
const NEXT_ACTION_CELL = 'hidden xl:table-cell';

function SortHeader({ field, label, sort, dir, onSort, className }) {
    const active = sort === field;
    const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
        <th scope="col" aria-sort={ariaSort} className={cx(TABLE_TH, 'whitespace-nowrap', className)}>
            <button
                type="button"
                onClick={() => onSort(field)}
                className={cx('-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wide hover:text-zinc-900', active && 'text-zinc-900')}
            >
                {label}
                <span aria-hidden="true" className={cx('text-[10px]', active ? 'text-indigo-700' : 'text-zinc-300')}>
                    {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
                </span>
            </button>
        </th>
    );
}

function Pagination({ links, lastPage }) {
    if (!Array.isArray(links) || links.length <= 1) return null;
    if (lastPage !== undefined && lastPage !== null && Number(lastPage) <= 1) return null;

    return (
        <nav aria-label="Paginering" className="flex flex-wrap items-center gap-1.5">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        preserveScroll={false}
                        className={cx(
                            'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-3 text-sm font-medium',
                            link.active
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="inline-flex h-9 min-w-[2.25rem] cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 opacity-60"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            )}
        </nav>
    );
}

function ListEmptyState({ isTrashView, hasActiveFilters, onClear, createUrl }) {
    if (hasActiveFilters) {
        return (
            <EmptyState
                title="Geen klanten gevonden"
                description="Er zijn geen klanten die aan deze filters voldoen. Pas de zoekterm aan of wis de filters."
                action={<Button variant="secondary" onClick={onClear}>Filters wissen</Button>}
            />
        );
    }
    if (isTrashView) {
        return <EmptyState title="De prullenbak is leeg" description="Verwijderde klanten verschijnen hier en kun je terugzetten." />;
    }
    return (
        <EmptyState
            title="Nog geen klanten"
            description="Voeg je eerste garagebedrijf toe om demo's, modules en incasso bij te houden."
            action={createUrl ? <Link href={createUrl} className={buttonClasses()}>Nieuwe klant</Link> : null}
        />
    );
}

// Klik op een rij opent de klant, behalve bij klikken op links, knoppen of invoervelden in de rij.
function isInteractiveTarget(event) {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest('a, button, input, select, textarea, label')) return true;
    const selection = window.getSelection ? window.getSelection() : null;
    return Boolean(selection && selection.toString().length > 0);
}

export default function Index({ companies, totals, statusCounts, trashCount, filters, statusLabels, sourceOptions, urls }) {
    const safeCompanies = companies && typeof companies === 'object'
        ? companies
        : { data: [], links: [], total: 0, per_page: 15 };
    const rows = Array.isArray(safeCompanies.data) ? safeCompanies.data : [];
    const safeFilters = filters && typeof filters === 'object' ? filters : {};
    const safeStatusLabels = statusLabels && typeof statusLabels === 'object' ? statusLabels : {};
    const safeSourceOptions = Array.isArray(sourceOptions) ? sourceOptions : [];
    const safeCounts = statusCounts && typeof statusCounts === 'object' ? statusCounts : {};
    const safeUrls = urls && typeof urls === 'object'
        ? urls
        : { index: '/garagebedrijven', create: '/garagebedrijven/nieuw', purge_trash: null };

    const confirm = useConfirm();
    const [filtering, setFiltering] = useState(false);
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
    });
    // Use the view the server actually rendered; it falls back to 'actief' when the trash is unavailable.
    const isTrashView = (safeFilters.view || data.view) === 'prullenbak';
    // Status en sortering zoals de server ze heeft toegepast (ongeldige waarden vallen terug op de standaard).
    const activeStatus = safeFilters.status || 'alle';
    const activeSort = safeFilters.sort || data.sort;
    const activeDir = safeFilters.dir || data.dir;
    const nowDate = new Date();
    const exportForm = useForm({
        maand: String(nowDate.getMonth() + 1),
        jaar: String(nowDate.getFullYear()),
        uitvoerdatum: toLocalDateInput(nowDate),
    });

    const maandOpties = [
        { value: '1', label: 'januari' },
        { value: '2', label: 'februari' },
        { value: '3', label: 'maart' },
        { value: '4', label: 'april' },
        { value: '5', label: 'mei' },
        { value: '6', label: 'juni' },
        { value: '7', label: 'juli' },
        { value: '8', label: 'augustus' },
        { value: '9', label: 'september' },
        { value: '10', label: 'oktober' },
        { value: '11', label: 'november' },
        { value: '12', label: 'december' },
    ];

    const jaarOpties = [];
    for (let i = nowDate.getFullYear() - 1; i <= nowDate.getFullYear() + 2; i += 1) {
        jaarOpties.push(String(i));
    }

    const restoreCompany = async (company) => {
        const ok = await confirm({
            title: 'Klant herstellen',
            message: `Weet je zeker dat je "${company.bedrijfsnaam}" wilt herstellen?`,
            confirmText: 'Herstel',
            cancelText: 'Annuleren',
        });
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

    // Bij wisselen tussen Actief en Prullenbak de filters resetten, anders lijkt de andere lijst leeg.
    const switchView = (view) => {
        updateAndRun({ view, search: '', status: 'alle', tag: '', bron: '' }, { preserveScroll: false });
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

    const extraFilterCount =
        (data.search && data.search.trim() !== '' ? 1 : 0) + (data.tag && data.tag.trim() !== '' ? 1 : 0) + (data.bron ? 1 : 0);
    const hasActiveFilters = extraFilterCount > 0 || activeStatus !== 'alle';

    const clearFilters = () => {
        updateAndRun({ search: '', status: 'alle', tag: '', bron: '' });
    };

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
    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
    }, [someSelected]);
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
                onError: (errors) => {
                    setBulkTagError(errors?.tag || errors?.ids || 'De tag kon niet worden toegevoegd.');
                },
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
        const query = new URLSearchParams({
            maand: exportForm.data.maand,
            jaar: exportForm.data.jaar,
            uitvoerdatum: exportForm.data.uitvoerdatum,
        });
        window.location.href = `${safeUrls.export_incasso_batch}?${query.toString()}`;
    };

    // Bulkselectie kolom alleen in de actieve lijst, actiekolom alleen in de prullenbak.
    // "Volgende actie" alleen tonen als minstens een rij een waarde heeft (en pas vanaf xl).
    const showNextAction = (Array.isArray(rows) ? rows : []).some((c) => c?.volgende_actie);
    const columnCount = 7 + (showNextAction ? 1 : 0) + (bulkEnabled ? 1 : 0) + (isTrashView ? 1 : 0);
    const totalCount = Number(safeCompanies.total || 0);
    const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
    const filterSummary = [
        activeStatus !== 'alle' ? `Status: ${safeStatusLabels[activeStatus] || activeStatus}` : null,
        data.search.trim() ? `Zoek: "${data.search.trim()}"` : null,
        data.tag.trim() ? `Tag: "${data.tag.trim()}"` : null,
        data.bron ? `Bron: ${SOURCE_LABELS[data.bron] || data.bron}` : null,
    ].filter(Boolean);

    const viewToggleClass = (active) =>
        cx(
            'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors sm:flex-none',
            active ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
        );

    return (
        <div className={cx('space-y-5', FOCUS_SCOPE)}>
            <Head title={isTrashView ? 'Prullenbak klanten' : 'Klanten'} />

            <PageHeader
                title={isTrashView ? 'Prullenbak' : 'Klanten'}
                description={isTrashView ? 'Herstel verwijderde klanten of verwijder ze definitief.' : 'Overzicht van garagebedrijven, hun status en volgende acties.'}
                actions={
                    <>
                        {!isTrashView && safeUrls.export_incasso_batch && (
                            <Button
                                variant="secondary"
                                onClick={() => setExportOpen((open) => !open)}
                                aria-expanded={exportOpen}
                                aria-controls="incasso-export-panel"
                            >
                                Incasso exporteren
                            </Button>
                        )}
                        {!isTrashView && safeUrls.create && (
                            <Link href={safeUrls.create} className={buttonClasses({ size: 'md' })}>
                                <span aria-hidden="true" className="text-base leading-none">+</span>
                                Nieuwe klant
                            </Link>
                        )}
                        {isTrashView && safeUrls.purge_trash && Number(trashCount || 0) > 0 && (
                            <Button variant="danger" onClick={purgeTrash}>
                                Prullenbak leegmaken
                            </Button>
                        )}
                    </>
                }
            >
                <div className="mt-3 inline-flex w-full rounded-lg bg-zinc-100 p-1 sm:w-auto" role="group" aria-label="Lijst kiezen">
                    <button type="button" onClick={() => switchView('actief')} aria-pressed={!isTrashView} className={viewToggleClass(!isTrashView)}>
                        Klanten
                    </button>
                    <button type="button" onClick={() => switchView('prullenbak')} aria-pressed={isTrashView} className={viewToggleClass(isTrashView)}>
                        Prullenbak
                        <span className="rounded-full bg-zinc-200 px-1.5 text-xs tabular-nums text-zinc-700">{Number(trashCount || 0)}</span>
                    </button>
                </div>
            </PageHeader>

            {!isTrashView && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Stat
                        label={activeStatus === 'alle' && extraFilterCount === 0 ? 'Bedrijven' : 'Bedrijven (gefilterd)'}
                        value={Number(totals?.bedrijven ?? totalCount).toLocaleString('nl-NL')}
                    />
                    <Stat label="MRR actieve klanten" value={formatEuro(totals?.omzet_excl ?? 0)} sub="Excl. btw, alleen status Actief" tone="success" />
                    <Stat label="Demo-pijplijn" value={formatEuro(totals?.omzet_demo_excl ?? 0)} sub="Excl. btw, klanten in demo" tone="warning" />
                </div>
            )}

            {!isTrashView && exportOpen && (
                <Card id="incasso-export-panel" aria-labelledby="incasso-export-title">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:items-end">
                        <div className="md:col-span-2">
                            <h2 id="incasso-export-title" className="text-base font-semibold text-zinc-900">ING incasso exporteren</h2>
                            <p className="mt-0.5 text-sm text-zinc-500">Alle klanten met status Actief en complete SEPA gegevens.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="exportForm-maand">Maand</label>
                            <select id="exportForm-maand" className={inputClasses} value={exportForm.data.maand} onChange={(e) => exportForm.setData('maand', e.target.value)}>
                                {maandOpties.map((optie) => (
                                    <option key={optie.value} value={optie.value}>
                                        {optie.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="exportForm-jaar">Jaar</label>
                            <select id="exportForm-jaar" className={inputClasses} value={exportForm.data.jaar} onChange={(e) => exportForm.setData('jaar', e.target.value)}>
                                {jaarOpties.map((jaar) => (
                                    <option key={jaar} value={jaar}>
                                        {jaar}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="exportForm-uitvoerdatum">Uitvoerdatum</label>
                            <input
                                id="exportForm-uitvoerdatum"
                                type="date"
                                className={inputClasses}
                                value={exportForm.data.uitvoerdatum}
                                onChange={(e) => exportForm.setData('uitvoerdatum', e.target.value)}
                            />
                        </div>
                        <Button onClick={exportIncasso} disabled={!exportForm.data.uitvoerdatum || !safeUrls.export_incasso_batch}>
                            Exporteren
                        </Button>
                    </div>
                </Card>
            )}

            <div className="space-y-3">
                <nav aria-label="Filter op status" className="-mx-1 overflow-x-auto pb-1">
                    <ul className="flex min-w-max gap-1.5 px-1">
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
                                            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors',
                                            active ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                                        )}
                                    >
                                        {label}
                                        <span className={cx('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600')}>
                                            {Number(safeCounts[tab.value] || 0).toLocaleString('nl-NL')}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="md:hidden">
                    <Button
                        variant="secondary"
                        className="w-full justify-between"
                        onClick={() => setFiltersOpen((open) => !open)}
                        aria-expanded={filtersOpen}
                        aria-controls="gc-filters"
                    >
                        <span className="inline-flex items-center gap-2">
                            Zoeken en filters
                            {extraFilterCount > 0 && (
                                <span className="rounded-full bg-indigo-600 px-2 text-xs text-white">
                                    {extraFilterCount}
                                    <span className="sr-only"> actief</span>
                                </span>
                            )}
                        </span>
                        <span aria-hidden="true" className="text-xs">{filtersOpen ? '▲' : '▼'}</span>
                    </Button>
                </div>

                <Card as="form" id="gc-filters" role="search" onSubmit={submit} className={cx('md:block', filtersOpen ? 'block' : 'hidden')}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-5">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-search">Zoeken</label>
                            <div className="relative">
                                <input
                                    id="gc-search"
                                    type="search"
                                    className={cx(inputClasses, 'pr-9')}
                                    aria-describedby="gc-search-hint"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                    onKeyDown={submitOnEnter}
                                    placeholder="Bedrijfsnaam, e-mail, telefoon, plaats of IBAN"
                                />
                                {filtering && (
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                                        <Spinner className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                            <p id="gc-search-hint" className="sr-only">De lijst wordt bijgewerkt terwijl je typt.</p>
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-tag">Tag</label>
                            <input
                                id="gc-tag"
                                className={inputClasses}
                                value={data.tag}
                                onChange={(e) => setData('tag', e.target.value)}
                                onKeyDown={submitOnEnter}
                                placeholder="bijv. premium"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-bron">Bron</label>
                            <select id="gc-bron" className={inputClasses} value={data.bron} onChange={(e) => updateAndRun({ bron: e.target.value })}>
                                <option value="">Alle bronnen</option>
                                {safeSourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {SOURCE_LABELS[source] || source}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-perPage">Per pagina</label>
                            <select id="gc-perPage" className={inputClasses} value={data.perPage} onChange={(e) => updateAndRun({ perPage: Number(e.target.value) })}>
                                {[10, 15, 25, 50].map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:hidden">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-sort-mobile">Sortering</label>
                            <select
                                id="gc-sort-mobile"
                                className={inputClasses}
                                value={`${activeSort}:${activeDir}`}
                                onChange={(e) => {
                                    const [sort, dir] = e.target.value.split(':');
                                    updateAndRun({ sort, dir });
                                }}
                            >
                                {!MOBILE_SORT_OPTIONS.some((o) => o.value === `${activeSort}:${activeDir}`) && (
                                    <option value={`${activeSort}:${activeDir}`}>Huidige sortering</option>
                                )}
                                {MOBILE_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>

                <div className="flex min-h-[2rem] flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm" aria-live="polite">
                    <span className="font-medium text-zinc-700">
                        {filtering ? 'Bezig met laden...' : `${totalCount.toLocaleString('nl-NL')} ${totalCount === 1 ? 'klant' : 'klanten'}`}
                    </span>
                    {hasActiveFilters && (
                        <>
                            <span className="text-zinc-500">{filterSummary.join(', ')}</span>
                            <button type="button" onClick={clearFilters} className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
                                Filters wissen
                            </button>
                        </>
                    )}
                </div>
            </div>

            {bulkEnabled && selected.length > 0 && (
                <div
                    role="region"
                    aria-label="Bulkacties"
                    className="sticky top-2 z-10 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-center"
                >
                    <span className="font-semibold text-indigo-900">{selected.length} geselecteerd</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {safeUrls.export_csv && (
                            <Button variant="secondary" size="sm" onClick={exportSelected}>
                                Exporteren (CSV)
                            </Button>
                        )}
                        {safeUrls.bulk_tag && !bulkTagOpen && (
                            <Button variant="secondary" size="sm" onClick={() => setBulkTagOpen(true)}>
                                Tag toevoegen
                            </Button>
                        )}
                        {safeUrls.bulk_tag && bulkTagOpen && (
                            <form onSubmit={addTagToSelected} className="flex flex-wrap items-center gap-2">
                                <label htmlFor="gc-bulk-tag" className="sr-only">Tag</label>
                                <input
                                    id="gc-bulk-tag"
                                    autoFocus
                                    className={cx(inputClasses, 'h-8 w-44 py-1')}
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
                                <Button type="submit" size="sm" loading={bulkBusy} disabled={!bulkTag.trim()}>
                                    Toevoegen
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setBulkTagOpen(false);
                                        setBulkTag('');
                                        setBulkTagError('');
                                    }}
                                >
                                    Annuleren
                                </Button>
                                {bulkTagError && (
                                    <p id="gc-bulk-tag-error" role="alert" className="w-full text-xs font-medium text-rose-700">
                                        {bulkTagError}
                                    </p>
                                )}
                            </form>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" className="sm:ml-auto" onClick={() => setSelected([])}>
                        Selectie wissen
                    </Button>
                </div>
            )}

            <div className={cx('space-y-3 transition-opacity md:hidden', filtering && 'opacity-60')} aria-busy={filtering || undefined}>
                {bulkEnabled && rows.length > 0 && (
                    <label className="flex min-h-[2.5rem] items-center gap-3 px-1 text-sm text-zinc-700">
                        <input type="checkbox" className="h-5 w-5 rounded border-zinc-300 text-indigo-600" checked={allSelected} onChange={toggleAll} />
                        Alles op deze pagina selecteren
                    </label>
                )}
                {rows.length === 0 && (
                    <ListEmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} createUrl={safeUrls.create} />
                )}
                {rows.map((company) => {
                    const isSelected = selected.includes(company.id);
                    return (
                        <article
                            key={company.id}
                            onClick={(e) => openCompany(e, company)}
                            className={cx(
                                'rounded-xl border bg-white p-4 shadow-sm',
                                isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-zinc-200',
                                company.show_url && 'cursor-pointer'
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    {bulkEnabled && (
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 text-indigo-600"
                                            checked={isSelected}
                                            onChange={() => toggleOne(company.id)}
                                            aria-label={`Selecteer ${company.bedrijfsnaam}`}
                                        />
                                    )}
                                    <div className="min-w-0">
                                        {company.show_url ? (
                                            <Link href={company.show_url} className="break-words text-base font-semibold text-zinc-900 hover:underline">
                                                {company.bedrijfsnaam}
                                            </Link>
                                        ) : (
                                            <h3 className="break-words text-base font-semibold text-zinc-900">{company.bedrijfsnaam}</h3>
                                        )}
                                        <div className="text-sm text-zinc-500">{company.plaats || 'Plaats onbekend'}</div>
                                    </div>
                                </div>
                                <StatusBadge status={company.status} labels={safeStatusLabels} />
                            </div>

                            <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                                {!isTrashView && (
                                    <>
                                        <dt className="text-zinc-500">Volgende actie</dt>
                                        <dd className="min-w-0 text-right"><NextAction action={company.volgende_actie} /></dd>
                                        {['demo_aangevraagd', 'proefperiode'].includes(company.status) && (
                                            <>
                                                <dt className="text-zinc-500">Demo eindigt</dt>
                                                <dd className="text-right"><DemoEnd value={company.demo_eind_op} status={company.status} computed={company.demo_eind_berekend} /></dd>
                                            </>
                                        )}
                                    </>
                                )}
                                {company.hoofd_email && (
                                    <>
                                        <dt className="text-zinc-500">E-mail</dt>
                                        <dd className="min-w-0 truncate text-right text-zinc-700" title={company.hoofd_email}>{company.hoofd_email}</dd>
                                    </>
                                )}
                                <dt className="text-zinc-500">Gebruikers</dt>
                                <dd className="text-right tabular-nums text-zinc-700">{company.actieve_seats}</dd>
                                <dt className="text-zinc-500">Omzet excl.</dt>
                                <dd className="text-right tabular-nums text-zinc-700">{formatEuro(company.omzet_excl)}</dd>
                                <dt className="text-zinc-500">{isTrashView ? 'Verwijderd op' : 'Bijgewerkt'}</dt>
                                <dd className="text-right text-zinc-700">{formatDateTime(isTrashView ? company.deleted_at : company.updated_at)}</dd>
                            </dl>

                            {(company.hoofd_telefoon || company.hoofd_email || isTrashView) && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                                    {company.hoofd_telefoon && (
                                        <a href={telHref(company.hoofd_telefoon)} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'flex-1' })}>
                                            <PhoneIcon />
                                            Bellen
                                        </a>
                                    )}
                                    {company.hoofd_email && (
                                        <a href={`mailto:${company.hoofd_email}`} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'flex-1' })}>
                                            <MailIcon />
                                            Mailen
                                        </a>
                                    )}
                                    {isTrashView && company.restore_url && (
                                        <Button variant="secondary" size="lg" className="flex-1" onClick={() => restoreCompany(company)}>
                                            Herstellen
                                        </Button>
                                    )}
                                    {isTrashView && company.force_delete_url && (
                                        <Button variant="danger-ghost" size="lg" className="flex-1" onClick={() => forceDeleteCompany(company)}>
                                            Definitief verwijderen
                                        </Button>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            <div className={cx(tableClasses.wrapper, 'hidden transition-opacity md:block', filtering && 'opacity-60')} aria-busy={filtering || undefined}>
                <table className={tableClasses.table}>
                    <caption className="sr-only">
                        {isTrashView ? 'Verwijderde klanten' : 'Klanten'}, sorteerbaar via de kolomkoppen
                    </caption>
                    <thead className={TABLE_THead}>
                        <tr>
                            {bulkEnabled && (
                                <th scope="col" className="w-10 px-4 py-2.5">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        className="rounded border-zinc-300 text-indigo-600"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        disabled={rows.length === 0}
                                        aria-label="Alles op deze pagina selecteren"
                                    />
                                </th>
                            )}
                            <SortHeader field="naam" label="Bedrijf" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <SortHeader field="status" label="Status" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <SortHeader field="plaats" label="Plaats" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <th scope="col" className={TABLE_TH}>Contact</th>
                            {showNextAction && <SortHeader field="volgende_actie" label="Volgende actie" sort={activeSort} dir={activeDir} onSort={onSort} className={NEXT_ACTION_CELL} />}
                            <SortHeader field="demo_eind" label="Demo eindigt" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <SortHeader field="omzet" label="Omzet excl." sort={activeSort} dir={activeDir} onSort={onSort} className="text-right" />
                            {isTrashView ? (
                                <th scope="col" className={TABLE_TH}>Verwijderd op</th>
                            ) : (
                                <SortHeader field="bijgewerkt" label="Bijgewerkt" sort={activeSort} dir={activeDir} onSort={onSort} />
                            )}
                            {isTrashView && (
                                <th scope="col" className={TABLE_TH}>
                                    <span className="sr-only">Acties</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className={tableClasses.tbody}>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columnCount} className="p-4">
                                    <ListEmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} createUrl={safeUrls.create} />
                                </td>
                            </tr>
                        )}
                        {rows.map((company) => {
                            const isSelected = selected.includes(company.id);
                            return (
                                <tr
                                    key={company.id}
                                    onClick={(e) => openCompany(e, company)}
                                    className={cx(tableClasses.tr, company.show_url && 'cursor-pointer', isSelected && 'bg-indigo-50/60')}
                                >
                                    {bulkEnabled && (
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300 text-indigo-600"
                                                checked={isSelected}
                                                onChange={() => toggleOne(company.id)}
                                                aria-label={`Selecteer ${company.bedrijfsnaam}`}
                                            />
                                        </td>
                                    )}
                                    <td className={cx(TABLE_TD, 'min-w-[10rem] max-w-[18rem] break-words font-semibold text-zinc-900')}>
                                        {company.show_url ? (
                                            <Link href={company.show_url} className="hover:text-indigo-700 hover:underline">
                                                {company.bedrijfsnaam}
                                            </Link>
                                        ) : (
                                            company.bedrijfsnaam
                                        )}
                                    </td>
                                    <td className={TABLE_TD}>
                                        <StatusBadge status={company.status} labels={safeStatusLabels} />
                                    </td>
                                    <td className={TABLE_TD}>{company.plaats || <span className="text-zinc-400">-</span>}</td>
                                    <td className={cx(TABLE_TD, 'max-w-[14rem]')}>
                                        {company.hoofd_email ? (
                                            <a href={`mailto:${company.hoofd_email}`} className="block truncate text-zinc-800 hover:text-indigo-700 hover:underline" title={company.hoofd_email}>
                                                {company.hoofd_email}
                                            </a>
                                        ) : (
                                            <span className="text-zinc-400">Geen e-mail</span>
                                        )}
                                        {company.hoofd_telefoon ? (
                                            <a href={telHref(company.hoofd_telefoon)} className="block text-xs text-zinc-500 hover:text-indigo-700 hover:underline">
                                                {company.hoofd_telefoon}
                                            </a>
                                        ) : null}
                                    </td>
                                    {showNextAction && <td className={cx(TABLE_TD, NEXT_ACTION_CELL)}><NextAction action={company.volgende_actie} /></td>}
                                    <td className={cx(TABLE_TD, 'whitespace-nowrap')}><DemoEnd value={company.demo_eind_op} status={company.status} computed={company.demo_eind_berekend} /></td>
                                    <td className={cx(TABLE_TD, 'whitespace-nowrap text-right tabular-nums')}>{formatEuro(company.omzet_excl)}</td>
                                    <td className={cx(TABLE_TD, 'whitespace-nowrap text-zinc-500')}>
                                        {formatDateTime(isTrashView ? company.deleted_at : company.updated_at)}
                                    </td>
                                    {isTrashView && (
                                        <td className={cx(TABLE_TD, 'text-right')}>
                                            <div className="flex items-center justify-end gap-2">
                                                {company.restore_url && (
                                                    <Button variant="secondary" size="sm" onClick={() => restoreCompany(company)}>
                                                        Herstellen
                                                    </Button>
                                                )}
                                                {company.force_delete_url && (
                                                    <Button variant="danger-ghost" size="sm" onClick={() => forceDeleteCompany(company)}>
                                                        Definitief verwijderen
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Pagination links={safeCompanies.links} lastPage={safeCompanies.last_page} />
        </div>
    );
}
