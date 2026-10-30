import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Badge, Button, Card, CardHeader, Field, PageHeader, cx, tableClasses } from '../../../components/ui';

const EXAMPLE = 'Voorbeeld Garage B.V.\tNL91ABNA0417164300\tKIVII-TEST-001\t€ 83,49\tKivii abonnement\t01/10/2026';

const PREVIEW_META = {
    match: { label: 'Match', tone: 'success' },
    geen_match: { label: 'Geen match', tone: 'warning' },
    fout: { label: 'Fout', tone: 'danger' },
};

const RESULT_META = {
    opgeslagen: { label: 'Opgeslagen', tone: 'success' },
    overgeslagen: { label: 'Overgeslagen', tone: 'warning' },
    fout: { label: 'Fout', tone: 'danger' },
};

const euro = (v) => (v === null || v === undefined ? '' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v));
const formatDate = (iso) => (iso ? iso.split('-').reverse().join('-') : '');

function errorMessage(error) {
    const data = error?.response?.data;
    if (data?.errors?.tekst?.[0]) return data.errors.tekst[0];
    if (error?.response?.status === 429) return 'Te veel verzoeken. Wacht even en probeer het opnieuw.';
    if (data?.message) return data.message;
    return 'Er ging iets mis. Probeer het opnieuw.';
}

function defaultChoice(row, info) {
    if (row.status !== 'match' || !row.match) return { customer_id: '', replace: false };
    return { customer_id: String(row.match.id), replace: false };
}

function CustomerPicker({ row, value, onChange, customers, byId }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const candidateIds = new Set((row.candidates ?? []).map((c) => c.id));
    const filtered = q ? customers.filter((c) => c.naam.toLowerCase().includes(q)).slice(0, 50) : customers;
    const selected = value ? byId[value] : null;

    return (
        <div className="min-w-[14rem] space-y-1.5">
            <select
                className="input py-1.5 text-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`Klant voor rij ${row.rij}`}
            >
                <option value="">Overslaan</option>
                {selected && !candidateIds.has(selected.id) && !filtered.includes(selected) ? (
                    <option value={String(selected.id)}>{selected.naam}</option>
                ) : null}
                {row.candidates?.length ? (
                    <optgroup label="Suggesties">
                        {row.candidates.map((c) => (
                            <option key={`c-${c.id}`} value={String(c.id)}>
                                {c.naam} ({Math.round(c.score * 100)}%)
                            </option>
                        ))}
                    </optgroup>
                ) : null}
                <optgroup label={q ? 'Zoekresultaten' : 'Alle klanten'}>
                    {filtered.filter((c) => !candidateIds.has(c.id)).map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.naam}{c.status ? ` (${c.status})` : ''}
                        </option>
                    ))}
                </optgroup>
            </select>
            <input
                type="search"
                className="input py-1 text-xs"
                placeholder="Zoek klant..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`Zoek klant voor rij ${row.rij}`}
            />
        </div>
    );
}

export default function Index({ maxRows = 200, customers = [], urls }) {
    const confirm = useConfirm();
    const [text, setText] = useState('');
    const [checkedText, setCheckedText] = useState(null);
    const [preview, setPreview] = useState(null);
    const [choices, setChoices] = useState({});
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);

    const byId = useMemo(() => Object.fromEntries(customers.map((c) => [String(c.id), c])), [customers]);
    const info = preview?.customers ?? {};

    const plan = useMemo(() => {
        if (!preview) return { importCount: 0, replaceCount: 0 };
        let importCount = 0;
        let replaceCount = 0;
        preview.results.forEach((r) => {
            const ch = choices[r.rij];
            if (r.status === 'fout' || !ch?.customer_id) return;
            const active = info[ch.customer_id]?.actief_mandaat;
            if (active && !ch.replace) return;
            importCount += 1;
            if (active) replaceCount += 1;
        });
        return { importCount, replaceCount };
    }, [preview, choices, info]);

    const canImport = checkedText !== null && checkedText === text && plan.importCount > 0 && !busy;

    const setChoice = (rij, patch) => setChoices((prev) => ({ ...prev, [rij]: { ...prev[rij], ...patch } }));

    const runPreview = async () => {
        setBusy('preview');
        setError(null);
        setResult(null);
        try {
            const { data } = await axios.post(urls.preview, { tekst: text });
            setPreview(data);
            setChoices(Object.fromEntries(data.results.map((r) => [r.rij, defaultChoice(r, data.customers)])));
            setCheckedText(text);
        } catch (e) {
            setError(errorMessage(e));
            setPreview(null);
            setCheckedText(null);
        } finally {
            setBusy(null);
        }
    };

    const runStore = async () => {
        const ok = await confirm({
            title: 'SEPA-machtigingen importeren?',
            message: `Er ${plan.importCount === 1 ? 'wordt 1 mandaat' : `worden ${plan.importCount} mandaten`} aangemaakt als Actief${plan.replaceCount ? `, waarvan ${plan.replaceCount} een bestaand actief mandaat vervangt (dat wordt ingetrokken, niet verwijderd)` : ''}. Modules, prijzen en klantstatus worden niet gewijzigd en er worden geen e-mails verstuurd.`,
            confirmText: 'Importeren',
            cancelText: 'Annuleren',
        });
        if (!ok) return;

        setBusy('store');
        setError(null);
        try {
            const payload = preview.results.map((r) => ({
                rij: r.rij,
                customer_id: choices[r.rij]?.customer_id ? Number(choices[r.rij].customer_id) : null,
                replace: !!choices[r.rij]?.replace,
            }));
            const { data } = await axios.post(urls.store, { tekst: text, choices: payload });
            setResult(data);
            setPreview(null);
            setCheckedText(null);
            setText('');
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <Head title="SEPA importeren" />
            <PageHeader
                title="SEPA-machtigingen importeren"
                description={`Plak rijen uit Excel (maximaal ${maxRows}). Controleer eerst, kies per rij de klant en importeer daarna zelf.`}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <Field
                        id="sepa-tekst"
                        label="Rijen uit Excel"
                        hint="Na een wijziging moet je opnieuw controleren. De gegevens worden niet bewaard tot je importeert."
                        error={error}
                    >
                        <textarea
                            id="sepa-tekst"
                            className={cx('input font-mono text-xs', 'min-h-[14rem]')}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            autoComplete="off"
                            placeholder="Klantnaam	IBAN	Kenmerk	Bedrag	Omschrijving	Machtigingsdatum"
                            aria-describedby={error ? 'sepa-tekst-error' : 'sepa-tekst-hint'}
                        />
                    </Field>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button variant="secondary" icon="check" loading={busy === 'preview'} disabled={!text.trim() || !!busy} onClick={runPreview}>
                            Controleren
                        </Button>
                        <Button icon="upload" loading={busy === 'store'} disabled={!canImport} onClick={runStore}>
                            Importeren{plan.importCount ? ` (${plan.importCount})` : ''}
                        </Button>
                        {preview && checkedText !== text ? <span className="text-sm text-amber-700">Tekst gewijzigd, controleer opnieuw.</span> : null}
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Hulp" icon="info" />
                    <div className="space-y-3 text-sm text-zinc-600">
                        <p>
                            Kolommen in deze volgorde, gescheiden door tabs (kopieren uit Excel), puntkomma of meerdere spaties:
                            klantnaam, IBAN, kenmerk machtiging, bedrag, omschrijving, machtigingsdatum (dd/mm/jjjj of jjjj-mm-dd).
                        </p>
                        <p>
                            Het IBAN wordt gecontroleerd (controlegetal, NL is 18 tekens) en alleen gemaskeerd getoond. Kenmerk: max. 35 tekens.
                            Bedrag en omschrijving zijn alleen ter vergelijking en worden niet opgeslagen.
                        </p>
                        <p>
                            Per rij wordt een nieuw actief mandaat aangemaakt en het kenmerk machtiging bij de klant gezet.
                            Klanten met een actief mandaat worden standaard overgeslagen, tenzij je Vervangen kiest.
                        </p>
                        <p className="font-medium text-zinc-700">Voorbeeld (testgegevens)</p>
                        <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-zinc-200">{EXAMPLE}</pre>
                    </div>
                </Card>
            </div>

            {preview ? (
                <Card className="mt-6" padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-4">
                        <h2 className="mr-2 text-sm font-semibold text-zinc-900">Resultaat controle</h2>
                        {Object.entries(PREVIEW_META).map(([key, meta]) =>
                            preview.summary?.[key] ? <Badge key={key} tone={meta.tone}>{meta.label}: {preview.summary[key]}</Badge> : null
                        )}
                    </div>
                    <div className={tableClasses.wrapper}>
                        <table className={tableClasses.table}>
                            <thead className={tableClasses.thead}>
                                <tr>
                                    <th className={tableClasses.th}>Rij</th>
                                    <th className={tableClasses.th}>Geplakt</th>
                                    <th className={tableClasses.th}>Status</th>
                                    <th className={tableClasses.th}>Klant</th>
                                    <th className={tableClasses.th}>Bestaand</th>
                                    <th className={tableClasses.th}>Bedrag</th>
                                    <th className={tableClasses.th}>Toelichting</th>
                                </tr>
                            </thead>
                            <tbody className={tableClasses.tbody}>
                                {preview.results.map((r) => {
                                    const meta = PREVIEW_META[r.status] ?? PREVIEW_META.fout;
                                    const ch = choices[r.rij] ?? { customer_id: '', replace: false };
                                    const ci = ch.customer_id ? info[ch.customer_id] : null;
                                    const differs = ci && r.bedrag !== null && Math.abs(ci.crm_bedrag - r.bedrag) > 0.01;
                                    return (
                                        <tr key={r.rij} className={cx(tableClasses.tr, 'align-top')}>
                                            <td className={tableClasses.td}>{r.rij}</td>
                                            <td className={tableClasses.td}>
                                                <div className="font-medium text-zinc-900">{r.klantnaam || <span className="text-zinc-400">(leeg)</span>}</div>
                                                <div className="font-mono text-xs text-zinc-500">{r.iban}</div>
                                                <div className="text-xs text-zinc-500">Kenmerk: {r.kenmerk || '-'}</div>
                                                <div className="text-xs text-zinc-500">Datum: {formatDate(r.machtigingsdatum) || '-'}</div>
                                            </td>
                                            <td className={tableClasses.td}>
                                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                                {r.status === 'match' && !r.zeker ? <div className="mt-1"><Badge tone="warning">Onzeker</Badge></div> : null}
                                            </td>
                                            <td className={tableClasses.td}>
                                                {r.status === 'fout' ? (
                                                    <span className="text-sm text-zinc-500">Niet te importeren</span>
                                                ) : (
                                                    <>
                                                        <CustomerPicker
                                                            row={r}
                                                            value={ch.customer_id}
                                                            onChange={(v) => setChoice(r.rij, { customer_id: v, replace: false })}
                                                            customers={customers}
                                                            byId={byId}
                                                        />
                                                        {ci?.actief_mandaat ? (
                                                            <select
                                                                className="input mt-1.5 py-1.5 text-sm"
                                                                value={ch.replace ? 'vervangen' : 'overslaan'}
                                                                onChange={(e) => setChoice(r.rij, { replace: e.target.value === 'vervangen' })}
                                                                aria-label={`Actief mandaat rij ${r.rij}`}
                                                            >
                                                                <option value="overslaan">Actief mandaat: overslaan</option>
                                                                <option value="vervangen">Actief mandaat: vervangen</option>
                                                            </select>
                                                        ) : null}
                                                    </>
                                                )}
                                            </td>
                                            <td className={tableClasses.td}>
                                                {ci ? (
                                                    <div className="space-y-1 text-xs">
                                                        <div>{ci.actief_mandaat ? <Badge tone="warning">Actief mandaat</Badge> : <Badge>Geen actief mandaat</Badge>}</div>
                                                        <div className="text-zinc-500">Kenmerk: {ci.kenmerk || '-'}</div>
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className={cx(tableClasses.td, 'whitespace-nowrap text-sm')}>
                                                <div className={cx(differs && 'font-semibold text-rose-700')}>
                                                    Geplakt: {r.bedrag !== null ? euro(r.bedrag) : (r.bedrag_raw || '-')}
                                                </div>
                                                {ci ? <div className="text-zinc-500">CRM: {euro(ci.crm_bedrag)}</div> : null}
                                                {differs ? <div className="text-xs text-rose-700">Wijkt af</div> : null}
                                                {r.omschrijving ? <div className="mt-1 max-w-[14rem] whitespace-normal text-xs text-zinc-500">{r.omschrijving}</div> : null}
                                            </td>
                                            <td className={tableClasses.td}>
                                                {r.messages?.length || r.warnings?.length ? (
                                                    <ul className="space-y-0.5 text-sm">
                                                        {r.messages.map((m, i) => <li key={`e${i}`} className="text-rose-700">{m}</li>)}
                                                        {r.warnings.map((m, i) => <li key={`w${i}`} className="text-amber-700">{m}</li>)}
                                                    </ul>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : null}

            {result ? (
                <Card className="mt-6" padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-4">
                        <h2 className="mr-2 text-sm font-semibold text-zinc-900">Resultaat import</h2>
                        {Object.entries(RESULT_META).map(([key, meta]) =>
                            result.summary?.[key] ? <Badge key={key} tone={meta.tone}>{meta.label}: {result.summary[key]}</Badge> : null
                        )}
                    </div>
                    <div className={tableClasses.wrapper}>
                        <table className={tableClasses.table}>
                            <thead className={tableClasses.thead}>
                                <tr>
                                    <th className={tableClasses.th}>Rij</th>
                                    <th className={tableClasses.th}>Klantnaam</th>
                                    <th className={tableClasses.th}>IBAN</th>
                                    <th className={tableClasses.th}>Klant</th>
                                    <th className={tableClasses.th}>Resultaat</th>
                                    <th className={tableClasses.th}>Toelichting</th>
                                </tr>
                            </thead>
                            <tbody className={tableClasses.tbody}>
                                {result.results.map((r) => {
                                    const meta = RESULT_META[r.status] ?? RESULT_META.fout;
                                    return (
                                        <tr key={r.rij} className={tableClasses.tr}>
                                            <td className={tableClasses.td}>{r.rij}</td>
                                            <td className={tableClasses.td}>{r.klantnaam}</td>
                                            <td className={cx(tableClasses.td, 'font-mono text-xs')}>{r.iban}</td>
                                            <td className={tableClasses.td}>
                                                {r.klant ? (
                                                    <a href={r.klant.url} className="font-medium text-indigo-700 hover:underline" target="_blank" rel="noreferrer">
                                                        {r.klant.naam}
                                                    </a>
                                                ) : '-'}
                                            </td>
                                            <td className={tableClasses.td}><Badge tone={meta.tone}>{meta.label}</Badge></td>
                                            <td className={tableClasses.td}>
                                                <ul className="space-y-0.5 text-sm">
                                                    {r.messages.map((m, i) => <li key={i}>{m}</li>)}
                                                </ul>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : null}
        </>
    );
}
