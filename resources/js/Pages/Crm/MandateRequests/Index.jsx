import React, { Fragment, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Badge, Button, Card, EmptyState, PageHeader, cx, inputClasses, tableClasses } from '../../../components/ui';
import { AdoptComparison, REQUEST_STATUS_META, TAP, RequestStatusBadge, VIA_LABELS, requestErrorMessage } from '../GarageCompanies/partials/MandateRequests';
import { Notice, formatDateTime } from '../GarageCompanies/partials/showUtils';

const FILTERS = [
    { key: 'aandacht', label: 'Actie nodig' },
    { key: 'alle', label: 'Alle' },
    ...Object.entries(REQUEST_STATUS_META).map(([key, meta]) => ({ key, label: meta.label })),
];

const needsAction = (r) => r.status === 'ontvangen' || r.status === 'fout';

function LinkCustomer({ request, customers, onLinked, disabled, mobile = false }) {
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
        <div className={cx('space-y-1.5', mobile ? 'w-full' : 'min-w-[14rem]')}>
            <input type="search" className={cx(inputClasses, mobile ? 'min-h-[44px] text-base' : 'py-1 text-xs')} placeholder="Zoek klant..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label={`Zoek klant voor ${request.kenmerk}`} />
            <div className={cx('flex gap-1.5', mobile ? 'flex-col' : 'items-center')}>
                <select className={cx(inputClasses, mobile ? 'min-h-[44px] text-base' : 'py-1.5 text-sm')} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Klant voor ${request.kenmerk}`}>
                    <option value="">Kies klant ({filtered.length})</option>
                    {filtered.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.naam}{c.status ? ` (${c.status})` : ''}
                        </option>
                    ))}
                </select>
                <Button size="sm" variant="secondary" icon="link" className={mobile ? cx(TAP, 'w-full') : ''} onClick={submit} loading={busy} disabled={!value || disabled}>
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
    const [openId, setOpenId] = useState(null);

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
                                    'tap-target rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors focus-ring',
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
                    <>
                    {/* Kaarten op mobiel */}
                    <ul className="divide-y divide-zinc-100 md:hidden" aria-label="Machtigingen">
                        {visible.map((r) => {
                            const canLink = r.status !== 'verwerkt' && r.status !== 'ingetrokken' && (!r.company || needsAction(r));
                            return (
                                <li key={r.id} className="space-y-3 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-semibold text-zinc-900">{r.kenmerk}</span>
                                        <RequestStatusBadge status={r.status} />
                                    </div>
                                    {r.mandaat_id && <p className="-mt-2 text-xs text-zinc-500">Mandaat {r.mandaat_id}</p>}
                                    {r.error && <p className="text-sm text-rose-700">{r.error}</p>}
                                    <div>
                                        {r.company ? (
                                            <a href={r.company.url} className="inline-flex min-h-[44px] items-center font-medium text-indigo-700 hover:underline focus-ring">{r.company.naam}</a>
                                        ) : (
                                            <Badge tone="warning">Niet gekoppeld</Badge>
                                        )}
                                        {canLink && (
                                            <div className="mt-2">
                                                <LinkCustomer
                                                    mobile
                                                    request={r}
                                                    customers={customers}
                                                    disabled={busyId !== null}
                                                    onLinked={{ url: urls.link.replace('__ID__', r.id), done: (text) => reload(text) }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
                                        <p className="text-xs font-medium text-zinc-500">Formulier</p>
                                        {r.form?.bedrijfsnaam || r.form?.naam ? (
                                            <>
                                                <p className="font-medium text-zinc-800">{r.form.bedrijfsnaam || '-'}</p>
                                                <p className="break-words">{[r.form.naam, r.form.email].filter(Boolean).join(' · ')}</p>
                                                {r.iban_masked && <p className="font-mono text-xs">IBAN {r.iban_masked}</p>}
                                            </>
                                        ) : (
                                            <p className="text-zinc-400">Nog niet ingevuld</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-600">
                                        <p>{r.sent_at ? `Verstuurd ${formatDateTime(r.sent_at)}${r.sent_via ? ` (${VIA_LABELS[r.sent_via] || r.sent_via})` : ''}` : 'Niet verstuurd'}</p>
                                        {r.completed_at && <p>Ingevuld {formatDateTime(r.completed_at)}</p>}
                                    </div>
                                    {(r.comparison?.length > 0 || r.can_process || r.can_revoke) && (
                                        <div className="flex flex-wrap gap-2">
                                            {r.comparison?.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    icon="file-text"
                                                    className={TAP}
                                                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                                                    aria-expanded={openId === r.id}
                                                    aria-controls={`gegevens-kaart-${r.id}`}
                                                >
                                                    Gegevens
                                                </Button>
                                            )}
                                            {r.can_process && (
                                                <Button size="sm" icon="check" className={TAP} onClick={() => act(r, 'process')} loading={busyId === r.id} disabled={busyId !== null}>
                                                    Verwerken
                                                </Button>
                                            )}
                                            {r.can_revoke && (
                                                <Button size="sm" variant="ghost" icon="x-circle" className={TAP} onClick={() => act(r, 'revoke')} disabled={busyId !== null}>
                                                    Intrekken
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {openId === r.id && (
                                        <div id={`gegevens-kaart-${r.id}`}>
                                            <p className="mb-2 text-xs font-medium text-zinc-700">Gegevens van het formulier vergeleken met {r.company?.naam}</p>
                                            <AdoptComparison
                                                idScope="kaart-"
                                                request={r}
                                                url={urls.adopt?.replace('__ID__', r.id)}
                                                onDone={(text) => {
                                                    setOpenId(null);
                                                    reload(text);
                                                }}
                                            />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className={cx(tableClasses.wrapper, 'hidden md:block')}>
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
                                    <Fragment key={r.id}>
                                        <tr className={tableClasses.tr}>
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
                                                    {r.comparison?.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            icon="file-text"
                                                            onClick={() => setOpenId(openId === r.id ? null : r.id)}
                                                            aria-expanded={openId === r.id}
                                                            aria-controls={`gegevens-${r.id}`}
                                                        >
                                                            Gegevens
                                                        </Button>
                                                    )}
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
                                        {openId === r.id && (
                                            <tr id={`gegevens-${r.id}`}>
                                                <td colSpan={6} className="bg-zinc-50/60 px-4 py-3">
                                                    <div className="max-w-3xl">
                                                        <p className="mb-2 text-xs font-medium text-zinc-700">Gegevens van het formulier vergeleken met {r.company?.naam}</p>
                                                        <AdoptComparison
                                                            request={r}
                                                            url={urls.adopt?.replace('__ID__', r.id)}
                                                            onDone={(text) => {
                                                                setOpenId(null);
                                                                reload(text);
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </Card>
        </>
    );
}
