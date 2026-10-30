import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { FOCUS_SCOPE } from '../../../components/StatusBadge';
import { Button, Card, CardHeader, EmptyState, PageHeader, Stat, buttonClasses, cx, inputClasses, tableClasses } from '../../../components/ui';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function numberValue(value) {
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function toLocalDateInput(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
}

const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

function addDaysToDateInput(value, days) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    const amount = Number(days);
    if (!match || !Number.isFinite(amount) || amount < 1) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setDate(date.getDate() + amount);
    return date;
}

function formatDateNl(date) {
    if (!date) return '';
    try {
        return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return toLocalDateInput(date);
    }
}

function DuplicateWarning({ matches }) {
    if (!Array.isArray(matches) || matches.length === 0) return null;
    return (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Mogelijk bestaat deze klant al</p>
            <ul className="mt-2 space-y-1">
                {matches.map((match) => (
                    <li key={match.id}>
                        <a href={match.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 hover:text-amber-950">
                            {match.bedrijfsnaam}
                            <span className="sr-only"> (opent in nieuw tabblad)</span>
                        </a>
                        {match.plaats ? ` (${match.plaats})` : ''}
                        {': '}
                        {match.status_label}
                        {match.in_prullenbak ? ', in prullenbak' : ''}
                        {Array.isArray(match.redenen) && match.redenen.length > 0 ? `. Zelfde ${match.redenen.join(', ')}.` : ''}
                    </li>
                ))}
            </ul>
            <div className="mt-2 text-xs text-amber-800">Je kunt de klant toch opslaan als dit een andere klant is.</div>
        </div>
    );
}

function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(length);
    const result = [];
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i += 1) {
            result.push(chars[values[i] % chars.length]);
        }
    } else {
        for (let i = 0; i < length; i += 1) {
            result.push(chars[Math.floor(Math.random() * chars.length)]);
        }
    }
    return result.join('');
}

// Formulierveld met label, verplicht-markering, hint en foutmelding gekoppeld aan het invoerveld.
function TextField({ name, label, value, onChange, error, required = false, hint, className = '', type = 'text', inputProps = {} }) {
    const id = `gc-${name}`;
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
        <div className={cx('min-w-0', className)}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-800">
                {label}
                {required ? <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span> : null}
                {required ? <span className="sr-only"> (verplicht)</span> : null}
            </label>
            <input
                id={id}
                name={name}
                type={type}
                className={cx(inputClasses, error && 'border-rose-400 focus:border-rose-600 focus:ring-rose-600')}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={describedBy}
                {...inputProps}
            />
            {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
            {error ? <p id={`${id}-error`} className="mt-1 text-xs font-medium text-rose-700">{error}</p> : null}
        </div>
    );
}

function Section({ title, description, children, aside }) {
    return (
        <Card>
            <CardHeader title={title} description={description} actions={aside} />
            {children}
        </Card>
    );
}

const fieldError = (errors, name) => (errors && errors[name]) || null;

export default function Create({ statusOptions: rawStatusOptions, statusLabels, sourceOptions: rawSourceOptions, moduleRows, defaults: rawDefaults, urls: rawUrls }) {
    const statusOptions = Array.isArray(rawStatusOptions) ? rawStatusOptions : [];
    const sourceOptions = Array.isArray(rawSourceOptions) ? rawSourceOptions : [];
    const defaults = rawDefaults && typeof rawDefaults === 'object' ? rawDefaults : {};
    const urls = rawUrls && typeof rawUrls === 'object' ? rawUrls : { index: '/garagebedrijven', store: '/garagebedrijven' };
    const defaultDemoDays = Number(defaults.demo_duur_dagen) > 0 ? Number(defaults.demo_duur_dagen) : 14;
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, transform } = useForm({
        bedrijfsnaam: '',
        kvk_nummer: '',
        land: defaults.land || 'Nederland',
        voor_en_achternaam: '',
        email: '',
        telefoonnummer: '',
        straatnaam_en_nummer: '',
        postcode: '',
        plaats: '',
        iban: '',
        bic: '',
        plaats_van_tekenen: '',
        datum_van_tekenen: defaults.datum_van_tekenen || '',
        status: statusOptions[0] || 'demo_aangevraagd',
        bron: sourceOptions[0] || 'website_formulier',
        tags: '',
        proefperiode_start: defaults.proefperiode_start || toLocalDateInput(new Date()),
        demo_duur_dagen: defaultDemoDays,
        actief_vanaf: '',
        opgezegd_op: '',
        opzegreden: '',
        login_email: '',
        login_password: '',
        moduleRows: Array.isArray(moduleRows) ? moduleRows : [],
    });

    const totals = useMemo(() => {
        let totaalExcl = 0;
        let btw = 0;
        let actieveModules = 0;

        data.moduleRows.forEach((row) => {
            if (!row.actief) return;
            const prijs = numberValue(row.prijs_maand_excl);
            const aantal = Math.max(1, Number(row.aantal || 1));
            totaalExcl += prijs * aantal;
            btw += prijs * aantal * (numberValue(row.btw_percentage) / 100);
            actieveModules += 1;
        });

        return {
            totaleModules: data.moduleRows.length,
            actieveModules,
            totaalExcl,
            btw,
            totaalIncl: totaalExcl + btw,
        };
    }, [data.moduleRows]);

    const updateModuleRow = (index, key, value) => {
        setData(
            'moduleRows',
            data.moduleRows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
        );
    };

    const toggleModule = (index) => {
        setData(
            'moduleRows',
            data.moduleRows.map((row, i) => {
                if (i !== index) return row;
                const actief = !row.actief;
                return {
                    ...row,
                    actief,
                    aantal: actief && Number(row.aantal || 0) < 1 ? 1 : row.aantal,
                };
            })
        );
    };

    // Bij een demo-aanvraag zijn alleen bedrijfsnaam, naam en e-mail verplicht.
    const isLead = data.status === 'demo_aangevraagd' || data.status === 'lead';
    const isDemo = data.status === 'proefperiode';
    const showActiefVanaf = data.status === 'actief' || data.status === 'opgezegd';
    const isOpgezegd = data.status === 'opgezegd';
    const required = !isLead;
    const hasIban = data.iban.trim() !== '';
    const demoEnd = isDemo ? addDaysToDateInput(data.proefperiode_start, data.demo_duur_dagen) : null;

    const formRef = useRef(null);
    const submit = (event) => {
        event.preventDefault();
        // Verborgen velden niet meesturen, zodat ze niet onbedoeld worden opgeslagen.
        transform((values) => ({
            ...values,
            proefperiode_start: isDemo ? values.proefperiode_start : '',
            demo_duur_dagen: isDemo ? values.demo_duur_dagen : '',
            actief_vanaf: showActiefVanaf ? values.actief_vanaf : '',
        }));
        // Bij validatiefouten blijven staan en naar het eerste foute veld gaan; na aanmaken bovenaan het klantdossier beginnen.
        post(urls.store, {
            preserveScroll: (page) => Object.keys(page?.props?.errors || {}).length > 0,
            onSuccess: () => window.scrollTo({ top: 0 }),
            onError: () => {
                window.requestAnimationFrame(() => {
                    const first = formRef.current?.querySelector('[aria-invalid="true"]');
                    if (first) {
                        first.focus({ preventScroll: true });
                        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }
                });
            },
        });
    };

    const errorCount = Object.keys(errors || {}).length;

    // Dubbele klanten controleren tijdens het typen (niet blokkerend).
    const [duplicates, setDuplicates] = useState([]);
    useEffect(() => {
        if (!urls.duplicates) return undefined;
        const email = data.email.trim();
        const kvk = data.kvk_nummer.trim();
        const naam = data.bedrijfsnaam.trim();
        if (!email && kvk.length < 6 && naam.length < 3) {
            setDuplicates([]);
            return undefined;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const query = new URLSearchParams({ email, kvk, naam });
                const response = await fetch(`${urls.duplicates}?${query.toString()}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });
                if (!response.ok) return;
                const json = await response.json();
                if (!controller.signal.aborted) setDuplicates(Array.isArray(json?.matches) ? json.matches : []);
            } catch {
                // Netwerkfout of afgebroken verzoek: geen waarschuwing tonen.
            }
        }, 400);
        // Oude verzoeken afbreken, zodat een trage reactie geen verouderde waarschuwing toont.
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [data.email, data.kvk_nummer, data.bedrijfsnaam, urls.duplicates]);

    const handleStatusChange = (value) => {
        setData((prev) => ({
            ...prev,
            status: value,
            // Opzeg-velden zijn alleen zichtbaar bij status opgezegd; voorkom dat verborgen waarden worden opgeslagen.
            ...(value === 'opgezegd' ? {} : { opgezegd_op: '', opzegreden: '' }),
            ...(value === 'proefperiode' && !prev.demo_duur_dagen ? { demo_duur_dagen: defaultDemoDays } : {}),
        }));
    };

    const field = (name) => ({
        name,
        value: data[name],
        onChange: (value) => setData(name, value),
        error: fieldError(errors, name),
    });

    const selectClass = (name) => cx(inputClasses, fieldError(errors, name) && 'border-rose-400');

    return (
        <div className={cx('mx-auto max-w-4xl', FOCUS_SCOPE)}>
            <Head title="Nieuwe klant" />

            <PageHeader
                title="Nieuwe klant"
                description="Leg een garagebedrijf vast. Kies eerst de status: die bepaalt welke velden verplicht zijn."
                actions={
                    <Link href={urls.index} className={buttonClasses({ variant: 'secondary' })}>
                        Terug naar klanten
                    </Link>
                }
            />

            <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
                {errorCount > 0 && !processing && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <span className="font-semibold">De klant is nog niet opgeslagen.</span>{' '}
                        {errorCount === 1 ? 'Er is 1 veld dat aandacht nodig heeft.' : `Er zijn ${errorCount} velden die aandacht nodig hebben.`}
                    </div>
                )}

                <div aria-live="polite">
                    <DuplicateWarning matches={duplicates} />
                </div>

                <Section title="Status en bron" description="Hoe staat deze klant ervoor en hoe is hij binnengekomen?">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-status">Status</label>
                            <select
                                id="gc-status"
                                className={selectClass('status')}
                                value={data.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                aria-invalid={errors.status ? 'true' : undefined}
                                aria-describedby="gc-status-hint"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {statusLabels?.[status] || status}
                                    </option>
                                ))}
                            </select>
                            {errors.status ? (
                                <p className="mt-1 text-xs font-medium text-rose-700">{errors.status}</p>
                            ) : (
                                <p id="gc-status-hint" className="mt-1 text-xs text-zinc-500">
                                    {isLead
                                        ? 'Alleen bedrijfsnaam, naam en e-mail zijn verplicht. De rest kun je later aanvullen.'
                                        : 'Bedrijfs-, contact- en adresgegevens zijn verplicht.'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-bron">Bron</label>
                            <select
                                id="gc-bron"
                                className={selectClass('bron')}
                                value={data.bron}
                                onChange={(e) => setData('bron', e.target.value)}
                                aria-invalid={errors.bron ? 'true' : undefined}
                            >
                                {sourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {SOURCE_LABELS[source] || source}
                                    </option>
                                ))}
                            </select>
                            {errors.bron && <p className="mt-1 text-xs font-medium text-rose-700">{errors.bron}</p>}
                        </div>

                        {isDemo && (
                            <>
                                <TextField {...field('proefperiode_start')} label="Demo start" type="date" />
                                <TextField
                                    {...field('demo_duur_dagen')}
                                    label="Demo duur (dagen)"
                                    type="number"
                                    hint={demoEnd ? `Demo eindigt op ${formatDateNl(demoEnd)}.` : 'Vul een startdatum en duur in.'}
                                    inputProps={{ min: 1, max: 365, inputMode: 'numeric' }}
                                />
                            </>
                        )}
                        {showActiefVanaf && <TextField {...field('actief_vanaf')} label="Actief vanaf" type="date" />}
                        {isOpgezegd && (
                            <>
                                <TextField {...field('opgezegd_op')} label="Opgezegd op" type="date" required />
                                <TextField {...field('opzegreden')} label="Opzegreden" required className="sm:col-span-2" inputProps={{ maxLength: 255 }} />
                            </>
                        )}
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-tags">Tags</label>
                            <input
                                id="gc-tags"
                                className={cx(inputClasses, errors.tags && 'border-rose-400')}
                                value={data.tags}
                                onChange={(e) => setData('tags', e.target.value)}
                                placeholder="bijv. premium, bosch"
                                aria-invalid={errors.tags ? 'true' : undefined}
                                aria-describedby="gc-tags-hint"
                            />
                            {errors.tags ? (
                                <p className="mt-1 text-xs font-medium text-rose-700">{errors.tags}</p>
                            ) : (
                                <p id="gc-tags-hint" className="mt-1 text-xs text-zinc-500">Meerdere tags scheiden met een komma.</p>
                            )}
                        </div>
                    </div>
                </Section>

                <Section title="Bedrijf">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField {...field('bedrijfsnaam')} label="Bedrijfsnaam" required className="sm:col-span-2" inputProps={{ autoComplete: 'organization', maxLength: 255 }} />
                        <TextField {...field('kvk_nummer')} label="KVK nummer" inputProps={{ inputMode: 'numeric', maxLength: 50 }} />
                        <TextField {...field('land')} label="Land" required={required} inputProps={{ autoComplete: 'country-name' }} />
                    </div>
                </Section>

                <Section title="Contactpersoon" description="Wordt de primaire contactpersoon (eigenaar) van het bedrijf.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                            {...field('voor_en_achternaam')}
                            label="Volledige naam"
                            required
                            className="sm:col-span-2"
                            hint={isLead ? undefined : 'Voor- en achternaam, gescheiden door een spatie.'}
                            inputProps={{ autoComplete: 'name' }}
                        />
                        <TextField {...field('email')} label="E-mail" type="email" required inputProps={{ autoComplete: 'email' }} />
                        <TextField {...field('telefoonnummer')} label="Telefoon" type="tel" required={required} inputProps={{ autoComplete: 'tel' }} />
                    </div>
                </Section>

                <Section title="Adres" description={isLead ? 'Optioneel bij een demo-aanvraag, tenzij je een IBAN invult.' : undefined}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <TextField {...field('straatnaam_en_nummer')} label="Straat en huisnummer" required={required || hasIban} className="sm:col-span-3" inputProps={{ autoComplete: 'street-address' }} />
                        <TextField {...field('postcode')} label="Postcode" required={required || hasIban} inputProps={{ autoComplete: 'postal-code', maxLength: 20 }} />
                        <TextField {...field('plaats')} label="Plaats" required={required || hasIban} className="sm:col-span-2" inputProps={{ autoComplete: 'address-level2' }} />
                    </div>
                </Section>

                <Section title="Incasso (SEPA)" description="Optioneel. Met een IBAN wordt een SEPA mandaat met status pending vastgelegd.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                            {...field('iban')}
                            label="IBAN"
                            hint="Spaties mogen, bijvoorbeeld NL91 ABNA 0417 1643 00."
                            inputProps={{ autoComplete: 'off', spellCheck: false, maxLength: 42 }}
                        />
                        <TextField {...field('bic')} label="BIC" inputProps={{ autoComplete: 'off', spellCheck: false, maxLength: 14 }} />
                        <TextField {...field('plaats_van_tekenen')} label="Plaats van tekenen" required={hasIban} inputProps={{ autoComplete: 'off' }} />
                        <TextField {...field('datum_van_tekenen')} label="Datum van tekenen" type="date" required={hasIban} />
                    </div>
                </Section>

                <Section title="Login voor Kivii" description="Optioneel. Met alleen een login e-mail krijgt de klant een activatielink; een wachtwoord is niet nodig.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField {...field('login_email')} label="Login e-mail" type="email" inputProps={{ autoComplete: 'off' }} />
                        <div className="min-w-0">
                            <label className="mb-1 block text-sm font-medium text-zinc-800" htmlFor="gc-login_password">Wachtwoord</label>
                            <div className="flex gap-2">
                                <input
                                    id="gc-login_password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    className={cx(inputClasses, errors.login_password && 'border-rose-400')}
                                    value={data.login_password}
                                    onChange={(e) => setData('login_password', e.target.value)}
                                    aria-invalid={errors.login_password ? 'true' : undefined}
                                    aria-describedby="gc-login_password-hint"
                                />
                                <Button variant="secondary" aria-pressed={showPassword} aria-controls="gc-login_password" onClick={() => setShowPassword((prev) => !prev)}>
                                    {showPassword ? 'Verberg' : 'Toon'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setData('login_password', generatePassword());
                                        setShowPassword(true);
                                    }}
                                >
                                    Genereer
                                </Button>
                            </div>
                            {errors.login_password ? (
                                <p className="mt-1 text-xs font-medium text-rose-700">{errors.login_password}</p>
                            ) : (
                                <p id="gc-login_password-hint" className="mt-1 text-xs text-zinc-500">Minimaal 8 tekens. Leeg laten mag.</p>
                            )}
                        </div>
                    </div>
                </Section>

                <Section
                    title="Modules en prijzen"
                    description={`Prijsafspraken per maand. ${totals.actieveModules} van ${totals.totaleModules} modules actief. Een actieve module heeft minimaal aantal 1; prijs 0 mag.`}
                >
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Stat label="Totaal excl. btw" value={formatEuro(totals.totaalExcl)} tone="brand" />
                        <Stat label="Btw" value={formatEuro(totals.btw)} />
                        <Stat label="Totaal incl. btw" value={formatEuro(totals.totaalIncl)} />
                    </div>

                    {data.moduleRows.length === 0 ? (
                        <EmptyState title="Nog geen modules" description="Er zijn nog geen modules beschikbaar. Je kunt de klant wel opslaan en later modules toevoegen." />
                    ) : (
                        <div className={tableClasses.wrapper}>
                            <table className={tableClasses.table}>
                                <caption className="sr-only">Modules en prijzen per maand</caption>
                                <thead className={tableClasses.thead}>
                                    <tr>
                                        <th scope="col" className={tableClasses.th}>Actief</th>
                                        <th scope="col" className={tableClasses.th}>Module</th>
                                        <th scope="col" className={tableClasses.th}>Aantal</th>
                                        <th scope="col" className={tableClasses.th}>Prijs p/m excl.</th>
                                        <th scope="col" className={tableClasses.th}>Btw %</th>
                                    </tr>
                                </thead>
                                <tbody className={tableClasses.tbody}>
                                    {data.moduleRows.map((row, index) => {
                                        const err = (key) => errors[`moduleRows.${index}.${key}`];
                                        return (
                                            <tr key={row.module_id ?? index} className={cx(tableClasses.tr, row.actief && 'bg-indigo-50/40')}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        id={`gc-module-${index}-actief`}
                                                        type="checkbox"
                                                        className="h-5 w-5 rounded border-zinc-300 text-indigo-600"
                                                        checked={!!row.actief}
                                                        onChange={() => toggleModule(index)}
                                                    />
                                                </td>
                                                <td className={cx(tableClasses.td, 'font-semibold text-zinc-900')}>
                                                    <label htmlFor={`gc-module-${index}-actief`} className="cursor-pointer">{row.naam}</label>
                                                </td>
                                                {[
                                                    { key: 'aantal', label: `Aantal ${row.naam}`, width: 'w-20', props: { min: 0, max: 999, inputMode: 'numeric' } },
                                                    { key: 'prijs_maand_excl', label: `Prijs per maand excl. btw ${row.naam}`, width: 'w-32', props: { min: 0, step: '0.01', inputMode: 'decimal' } },
                                                    { key: 'btw_percentage', label: `Btw percentage ${row.naam}`, width: 'w-20', props: { min: 0, max: 100, step: '0.01', inputMode: 'decimal' } },
                                                ].map((col) => (
                                                    <td key={col.key} className="px-4 py-3 align-top">
                                                        <input
                                                            type="number"
                                                            className={cx(inputClasses, col.width, 'tabular-nums', err(col.key) && 'border-rose-400')}
                                                            value={row[col.key] ?? ''}
                                                            onChange={(e) => updateModuleRow(index, col.key, e.target.value)}
                                                            aria-label={col.label}
                                                            aria-invalid={err(col.key) ? 'true' : undefined}
                                                            {...col.props}
                                                        />
                                                        {err(col.key) && <p className="mt-1 max-w-[12rem] text-xs font-medium text-rose-700">{err(col.key)}</p>}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                <div className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200 bg-white/95 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="text-sm text-zinc-600">
                            <span className="font-semibold tabular-nums text-zinc-900">{formatEuro(totals.totaalExcl)}</span> per maand excl. btw
                        </div>
                        <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                            <Link href={urls.index} className={buttonClasses({ variant: 'ghost', size: 'lg' })}>
                                Annuleren
                            </Link>
                            <Button type="submit" size="lg" loading={processing}>
                                {processing ? 'Opslaan...' : 'Klant opslaan'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
