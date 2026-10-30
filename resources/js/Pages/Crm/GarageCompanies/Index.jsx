import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import StatusBadge, { FOCUS_SCOPE } from '../../../components/StatusBadge';

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

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
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

function DemoEnd({ value, status }) {
    const date = parseDateOnly(value);
    if (!date) return <span className="text-zinc-400">-</span>;
    const days = daysFromToday(date);
    const relevant = status === 'proefperiode';
    if (relevant && days < 0) {
        return (
            <span className="inline-flex flex-col">
                <span className="font-semibold text-rose-700">{formatDate(date)}</span>
                <span className="text-xs text-rose-700">Verlopen</span>
            </span>
        );
    }
    if (relevant && days <= 3) {
        return (
            <span className="inline-flex flex-col">
                <span className="font-semibold text-amber-800">{formatDate(date)}</span>
                <span className="text-xs text-amber-800">{days === 0 ? 'Vandaag' : `Over ${days} ${days === 1 ? 'dag' : 'dagen'}`}</span>
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

function SortHeader({ field, label, sort, dir, onSort, className }) {
    const active = sort === field;
    const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
        <th scope="col" aria-sort={ariaSort} className={cx('px-4 py-3 text-left text-xs font-semibold text-zinc-600', className)}>
            <button
                type="button"
                onClick={() => onSort(field)}
                className="inline-flex items-center gap-1 rounded hover:text-zinc-900"
            >
                {label}
                <span aria-hidden="true" className={cx('text-[10px]', active ? 'text-zinc-900' : 'text-zinc-300')}>
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
        <nav aria-label="Paginering" className="mt-6 flex flex-wrap gap-2">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={cx(
                            'rounded-md border px-3 py-1.5 text-sm',
                            link.active
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 opacity-50"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            )}
        </nav>
    );
}

function EmptyState({ isTrashView, hasActiveFilters, onClear }) {
    if (isTrashView && !hasActiveFilters) return <span>Prullenbak is leeg.</span>;
    return (
        <div className="flex flex-col items-center gap-2">
            <span>Geen klanten gevonden.</span>
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-sm font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
                >
                    Filters wissen
                </button>
            )}
        </div>
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

    const exportSelected = () => {
        if (!safeUrls.export_csv || selected.length === 0) return;
        const query = new URLSearchParams({ ids: selected.join(',') });
        window.location.href = `${safeUrls.export_csv}?${query.toString()}`;
    };

    const addTagToSelected = (event) => {
        event.preventDefault();
        const tag = bulkTag.trim();
        if (!safeUrls.bulk_tag || !tag || selected.length === 0) return;
        router.post(
            safeUrls.bulk_tag,
            { ids: selected, tag },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBulkBusy(true),
                onFinish: () => setBulkBusy(false),
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

    const columnCount = bulkEnabled ? 10 : 9;

    return (
        <div className={cx('space-y-6', FOCUS_SCOPE)}>
            <Head title="Klanten" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">Klanten</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        {isTrashView ? 'Herstel verwijderde klanten vanuit de prullenbak.' : 'Overzicht van garagebedrijven en hun status.'}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="inline-flex w-full rounded-md border border-zinc-200 bg-white p-1 sm:w-auto">
                        <button
                            type="button"
                            onClick={() => switchView('actief')}
                            aria-pressed={!isTrashView}
                            className={cx(
                                'flex-1 rounded px-3 py-1.5 text-sm font-semibold transition sm:flex-none',
                                !isTrashView ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                            )}
                        >
                            Actief
                        </button>
                        <button
                            type="button"
                            onClick={() => switchView('prullenbak')}
                            aria-pressed={isTrashView}
                            className={cx(
                                'flex-1 rounded px-3 py-1.5 text-sm font-semibold transition sm:flex-none',
                                isTrashView ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                            )}
                        >
                            Prullenbak ({Number(trashCount || 0)})
                        </button>
                    </div>
                    {!isTrashView && safeUrls.export_incasso_batch && (
                        <button
                            type="button"
                            onClick={() => setExportOpen((open) => !open)}
                            aria-expanded={exportOpen}
                            aria-controls="incasso-export-panel"
                            className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:w-auto"
                        >
                            Incasso exporteren
                        </button>
                    )}
                    {!isTrashView && safeUrls.create && (
                        <Link
                            href={safeUrls.create}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
                        >
                            Nieuwe klant
                        </Link>
                    )}
                    {isTrashView && safeUrls.purge_trash && Number(trashCount || 0) > 0 && (
                        <button
                            type="button"
                            onClick={purgeTrash}
                            className="w-full rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto"
                        >
                            Prullenbak leegmaken
                        </button>
                    )}
                </div>
            </div>

            {!isTrashView && exportOpen && (
                <div id="incasso-export-panel" className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <div className="md:col-span-2">
                            <div className="text-sm font-semibold text-zinc-900">Exporteer ING incasso</div>
                            <div className="mt-1 text-xs text-zinc-500">Exporteert alle klanten met status Actief en complete SEPA gegevens.</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-maand">Maand</label>
                            <select
                                id="exportForm-maand"
                                className="mt-1 rounded-md border-zinc-300 text-sm"
                                value={exportForm.data.maand}
                                onChange={(e) => exportForm.setData('maand', e.target.value)}
                            >
                                {maandOpties.map((optie) => (
                                    <option key={optie.value} value={optie.value}>
                                        {optie.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-jaar">Jaar</label>
                            <select
                                id="exportForm-jaar"
                                className="mt-1 rounded-md border-zinc-300 text-sm"
                                value={exportForm.data.jaar}
                                onChange={(e) => exportForm.setData('jaar', e.target.value)}
                            >
                                {jaarOpties.map((jaar) => (
                                    <option key={jaar} value={jaar}>
                                        {jaar}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-uitvoerdatum">Uitvoerdatum</label>
                            <input
                                id="exportForm-uitvoerdatum"
                                type="date"
                                className="mt-1 rounded-md border-zinc-300 text-sm"
                                value={exportForm.data.uitvoerdatum}
                                onChange={(e) => exportForm.setData('uitvoerdatum', e.target.value)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={exportIncasso}
                            disabled={!exportForm.data.uitvoerdatum || !safeUrls.export_incasso_batch}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
                        >
                            Exporteer alle actieve klanten
                        </button>
                    </div>
                </div>
            )}

            <nav aria-label="Filter op status" className="-mx-1 overflow-x-auto">
                <ul className="flex min-w-max gap-1 px-1">
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
                                        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition',
                                        active
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                    )}
                                >
                                    {label}
                                    <span
                                        className={cx(
                                            'rounded-full px-1.5 text-xs',
                                            active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-700'
                                        )}
                                    >
                                        {Number(safeCounts[tab.value] || 0).toLocaleString('nl-NL')}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="md:hidden">
                <button
                    type="button"
                    onClick={() => setFiltersOpen((open) => !open)}
                    aria-expanded={filtersOpen}
                    aria-controls="gc-filters"
                    className="inline-flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                    <span className="inline-flex items-center gap-2">
                        Filters
                        {extraFilterCount > 0 && (
                            <span className="rounded-full bg-indigo-600 px-2 text-xs text-white">
                                {extraFilterCount}
                                <span className="sr-only"> actief</span>
                            </span>
                        )}
                    </span>
                    <span aria-hidden="true">{filtersOpen ? '▲' : '▼'}</span>
                </button>
            </div>

            <form
                id="gc-filters"
                onSubmit={submit}
                className={cx('rounded-xl border border-zinc-200 bg-white p-4 md:block', filtersOpen ? 'block' : 'hidden')}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-search">Zoek</label>
                        <input
                            id="gc-search"
                            type="search"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            aria-describedby="gc-search-hint"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            onKeyDown={submitOnEnter}
                            placeholder="Bedrijfsnaam, e-mail, IBAN..."
                        />
                        <div id="gc-search-hint" className="sr-only">De lijst wordt bijgewerkt terwijl je typt.</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-tag">Tag</label>
                        <input
                            id="gc-tag"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.tag}
                            onChange={(e) => setData('tag', e.target.value)}
                            onKeyDown={submitOnEnter}
                            placeholder="bijv. premium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-bron">Bron</label>
                        <select
                            id="gc-bron"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.bron}
                            onChange={(e) => updateAndRun({ bron: e.target.value })}
                        >
                            <option value="">Alle bronnen</option>
                            {safeSourceOptions.map((source) => (
                                <option key={source} value={source}>
                                    {SOURCE_LABELS[source] || source}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-perPage">Per pagina</label>
                        <select
                            id="gc-perPage"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.perPage}
                            onChange={(e) => updateAndRun({ perPage: Number(e.target.value) })}
                        >
                            {[10, 15, 25, 50].map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:hidden">
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-sort-mobile">Sortering</label>
                        <select
                            id="gc-sort-mobile"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500" aria-live="polite">
                    <span>
                        {filtering ? 'Bezig met laden...' : `Totaal: ${Number(safeCompanies.total || 0).toLocaleString('nl-NL')} bedrijven`}
                    </span>
                </div>
            </form>

            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900">
                    <span className="font-semibold">Filters actief</span>
                    <span className="text-indigo-800">
                        {[
                            activeStatus !== 'alle' ? `Status: ${safeStatusLabels[activeStatus] || activeStatus}` : null,
                            data.search.trim() ? `Zoek: "${data.search.trim()}"` : null,
                            data.tag.trim() ? `Tag: "${data.tag.trim()}"` : null,
                            data.bron ? `Bron: ${SOURCE_LABELS[data.bron] || data.bron}` : null,
                        ]
                            .filter(Boolean)
                            .join(', ')}
                    </span>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="ml-auto font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
                    >
                        Wissen
                    </button>
                </div>
            )}

            {bulkEnabled && selected.length > 0 && (
                <div
                    role="region"
                    aria-label="Bulkacties"
                    className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center"
                >
                    <span className="font-semibold text-zinc-900">{selected.length} geselecteerd</span>
                    {safeUrls.export_csv && (
                        <button
                            type="button"
                            onClick={exportSelected}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                            Exporteren (CSV)
                        </button>
                    )}
                    {safeUrls.bulk_tag && !bulkTagOpen && (
                        <button
                            type="button"
                            onClick={() => setBulkTagOpen(true)}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                            Tag toevoegen
                        </button>
                    )}
                    {safeUrls.bulk_tag && bulkTagOpen && (
                        <form onSubmit={addTagToSelected} className="flex items-center gap-2">
                            <label htmlFor="gc-bulk-tag" className="sr-only">Tag</label>
                            <input
                                id="gc-bulk-tag"
                                autoFocus
                                className="w-40 rounded-md border-zinc-300 text-sm"
                                value={bulkTag}
                                maxLength={50}
                                onChange={(e) => setBulkTag(e.target.value)}
                                placeholder="Nieuwe tag"
                            />
                            <button
                                type="submit"
                                disabled={bulkBusy || !bulkTag.trim()}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {bulkBusy ? 'Bezig...' : 'Toevoegen'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBulkTagOpen(false);
                                    setBulkTag('');
                                }}
                                className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                            >
                                Annuleren
                            </button>
                        </form>
                    )}
                    <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 sm:ml-auto"
                    >
                        Selectie wissen
                    </button>
                </div>
            )}

            <div className="space-y-3 md:hidden">
                {bulkEnabled && rows.length > 0 && (
                    <label className="flex items-center gap-2 px-1 text-sm text-zinc-700">
                        <input type="checkbox" className="rounded border-zinc-300" checked={allSelected} onChange={toggleAll} />
                        Alles op deze pagina selecteren
                    </label>
                )}
                {rows.length === 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-600">
                        <EmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
                    </div>
                )}
                {rows.map((company) => (
                    <div
                        key={company.id}
                        onClick={(e) => openCompany(e, company)}
                        className={cx(
                            'rounded-xl border bg-white p-4',
                            selected.includes(company.id) ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-zinc-200',
                            company.show_url && 'cursor-pointer'
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                                {bulkEnabled && (
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-zinc-300"
                                        checked={selected.includes(company.id)}
                                        onChange={() => toggleOne(company.id)}
                                        aria-label={`Selecteer ${company.bedrijfsnaam}`}
                                    />
                                )}
                                <div className="min-w-0">
                                    {company.show_url ? (
                                        <Link href={company.show_url} className="text-sm font-semibold text-zinc-900 hover:underline">
                                            {company.bedrijfsnaam}
                                        </Link>
                                    ) : (
                                        <div className="text-sm font-semibold text-zinc-900">{company.bedrijfsnaam}</div>
                                    )}
                                    <div className="text-xs text-zinc-500">{company.plaats || '-'}</div>
                                </div>
                            </div>
                            <StatusBadge status={company.status} labels={safeStatusLabels} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500">Contact</div>
                            <div className="break-all text-right text-zinc-700">
                                {company.hoofd_email ? <a href={`mailto:${company.hoofd_email}`} className="hover:underline">{company.hoofd_email}</a> : '-'}
                            </div>
                            <div className="text-zinc-500">Telefoon</div>
                            <div className="text-right text-zinc-700">
                                {company.hoofd_telefoon ? <a href={`tel:${company.hoofd_telefoon.replace(/[^\d+]/g, '')}`} className="hover:underline">{company.hoofd_telefoon}</a> : '-'}
                            </div>
                            {!isTrashView && (
                                <>
                                    <div className="text-zinc-500">Volgende actie</div>
                                    <div className="text-right"><NextAction action={company.volgende_actie} /></div>
                                    <div className="text-zinc-500">Demo eindigt</div>
                                    <div className="text-right"><DemoEnd value={company.demo_eind_op} status={company.status} /></div>
                                </>
                            )}
                            <div className="text-zinc-500">Gebruikers</div>
                            <div className="text-right text-zinc-700">{company.actieve_seats}</div>
                            <div className="text-zinc-500">Omzet excl.</div>
                            <div className="text-right text-zinc-700">{formatEuro(company.omzet_excl)}</div>
                            <div className="text-zinc-500">{isTrashView ? 'Verwijderd op' : 'Laatst bijgewerkt'}</div>
                            <div className="text-right text-zinc-700">
                                {isTrashView ? formatDateTime(company.deleted_at) : formatDateTime(company.updated_at)}
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {company.hoofd_telefoon && (
                                <a
                                    href={`tel:${company.hoofd_telefoon.replace(/[^\d+]/g, '')}`}
                                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    <PhoneIcon />
                                    Bellen
                                </a>
                            )}
                            {company.hoofd_email && (
                                <a
                                    href={`mailto:${company.hoofd_email}`}
                                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    <MailIcon />
                                    Mailen
                                </a>
                            )}
                            {isTrashView ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => restoreCompany(company)}
                                        className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                                    >
                                        Herstel
                                    </button>
                                    {company.force_delete_url && (
                                        <button
                                            type="button"
                                            onClick={() => forceDeleteCompany(company)}
                                            className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                                        >
                                            Definitief verwijderen
                                        </button>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
                <table className="min-w-full divide-y divide-zinc-100">
                    <thead className="bg-zinc-50">
                        <tr>
                            {bulkEnabled && (
                                <th scope="col" className="w-10 px-4 py-3">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        className="rounded border-zinc-300"
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
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Contact</th>
                            <SortHeader field="volgende_actie" label="Volgende actie" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <SortHeader field="demo_eind" label="Demo eindigt" sort={activeSort} dir={activeDir} onSort={onSort} />
                            <SortHeader field="omzet" label="Omzet excl." sort={activeSort} dir={activeDir} onSort={onSort} />
                            {isTrashView ? (
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Verwijderd op</th>
                            ) : (
                                <SortHeader field="bijgewerkt" label="Bijgewerkt" sort={activeSort} dir={activeDir} onSort={onSort} />
                            )}
                            <th scope="col" className="px-4 py-3">
                                <span className="sr-only">Acties</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-zinc-600">
                                    <EmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
                                </td>
                            </tr>
                        )}
                        {rows.map((company) => (
                            <tr
                                key={company.id}
                                onClick={(e) => openCompany(e, company)}
                                className={cx(
                                    'hover:bg-zinc-50',
                                    company.show_url && 'cursor-pointer',
                                    selected.includes(company.id) && 'bg-indigo-50/50'
                                )}
                            >
                                {bulkEnabled && (
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-zinc-300"
                                            checked={selected.includes(company.id)}
                                            onChange={() => toggleOne(company.id)}
                                            aria-label={`Selecteer ${company.bedrijfsnaam}`}
                                        />
                                    </td>
                                )}
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {company.show_url ? (
                                        <Link href={company.show_url} className="text-zinc-900 hover:underline">
                                            {company.bedrijfsnaam}
                                        </Link>
                                    ) : (
                                        company.bedrijfsnaam
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <StatusBadge status={company.status} labels={safeStatusLabels} />
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-700">{company.plaats || '-'}</td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="break-all">
                                        {company.hoofd_email ? (
                                            <a href={`mailto:${company.hoofd_email}`} className="text-zinc-800 hover:text-indigo-700 hover:underline">
                                                {company.hoofd_email}
                                            </a>
                                        ) : '-'}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {company.hoofd_telefoon ? (
                                            <a href={`tel:${company.hoofd_telefoon.replace(/[^\d+]/g, '')}`} className="hover:text-indigo-700 hover:underline">
                                                {company.hoofd_telefoon}
                                            </a>
                                        ) : '-'}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm"><NextAction action={company.volgende_actie} /></td>
                                <td className="px-4 py-3 text-sm"><DemoEnd value={company.demo_eind_op} status={company.status} /></td>
                                <td className="px-4 py-3 text-sm">{formatEuro(company.omzet_excl)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-600">
                                    {isTrashView ? formatDateTime(company.deleted_at) : formatDateTime(company.updated_at)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {isTrashView ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => restoreCompany(company)}
                                                className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                            >
                                                Herstel
                                            </button>
                                            {company.force_delete_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => forceDeleteCompany(company)}
                                                    className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                                                >
                                                    Definitief verwijderen
                                                </button>
                                            )}
                                        </div>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={safeCompanies.links} lastPage={safeCompanies.last_page} />

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-zinc-900">Totaal overzicht</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <div className="text-xs font-medium text-zinc-500">Totale bedrijven</div>
                        <div className="mt-1 text-xl font-semibold text-zinc-900">
                            {Number(totals?.bedrijven ?? safeCompanies.total ?? 0).toLocaleString('nl-NL')}
                        </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <div className="text-xs font-medium text-zinc-500">MRR actieve klanten excl. btw</div>
                        <div className="mt-1 text-xl font-semibold text-zinc-900">{formatEuro(totals?.omzet_excl ?? 0)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
