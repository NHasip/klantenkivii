import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useConfirm } from '../../../components/ConfirmProvider';
import { Badge, Button, Card, CardHeader, Field, PageHeader, cx, tableClasses } from '../../../components/ui';

const EXAMPLE = `[
  {
    "bedrijfsnaam": "Voorbeeld Garage B.V.",
    "status": "actief",
    "contact_voornaam": "Jan",
    "contact_achternaam": "Jansen",
    "email": "info@voorbeeldgarage.nl",
    "telefoon": "0612345678",
    "adres": "Voorbeeldstraat 1",
    "postcode": "1234 AB",
    "plaats": "Almere",
    "kvk": "12345678",
    "btw": "NL123456789B01",
    "startdatum": "2025-01-01",
    "notitie": "Klant sinds 2025",
    "bron": "import"
  }
]`;

const STATUS_META = {
    nieuw: { label: 'Nieuw', tone: 'brand' },
    geimporteerd: { label: 'Geimporteerd', tone: 'success' },
    overgeslagen: { label: 'Overgeslagen', tone: 'warning' },
    fout: { label: 'Fout', tone: 'danger' },
};

function errorMessage(error) {
    const data = error?.response?.data;
    if (data?.errors?.json?.[0]) return data.errors.json[0];
    if (data?.message) return data.message;
    return 'Er ging iets mis. Probeer het opnieuw.';
}

export default function Index({ maxRows = 200, fields = [], urls }) {
    const confirm = useConfirm();
    const [text, setText] = useState('');
    const [checkedText, setCheckedText] = useState(null);
    const [results, setResults] = useState(null);
    const [summary, setSummary] = useState(null);
    const [mode, setMode] = useState(null);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);

    const newCount = mode === 'preview' ? summary?.nieuw ?? 0 : 0;
    const canImport = checkedText !== null && checkedText === text && newCount > 0 && !busy;

    const run = async (kind) => {
        setBusy(kind);
        setError(null);
        try {
            const { data } = await axios.post(kind === 'preview' ? urls.preview : urls.store, { json: text });
            setResults(data.results);
            setSummary(data.summary);
            setMode(kind);
            setCheckedText(kind === 'preview' ? text : null);
        } catch (e) {
            setError(errorMessage(e));
            setCheckedText(null);
        } finally {
            setBusy(null);
        }
    };

    const onImport = async () => {
        const ok = await confirm({
            title: 'Klanten importeren?',
            message: `Er ${newCount === 1 ? 'wordt 1 nieuwe klant' : `worden ${newCount} nieuwe klanten`} aangemaakt. Bestaande klanten worden niet gewijzigd en er worden geen e-mails verstuurd.`,
            confirmText: 'Importeren',
            cancelText: 'Annuleren',
        });
        if (ok) run('store');
    };

    return (
        <>
            <Head title="Importeren" />
            <PageHeader
                title="Klanten importeren"
                description={`Plak een JSON-lijst met klanten (maximaal ${maxRows} rijen). Controleer eerst, daarna kun je importeren.`}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <Field
                        id="import-json"
                        label="JSON"
                        hint="Een array van objecten. Na een wijziging moet je opnieuw controleren."
                        error={error}
                    >
                        <textarea
                            id="import-json"
                            className={cx('input font-mono text-xs', 'min-h-[18rem]')}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            placeholder='[ { "bedrijfsnaam": "...", "status": "actief" } ]'
                            aria-describedby={error ? 'import-json-error' : 'import-json-hint'}
                        />
                    </Field>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" icon="check" loading={busy === 'preview'} disabled={!text.trim() || !!busy} onClick={() => run('preview')}>
                            Controleren
                        </Button>
                        <Button icon="upload" loading={busy === 'store'} disabled={!canImport} onClick={onImport}>
                            Importeren
                        </Button>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Hulp" icon="info" />
                    <div className="space-y-3 text-sm text-zinc-600">
                        <p>
                            Verplicht: <code>bedrijfsnaam</code> en <code>status</code> (actief, gepauzeerd, proefperiode, demo_aangevraagd, opgezegd of verloren).
                            De rest is optioneel.
                        </p>
                        <p>Velden: {fields.map((f, i) => <React.Fragment key={f}>{i > 0 ? ', ' : ''}<code>{f}</code></React.Fragment>)}.</p>
                        <p>
                            Dubbelen (zelfde bedrijfsnaam, e-mail of KVK, ook in de prullenbak) worden overgeslagen en nooit bijgewerkt.
                            Er worden geen modules, mandaten, logins of e-mails aangemaakt.
                        </p>
                        <p className="font-medium text-zinc-700">Voorbeeld</p>
                        <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 ring-1 ring-zinc-200">{EXAMPLE}</pre>
                    </div>
                </Card>
            </div>

            {results ? (
                <Card className="mt-6" padded={false}>
                    <div className="flex flex-wrap items-center gap-2 p-4">
                        <h2 className="mr-2 text-sm font-semibold text-zinc-900">{mode === 'store' ? 'Resultaat import' : 'Resultaat controle'}</h2>
                        {Object.entries(STATUS_META).map(([key, meta]) =>
                            summary?.[key] ? <Badge key={key} tone={meta.tone}>{meta.label}: {summary[key]}</Badge> : null
                        )}
                    </div>
                    <div className={tableClasses.wrapper}>
                        <table className={tableClasses.table}>
                            <thead className={tableClasses.thead}>
                                <tr>
                                    <th className={tableClasses.th}>Rij</th>
                                    <th className={tableClasses.th}>Bedrijfsnaam</th>
                                    <th className={tableClasses.th}>Resultaat</th>
                                    <th className={tableClasses.th}>Toelichting</th>
                                </tr>
                            </thead>
                            <tbody className={tableClasses.tbody}>
                                {results.map((r) => {
                                    const meta = STATUS_META[r.status] ?? STATUS_META.fout;
                                    return (
                                        <tr key={r.rij} className={tableClasses.tr}>
                                            <td className={tableClasses.td}>{r.rij}</td>
                                            <td className={tableClasses.td}>{r.bedrijfsnaam || <span className="text-zinc-400">(leeg)</span>}</td>
                                            <td className={tableClasses.td}><Badge tone={meta.tone}>{meta.label}</Badge></td>
                                            <td className={tableClasses.td}>
                                                {r.messages?.length ? (
                                                    <ul className="space-y-0.5">
                                                        {r.messages.map((m, i) => <li key={i}>{m}</li>)}
                                                    </ul>
                                                ) : null}
                                                {r.link ? (
                                                    <a href={r.link.url} className="font-medium text-indigo-700 hover:underline" target="_blank" rel="noreferrer">
                                                        {r.link.label}
                                                    </a>
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
        </>
    );
}
