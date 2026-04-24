import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '—';
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

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

function Pagination({ links }) {
    if (!Array.isArray(links) || links.length <= 1) return null;

    return (
        <div className="mt-6 flex flex-wrap gap-2">
            {links.map((link, idx) => (
                <Link
                    key={`${link.label}-${idx}`}
                    href={link.url || '#'}
                    className={cx(
                        'rounded-md border px-3 py-1.5 text-sm',
                        link.active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                        !link.url && 'cursor-not-allowed opacity-50'
                    )}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

export default function Index({ companies, totals, trashCount, filters, statusOptions, sourceOptions, urls }) {
    const safeCompanies = companies && typeof companies === 'object'
        ? companies
        : { data: [], links: [], total: 0, per_page: 15 };
    const safeFilters = filters && typeof filters === 'object' ? filters : {};
    const safeStatusOptions = Array.isArray(statusOptions) ? statusOptions : [];
    const safeUrls = urls && typeof urls === 'object'
        ? urls
        : { index: '/garagebedrijven', create: '/garagebedrijven/nieuw' };

    const confirm = useConfirm();
    const { data, setData } = useForm({
        view: safeFilters.view || 'actief',
        search: safeFilters.search || '',
        status: safeFilters.status || 'alle',
        tag: safeFilters.tag || '',
        sort: safeFilters.sort || 'updated_desc',
        perPage: safeFilters.perPage || safeCompanies.per_page || 15,
    });
    const isTrashView = data.view === 'prullenbak';

    const deleteCompany = async (company) => {
        const ok = await confirm({
            title: 'Naar prullenbak',
            message: `Weet je zeker dat je "${company.bedrijfsnaam}" naar de prullenbak wilt verplaatsen?`,
            confirmText: 'Verplaats',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.delete(company.delete_url, { preserveScroll: true });
    };

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

    const switchView = (view) => {
        const nextData = {
            ...data,
            view,
        };
        setData('view', view);
        router.get(safeUrls.index, nextData, { preserveState: true, replace: true });
    };

    const submit = (event) => {
        event.preventDefault();
        router.get(safeUrls.index, data, { preserveState: true, replace: true });
    };

    return (
        <div className="space-y-6">
            <Head title="Klanten" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">Klanten</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        {isTrashView ? 'Herstel verwijderde klanten vanuit de prullenbak.' : 'Overzicht van garagebedrijven en hun status.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => switchView('actief')}
                            className={cx(
                                'rounded px-3 py-1.5 text-sm font-semibold transition',
                                !isTrashView ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                            )}
                        >
                            Actief
                        </button>
                        <button
                            type="button"
                            onClick={() => switchView('prullenbak')}
                            className={cx(
                                'rounded px-3 py-1.5 text-sm font-semibold transition',
                                isTrashView ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                            )}
                        >
                            Prullenbak ({Number(trashCount || 0)})
                        </button>
                    </div>
                    {!isTrashView && safeUrls.create && (
                        <Link
                            href={safeUrls.create}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Nieuwe klant
                        </Link>
                    )}
                </div>
            </div>

            <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600">Zoek</label>
                        <input
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Bedrijfsnaam, email, IBAN..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600">Status</label>
                        <select
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            <option value="alle">Alle</option>
                            {safeStatusOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600">Tag</label>
                        <input
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.tag}
                            onChange={(e) => setData('tag', e.target.value)}
                            placeholder="bijv. premium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600">Sortering</label>
                        <select
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
                        <label className="block text-xs font-medium text-zinc-600">Per pagina</label>
                        <select
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
                    <div className="flex items-end justify-between gap-3">
                        <div className="text-xs text-zinc-500">Totaal: {safeCompanies.total} bedrijven</div>
                        <button
                            type="submit"
                            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        >
                            Filter
                        </button>
                    </div>
                </div>
            </form>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
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
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {safeCompanies.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                                    {isTrashView ? 'Prullenbak is leeg.' : 'Geen klanten gevonden.'}
                                </td>
                            </tr>
                        )}
                        {safeCompanies.data.map((company) => (
                            <tr key={company.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-3 text-sm font-semibold">
                                    <div>{company.bedrijfsnaam}</div>
                                    <div className="text-xs text-zinc-500">{company.plaats || '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                        {company.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div>{company.hoofd_email}</div>
                                    <div className="text-xs text-zinc-500">{company.hoofd_telefoon || '—'}</div>
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
                                            <button
                                                type="button"
                                                onClick={() => restoreCompany(company)}
                                                className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                            >
                                                Herstel
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => deleteCompany(company)}
                                                className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                                            >
                                                Verwijder
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={safeCompanies.links} />

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
                        <div className="text-xs font-medium text-zinc-500">Totale omzet excl. btw</div>
                        <div className="mt-1 text-xl font-semibold text-zinc-900">{formatEuro(totals?.omzet_excl ?? 0)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
