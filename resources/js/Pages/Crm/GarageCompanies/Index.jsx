import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';

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
    if (!links || links.length <= 1) return null;

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

export default function Index({ companies, filters, statusOptions, sourceOptions, urls }) {
    const { data, setData } = useForm({
        search: filters.search || '',
        status: filters.status || 'alle',
        bron: filters.bron || 'alle',
        tag: filters.tag || '',
        sort: filters.sort || 'updated_desc',
        perPage: filters.perPage || companies.per_page || 15,
    });

    const submit = (event) => {
        event.preventDefault();
        router.get(urls.index, data, { preserveState: true, replace: true });
    };

    return (
        <div className="space-y-6">
            <Head title="Klanten" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">Klanten</h1>
                    <p className="mt-1 text-sm text-zinc-500">Overzicht van garagebedrijven en hun status.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={urls.old_index}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
                    >
                        Klanten (old)
                    </Link>
                    <Link
                        href={urls.create}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Nieuwe klant
                    </Link>
                </div>
            </div>

            <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                    <div className="md:col-span-2">
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
                            {statusOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600">Bron</label>
                        <select
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={data.bron}
                            onChange={(e) => setData('bron', e.target.value)}
                        >
                            <option value="alle">Alle</option>
                            {sourceOptions.map((s) => (
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
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-zinc-500">Totaal: {companies.total} bedrijven</div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Per pagina</label>
                        <select
                            className="rounded-md border-zinc-300 text-sm"
                            value={data.perPage}
                            onChange={(e) => setData('perPage', e.target.value)}
                        >
                            {[10, 15, 25, 50].map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
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
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Laatst bijgewerkt</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {companies.data.map((company) => (
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
                                <td className="px-4 py-3 text-sm text-zinc-600">{formatDateTime(company.updated_at)}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={route('crm.garage_companies.show', company.id)}
                                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                    >
                                        Open
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={companies.links} />
        </div>
    );
}
