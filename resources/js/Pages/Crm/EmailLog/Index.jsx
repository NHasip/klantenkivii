import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Badge, Card, EmptyState, PageHeader, cx, inputClasses, tableClasses } from '../../../components/ui';
import { Notice, formatDateTime } from '../GarageCompanies/partials/showUtils';

const FILTERS = [
    { key: 'niet_verstuurd', label: 'Niet verstuurd' },
    { key: 'verstuurd', label: 'Verstuurd' },
    { key: 'gepland', label: 'Gepland' },
    { key: 'alle', label: 'Alle' },
];

const STATE_META = {
    sent: { label: 'Verstuurd', tone: 'success' },
    failed: { label: 'Mislukt', tone: 'danger' },
    skipped: { label: 'Overgeslagen', tone: 'warning' },
    planned: { label: 'Gepland', tone: 'info' },
};

const EMPTY_TEXT = {
    niet_verstuurd: 'Alle mails zijn verstuurd. Er is niets mislukt of overgeslagen.',
    verstuurd: 'Nog geen verstuurde mails.',
    gepland: 'Er staan geen demo-mails gepland.',
    alle: 'Er zijn nog geen mails vastgelegd.',
};

function Pagination({ links, lastPage }) {
    if (!Array.isArray(links) || Number(lastPage) <= 1) return null;
    return (
        <nav aria-label="Paginering" className="flex flex-wrap items-center gap-1 border-t border-zinc-100 p-4">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={cx(
                            'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
                            link.active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50',
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-3 text-sm text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </nav>
    );
}

export default function EmailLogIndex({ available, rows, counts = {}, filter, search: initialSearch = '', inbox, url }) {
    const [search, setSearch] = useState(initialSearch);
    const first = useRef(true);
    const items = rows?.data ?? [];

    const visit = (params) =>
        router.get(url, params, { preserveState: true, preserveScroll: true, replace: true });

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return undefined;
        }
        const t = setTimeout(() => visit({ filter, q: search || undefined }), 300);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <>
            <Head title="E-maillog" />
            <PageHeader title="E-maillog" description="Alle mails die het CRM heeft geprobeerd te versturen, met de reden als een mail niet is verstuurd." />

            {!available && <Notice tone="danger" className="mb-6">De database-tabellen voor het e-maillog ontbreken nog. Voer de migraties uit.</Notice>}

            <Notice tone="info" className="mb-4">
                Het CRM ziet alleen of het versturen is gelukt. Komt een mail daarna niet aan (bijvoorbeeld omdat de mailbox niet bestaat), dan komt die melding als antwoord binnen in de inbox van {inbox || 'info@kivii.nl'}.
            </Notice>

            <Card padded={false}>
                <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter op status">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => visit({ filter: f.key, q: search || undefined })}
                                aria-pressed={filter === f.key}
                                className={cx(
                                    'tap-target rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors focus-ring',
                                    filter === f.key ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50',
                                )}
                            >
                                {f.label}
                                <span className="ml-1.5 tabular-nums opacity-75">{counts[f.key] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <input
                        type="search"
                        className={cx(inputClasses, 'sm:max-w-xs')}
                        placeholder="Zoek op klant, e-mail of onderwerp"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Zoeken"
                    />
                </div>

                {items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState compact icon="mail" title="Geen mails" description={search ? 'Geen mails gevonden voor deze zoekterm.' : EMPTY_TEXT[filter]} />
                    </div>
                ) : (
                    <>
                    {/* Kaarten op mobiel */}
                    <ul className="divide-y divide-zinc-100 md:hidden">
                        {items.map((r) => {
                            const meta = STATE_META[r.state] || { label: r.state, tone: 'neutral' };
                            return (
                                <li key={r.id} className="space-y-2 p-4">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <Badge tone={meta.tone} dot>{meta.label}</Badge>
                                        <span className="text-sm font-medium text-zinc-900">{r.type}</span>
                                        <span className="ml-auto whitespace-nowrap text-xs text-zinc-500">
                                            {r.state === 'planned' && r.at ? `Gepland ${formatDateTime(r.at)}` : formatDateTime(r.at)}
                                        </span>
                                    </div>
                                    {r.company ? (
                                        <a href={r.company.url} className="inline-flex min-h-[44px] items-center font-medium text-indigo-700 hover:underline focus-ring">{r.company.naam}</a>
                                    ) : (
                                        <p className="text-sm text-zinc-400">Geen klant</p>
                                    )}
                                    <dl className="space-y-1 text-sm">
                                        <div className="flex gap-2">
                                            <dt className="w-20 shrink-0 text-zinc-500">Aan</dt>
                                            <dd className="min-w-0 break-words text-zinc-800">{r.to || <span className="text-zinc-400">Geen adres</span>}</dd>
                                        </div>
                                        <div className="flex gap-2">
                                            <dt className="w-20 shrink-0 text-zinc-500">Onderwerp</dt>
                                            <dd className="min-w-0 break-words text-zinc-800">{r.subject || <span className="text-zinc-400">-</span>}</dd>
                                        </div>
                                    </dl>
                                    {r.reason && (
                                        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 ring-1 ring-inset ring-zinc-200">
                                            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Reden</span>
                                            {r.reason}
                                        </p>
                                    )}
                                    {r.raw && (
                                        <details>
                                            <summary className="flex min-h-[44px] cursor-pointer items-center text-sm text-zinc-600 hover:text-zinc-800">Technische melding</summary>
                                            <p className="mt-1 whitespace-pre-wrap break-words rounded bg-zinc-50 p-2 font-mono text-xs text-zinc-600">{r.raw}</p>
                                        </details>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className={cx(tableClasses.wrapper, 'hidden md:block')}>
                        <table className={tableClasses.table}>
                            <thead className={tableClasses.thead}>
                                <tr>
                                    <th className={tableClasses.th}>Datum</th>
                                    <th className={tableClasses.th}>Klant</th>
                                    <th className={tableClasses.th}>Soort</th>
                                    <th className={tableClasses.th}>Aan</th>
                                    <th className={tableClasses.th}>Onderwerp</th>
                                    <th className={tableClasses.th}>Status</th>
                                    <th className={tableClasses.th}>Reden</th>
                                </tr>
                            </thead>
                            <tbody className={tableClasses.tbody}>
                                {items.map((r) => {
                                    const meta = STATE_META[r.state] || { label: r.state, tone: 'neutral' };
                                    return (
                                        <tr key={r.id} className={tableClasses.tr}>
                                            <td className={cx(tableClasses.td, 'whitespace-nowrap text-xs text-zinc-600')}>
                                                {r.state === 'planned' && r.at ? `Gepland ${formatDateTime(r.at)}` : formatDateTime(r.at)}
                                            </td>
                                            <td className={tableClasses.td}>
                                                {r.company ? (
                                                    <a href={r.company.url} className="font-medium text-indigo-700 hover:underline">{r.company.naam}</a>
                                                ) : (
                                                    <span className="text-zinc-400">-</span>
                                                )}
                                            </td>
                                            <td className={cx(tableClasses.td, 'whitespace-nowrap text-sm')}>{r.type}</td>
                                            <td className={cx(tableClasses.td, 'text-sm')}>{r.to || <span className="text-zinc-400">Geen adres</span>}</td>
                                            <td className={cx(tableClasses.td, 'max-w-[16rem] truncate text-sm')} title={r.subject || undefined}>
                                                {r.subject || <span className="text-zinc-400">-</span>}
                                            </td>
                                            <td className={tableClasses.td}>
                                                <Badge tone={meta.tone} dot>{meta.label}</Badge>
                                            </td>
                                            <td className={cx(tableClasses.td, 'min-w-[14rem] max-w-md text-sm text-zinc-700')}>
                                                {r.reason || <span className="text-zinc-400">-</span>}
                                                {r.raw && (
                                                    <details className="mt-1">
                                                        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">Technische melding</summary>
                                                        <p className="mt-1 whitespace-pre-wrap break-words rounded bg-zinc-50 p-2 font-mono text-xs text-zinc-600">{r.raw}</p>
                                                    </details>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
                <Pagination links={rows?.links} lastPage={rows?.last_page} />
            </Card>
        </>
    );
}
