import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Badge, Button, Card, EmptyState, PageHeader, cx, inputClasses, tableClasses } from '../../../components/ui';
import { REQUEST_STATUS_META, RequestStatusBadge, VIA_LABELS, requestErrorMessage } from '../GarageCompanies/partials/MandateRequests';
import { Notice, formatDateTime } from '../GarageCompanies/partials/showUtils';

const FILTERS = [
    { key: 'aandacht', label: 'Actie nodig' },
    { key: 'alle', label: 'Alle' },
    ...Object.entries(REQUEST_STATUS_META).map(([key, meta]) => ({ key, label: meta.label })),
];

const needsAction = (r) => r.status === 'ontvangen' || r.status === 'fout';

function LinkCustomer({ request, customers, onLinked, disabled }) {
    const [query, setQuery] = useState(request.form?.bedrijfsnaam || '');
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const q = query.trim().toLowerCase();
    const filtered = (q ? customers.filter((c) => c.naam.toLowerCase().includes(q)) : customers).slice(0, 50);

    const submit = async () => {
        if (!value) return;
        setBusy(true);
        setError(null);
        try {
            const { data } = await axios.post(onLinked.url, { garage_company_id: Number(value) });
            onLinked.done(data.message);
        } catch (e) {
            setError(requestErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-w-[14rem] space-y-1.5">
            <input type="search" className={cx(inputClasses, 'py-1 text-xs')} placeholder="Zoek klant..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label={`Zoek klant voor ${request.kenmerk}`} />
            <div className="flex items-center gap-1.5">
                <select className={cx(inputClasses, 'py-1.5 text-sm')} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Klant voor ${request.kenmerk}`}>
                    <option value="">Kies klant ({filtered.length})</option>
                    {filtered.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.naam}{c.status ? ` (${c.status})` : ''}
                        </option>
                    ))}
                </select>
                <Button size="sm" variant="secondary" icon="link" onClick={submit} loading={busy} disabled={!value || disabled}>
                    Koppelen
                </Button>
            </div>
            {error && <p className="text-xs text-rose-700">{error}</p>}
        </div>
    );
}

export default function Index({ available = true, requests = [], customers = [], urls }) {
    const confirm = useConfirm();
    const [filter, setFilter] = useState(requests.some(needsAction) ? 'aandacht' : 'alle');
    const [search, setSearch] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);

    const counts = useMemo(() => {
        const c = { alle: requests.length, aandacht: requests.filter(needsAction).length };
        requests.forEach((r) => {
            c[r.status] = (c[r.status] || 0) + 1;
        });
        return c;
    }, [requests]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return requests.filter((r) => {
            if (filter === 'aandacht' && !needsAction(r)) return false;
            if (filter !== 'aandacht' && filter !== 'alle' && r.status !== filter) return false;
            if (!q) return true;
            return [r.kenmerk, r.company?.naam, r.form?.bedrijfsnaam, r.form?.naam, r.form?.email, r.recipient_email]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [requests, filter, search]);

    const reload = (text, tone = 'success') => {
        setMessage({ tone, text });
        router.reload({ only: ['requests'], preserveScroll: true });
    };

    const act = async (request, kind) => {
        const texts = {
            process: { title: 'Machtiging verwerken?', message: `Voor ${request.company?.naam} wordt een actief mandaat aangemaakt met kenmerk ${request.kenmerk}. Een eerder actief mandaat wordt ingetrokken (niet verwijderd).`, confirmText: 'Verwerken' },
            revoke: { title: 'Verzoek intrekken?', message: `Kenmerk ${request.kenmerk} wordt ingetrokken en een eventueel bewaarde IBAN gewist. Bestaande mandaten blijven ongewijzigd.`, confirmText: 'Intrekken', tone: 'danger' },
        }[kind];
        if (!(await confirm({ ...texts, cancelText: 'Annuleren' }))) return;
        setBusyId(request.id);
        try {
            const { data } = await axios.post(urls[kind].replace('__ID__', request.id));
            reload(data.message);
        } catch (e) {
            setMessage({ tone: 'danger', text: requestErrorMessage(e) });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <Head title="Machtigingen" />
            <PageHeader
                title="Machtigingen via kivii.nl"
                description="Alle machtigingsverzoeken en inzendingen van het formulier op kivii.nl. Inzendingen zonder klant koppel je hier en verwerk je daarna."
            />

            {!available && (
                <Notice tone="danger" className="mb-6">De database-migratie voor machtigingsverzoeken is nog niet uitgevoerd.</Notice>
            )}
            {message && <Notice tone={message.tone} className="mb-4">{message.text}</Notice>}

            <Card padded={false}>
                <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter op status">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                aria-pressed={filter === f.key}
                                className={cx(
                                    'rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors focus-ring',
                                    filter === f.key ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50',
                                )}
                            >
                                {f.label}
                                <span className="ml-1.5 tabular-nums opacity-75">{counts[f.key] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <input type="search" className={cx(inputClasses, 'sm:max-w-xs')} placeholder="Zoek op kenmerk, klant of e-mail" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Zoeken" />
                </div>

                {visible.length === 0 ? (
                    <div className="p-6">
                        <EmptyState compact icon="file-text" title="Geen machtigingen" description={filter === 'aandacht' ? 'Er wacht niets op koppelen of verwerken.' : 'Geen verzoeken voor dit filter.'} />
                    </div>
                ) : (
                    <div className={tableClasses.wrapper}>
                        <table className={tableClasses.table}>
                            <thead className={tableClasses.thead}>
                                <tr>
                                    <th className={tableClasses.th}>Kenmerk</th>
                                    <th className={tableClasses.th}>Status</th>
                                    <th className={tableClasses.th}>Klant</th>
                                    <th className={tableClasses.th}>Formulier</th>
                                    <th className={tableClasses.th}>Verstuurd / ingevuld</th>
                                    <th className={tableClasses.th}>Acties</th>
                                </tr>
                            </thead>
                            <tbody className={tableClasses.tbody}>
                                {visible.map((r) => (
                                    <tr key={r.id} className={tableClasses.tr}>
                                        <td className={cx(tableClasses.td, 'font-mono text-sm font-semibold')}>
                                            {r.kenmerk}
                                            {r.mandaat_id && <p className="font-sans text-xs font-normal text-zinc-500">Mandaat {r.mandaat_id}</p>}
                                        </td>
                                        <td className={tableClasses.td}>
                                            <RequestStatusBadge status={r.status} />
                                            {r.error && <p className="mt-1 max-w-[16rem] text-xs text-rose-700">{r.error}</p>}
                                        </td>
                                        <td className={tableClasses.td}>
                                            {r.company ? (
                                                <a href={r.company.url} className="font-medium text-indigo-700 hover:underline">{r.company.naam}</a>
                                            ) : (
                                                <Badge tone="warning">Niet gekoppeld</Badge>
                                            )}
                                            {r.status !== 'verwerkt' && r.status !== 'ingetrokken' && (!r.company || needsAction(r)) && (
                                                <div className="mt-2">
                                                    <LinkCustomer
                                                        request={r}
                                                        customers={customers}
                                                        disabled={busyId !== null}
                                                        onLinked={{ url: urls.link.replace('__ID__', r.id), done: (text) => reload(text) }}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className={cx(tableClasses.td, 'text-xs text-zinc-600')}>
                                            {r.form?.bedrijfsnaam || r.form?.naam ? (
                                                <>
                                                    <p className="font-medium text-zinc-800">{r.form.bedrijfsnaam || '-'}</p>
                                                    <p>{[r.form.naam, r.form.email].filter(Boolean).join(' · ')}</p>
                                                    {r.iban_masked && <p className="font-mono">IBAN {r.iban_masked}</p>}
                                                </>
                                            ) : (
                                                <span className="text-zinc-400">Nog niet ingevuld</span>
                                            )}
                                        </td>
                                        <td className={cx(tableClasses.td, 'whitespace-nowrap text-xs text-zinc-600')}>
                                            <p>{r.sent_at ? `${formatDateTime(r.sent_at)}${r.sent_via ? ` (${VIA_LABELS[r.sent_via] || r.sent_via})` : ''}` : '-'}</p>
                                            <p>{r.completed_at ? `Ingevuld ${formatDateTime(r.completed_at)}` : ''}</p>
                                        </td>
                                        <td className={tableClasses.td}>
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.can_process && (
                                                    <Button size="sm" icon="check" onClick={() => act(r, 'process')} loading={busyId === r.id} disabled={busyId !== null}>
                                                        Verwerken
                                                    </Button>
                                                )}
                                                {r.can_revoke && (
                                                    <Button size="sm" variant="ghost" icon="x-circle" onClick={() => act(r, 'revoke')} disabled={busyId !== null}>
                                                        Intrekken
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </>
    );
}
