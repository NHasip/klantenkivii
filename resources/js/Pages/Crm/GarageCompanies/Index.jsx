import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import StatusBadge, { FOCUS_SCOPE } from '../../../components/StatusBadge';

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

function toLocalDateInput(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
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

export default function Index({ companies, totals, trashCount, filters, statusOptions, statusLabels, sourceOptions, urls }) {
    const safeCompanies = companies && typeof companies === 'object'
        ? companies
        : { data: [], links: [], total: 0, per_page: 15 };
    const safeFilters = filters && typeof filters === 'object' ? filters : {};
    const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : [];
    const safeStatusLabels = statusLabels && typeof statusLabels === 'object' ? statusLabels : {};
    const safeUrls = urls && typeof urls === 'object'
        ? urls
        : { index: '/garagebedrijven', create: '/garagebedrijven/nieuw', purge_trash: null };

    const confirm = useConfirm();
    const [filtering, setFiltering] = useState(false);
    const { data, setData } = useForm({
        view: safeFilters.view || 'actief',
        search: safeFilters.search || '',
        status: safeFilters.status || 'alle',
        tag: safeFilters.tag || '',
        sort: safeFilters.sort || 'updated_desc',
        perPage: safeFilters.perPage || safeCompanies.per_page || 15,
    });
    // Use the view the server actually rendered; it falls back to 'actief' when the trash is unavailable.
    const isTrashView = (safeFilters.view || data.view) === 'prullenbak';
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

    const switchView = (view) => {
        const nextData = {
            ...data,
            view,
        };
        setData('view', view);
        router.get(safeUrls.index, nextData, {
            preserveState: true,
            replace: true,
            onStart: () => setFiltering(true),
            onFinish: () => setFiltering(false),
        });
    };

    const runFilter = (nextData) => {
        router.get(safeUrls.index, nextData, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setFiltering(true),
            onFinish: () => setFiltering(false),
        });
    };

    const submit = (event) => {
        event.preventDefault();
        runFilter(data);
    };

    // Live zoeken: na 300 ms zonder typen automatisch filteren (Filter-knop blijft werken).
    const lastSearchRef = useRef(data.search);
    useEffect(() => {
        if (data.search === lastSearchRef.current) return undefined;
        const timer = window.setTimeout(() => {
            lastSearchRef.current = data.search;
            runFilter(data);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [data.search]);

    const hasActiveFilters = Boolean(
        (data.search && data.search.trim() !== '') || (data.status && data.status !== 'alle') || (data.tag && data.tag.trim() !== '')
    );

    const clearFilters = () => {
        const nextData = { ...data, search: '', status: 'alle', tag: '' };
        lastSearchRef.current = '';
        setData(nextData);
        runFilter(nextData);
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

            <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-search">Zoek</label>
                        <input
                            id="gc-search"
                            type="search"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            aria-describedby="gc-search-hint"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Bedrijfsnaam, e-mail, IBAN..."
                        />
                        <div id="gc-search-hint" className="sr-only">De lijst wordt bijgewerkt terwijl je typt.</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-status">Status</label>
                        <select
                            id="gc-status"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            <option value="alle">Alle</option>
                            {safeStatusOptions.map((s) => (
                                <option key={s} value={s}>
                                    {safeStatusLabels[s] || s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-tag">Tag</label>
                        <input
                            id="gc-tag"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.tag}
                            onChange={(e) => setData('tag', e.target.value)}
                            placeholder="bijv. premium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-sort">Sortering</label>
                        <select
                            id="gc-sort"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.sort}
                            onChange={(e) => setData('sort', e.target.value)}
                        >
                            <option value="updated_desc">Laatst bijgewerkt</option>
                            <option value="actief_vanaf_desc">Actief vanaf (nieuwste)</option>
                            <option value="omzet_desc">Omzet (hoog-laag)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-perPage">Per pagina</label>
                        <select
                            id="gc-perPage"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.perPage}
                            onChange={(e) => setData('perPage', e.target.value)}
                        >
                            {[10, 15, 25, 50].map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end justify-between gap-3 md:col-span-1">
                        <div className="text-xs text-zinc-500">Totaal: {Number(safeCompanies.total || 0).toLocaleString('nl-NL')} bedrijven</div>
                        <button
                            type="submit"
                            disabled={filtering}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {filtering ? 'Bezig...' : 'Filter'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="space-y-3 md:hidden">
                {safeCompanies.data.length === 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-600">
                        <EmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
                    </div>
                )}
                {safeCompanies.data.map((company) => (
                    <div key={company.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-zinc-900">{company.bedrijfsnaam}</div>
                                <div className="text-xs text-zinc-500">{company.plaats || '-'}</div>
                            </div>
                            <StatusBadge status={company.status} labels={safeStatusLabels} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500">Contact</div>
                            <div className="break-all text-right text-zinc-700">{company.hoofd_email || '-'}</div>
                            <div className="text-zinc-500">Telefoon</div>
                            <div className="text-right text-zinc-700">{company.hoofd_telefoon || '-'}</div>
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
                            {company.show_url && (
                                <Link
                                    href={company.show_url}
                                    className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs hover:bg-zinc-50"
                                >
                                    Open
                                </Link>
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
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Bedrijf</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Contact</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Gebruikers</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Omzet excl.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">
                                {isTrashView ? 'Verwijderd op' : 'Laatst bijgewerkt'}
                            </th>
                            <th className="px-4 py-3">
                                <span className="sr-only">Acties</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {safeCompanies.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-600">
                                    <EmptyState isTrashView={isTrashView} hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
                                </td>
                            </tr>
                        )}
                        {safeCompanies.data.map((company) => (
                            <tr key={company.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-3 text-sm font-semibold">
                                    <div>{company.bedrijfsnaam}</div>
                                    <div className="text-xs text-zinc-500">{company.plaats || '-'}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <StatusBadge status={company.status} labels={safeStatusLabels} />
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div>{company.hoofd_email || '-'}</div>
                                    <div className="text-xs text-zinc-500">{company.hoofd_telefoon || '-'}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">{company.actieve_seats}</td>
                                <td className="px-4 py-3 text-sm">{formatEuro(company.omzet_excl)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-600">
                                    {isTrashView ? formatDateTime(company.deleted_at) : formatDateTime(company.updated_at)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {company.show_url && (
                                            <Link
                                                href={company.show_url}
                                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                            >
                                                Open
                                            </Link>
                                        )}
                                        {isTrashView ? (
                                            <>
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
                                            </>
                                        ) : null}
                                    </div>
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
