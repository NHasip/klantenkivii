import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { FOCUS_SCOPE } from '../../../components/StatusBadge';

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
            <div className="font-semibold">Mogelijk bestaat deze klant al</div>
            <ul className="mt-2 space-y-1">
                {matches.map((match) => (
                    <li key={match.id}>
                        <a href={match.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 hover:text-amber-950">
                            {match.bedrijfsnaam}
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

export default function Create({ statusOptions: rawStatusOptions, statusLabels, sourceOptions: rawSourceOptions, moduleRows, defaults: rawDefaults, urls }) {
    const statusOptions = Array.isArray(rawStatusOptions) ? rawStatusOptions : [];
    const sourceOptions = Array.isArray(rawSourceOptions) ? rawSourceOptions : [];
    const defaults = rawDefaults && typeof rawDefaults === 'object' ? rawDefaults : {};
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
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
        status: statusOptions?.[0] || 'demo_aangevraagd',
        bron: sourceOptions?.[0] || 'website_formulier',
        tags: '',
        proefperiode_start: defaults.proefperiode_start || toLocalDateInput(new Date()),
        demo_duur_dagen: defaults.demo_duur_dagen || 14,
        actief_vanaf: '',
        opgezegd_op: '',
        opzegreden: '',
        login_email: '',
        login_password: '',
        moduleRows: moduleRows || [],
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
            data.moduleRows.map((row, i) =>
                i === index
                    ? {
                          ...row,
                          [key]: value,
                      }
                    : row
            )
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

    const submit = (event) => {
        event.preventDefault();
        // Bij validatiefouten blijven staan; na aanmaken bovenaan het klantdossier beginnen.
        post(urls.store, {
            preserveScroll: (page) => Object.keys(page?.props?.errors || {}).length > 0,
            onSuccess: () => window.scrollTo({ top: 0 }),
        });
    };

    const hasErrors = Object.keys(errors || {}).length > 0;
    // Bij een demo-aanvraag zijn alleen bedrijfsnaam, naam en e-mail verplicht.
    const isLead = data.status === 'demo_aangevraagd' || data.status === 'lead';
    const isDemo = data.status === 'proefperiode';
    const req = isLead ? '' : ' *';
    const demoEnd = isDemo ? addDaysToDateInput(data.proefperiode_start, data.demo_duur_dagen) : null;

    // Dubbele klanten controleren tijdens het typen (niet blokkerend).
    const [duplicates, setDuplicates] = useState([]);
    const duplicateAbort = useRef(null);
    useEffect(() => {
        if (!urls?.duplicates) return undefined;
        const email = data.email.trim();
        const kvk = data.kvk_nummer.trim();
        const naam = data.bedrijfsnaam.trim();
        if (!email && kvk.length < 6 && naam.length < 3) {
            setDuplicates([]);
            return undefined;
        }
        const timer = window.setTimeout(async () => {
            if (duplicateAbort.current) duplicateAbort.current.abort();
            const controller = new AbortController();
            duplicateAbort.current = controller;
            try {
                const query = new URLSearchParams({ email, kvk, naam });
                const response = await fetch(`${urls.duplicates}?${query.toString()}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });
                if (!response.ok) return;
                const json = await response.json();
                setDuplicates(Array.isArray(json?.matches) ? json.matches : []);
            } catch {
                // Netwerkfout of afgebroken verzoek: geen waarschuwing tonen.
            }
        }, 400);
        return () => window.clearTimeout(timer);
    }, [data.email, data.kvk_nummer, data.bedrijfsnaam, urls?.duplicates]);

    const handleStatusChange = (value) => {
        setData((prev) => ({
            ...prev,
            status: value,
            // Opzeg-velden zijn alleen zichtbaar bij status opgezegd; voorkom dat verborgen waarden worden opgeslagen.
            ...(value === 'opgezegd' ? {} : { opgezegd_op: '', opzegreden: '' }),
        }));
    };

    return (
        <div className={`space-y-6 ${FOCUS_SCOPE}`}>
            <Head title="Nieuwe klant" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">Nieuwe klant</h1>
                    <p className="mt-1 text-sm text-zinc-500">Maak een garagebedrijf aan met modules en incasso.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={urls.index}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                        Terug
                    </Link>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div aria-live="polite">
                    <DuplicateWarning matches={duplicates} />
                </div>
                {isLead && (
                    <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
                        Status Demo aangevraagd: alleen bedrijfsnaam, naam en e-mail zijn verplicht. Telefoon en adres kun je later aanvullen.
                    </div>
                )}
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Bedrijf</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-bedrijfsnaam">Bedrijfsnaam *</label>
                            <input
                                id="gc-bedrijfsnaam"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bedrijfsnaam}
                                onChange={(e) => setData('bedrijfsnaam', e.target.value)}
                            />
                            {errors.bedrijfsnaam && <div className="mt-1 text-xs text-rose-600">{errors.bedrijfsnaam}</div>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-kvk-nummer">KVK nummer</label>
                            <input
                                id="gc-kvk-nummer"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.kvk_nummer}
                                onChange={(e) => setData('kvk_nummer', e.target.value)}
                            />
                            {errors.kvk_nummer && <div className="mt-1 text-xs text-rose-600">{errors.kvk_nummer}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-land">Land{req}</label>
                            <input
                                id="gc-land"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.land}
                                onChange={(e) => setData('land', e.target.value)}
                            />
                            {errors.land && <div className="mt-1 text-xs text-rose-600">{errors.land}</div>}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Contactpersoon</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-voor-en-achternaam">Volledige naam *</label>
                            <input
                                id="gc-voor-en-achternaam"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.voor_en_achternaam}
                                onChange={(e) => setData('voor_en_achternaam', e.target.value)}
                            />
                            {errors.voor_en_achternaam && (
                                <div className="mt-1 text-xs text-rose-600">{errors.voor_en_achternaam}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-email">E-mail *</label>
                            <input
                                id="gc-email"
                                type="email"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <div className="mt-1 text-xs text-rose-600">{errors.email}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-telefoonnummer">Telefoon{req}</label>
                            <input
                                id="gc-telefoonnummer"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.telefoonnummer}
                                onChange={(e) => setData('telefoonnummer', e.target.value)}
                            />
                            {errors.telefoonnummer && (
                                <div className="mt-1 text-xs text-rose-600">{errors.telefoonnummer}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Adres</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-straatnaam-en-nummer">Straat + nummer{req}</label>
                            <input
                                id="gc-straatnaam-en-nummer"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.straatnaam_en_nummer}
                                onChange={(e) => setData('straatnaam_en_nummer', e.target.value)}
                            />
                            {errors.straatnaam_en_nummer && (
                                <div className="mt-1 text-xs text-rose-600">{errors.straatnaam_en_nummer}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-postcode">Postcode{req}</label>
                            <input
                                id="gc-postcode"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.postcode}
                                onChange={(e) => setData('postcode', e.target.value)}
                            />
                            {errors.postcode && <div className="mt-1 text-xs text-rose-600">{errors.postcode}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-plaats">Plaats{req}</label>
                            <input
                                id="gc-plaats"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.plaats}
                                onChange={(e) => setData('plaats', e.target.value)}
                            />
                            {errors.plaats && <div className="mt-1 text-xs text-rose-600">{errors.plaats}</div>}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Incasso (SEPA)</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-iban">IBAN</label>
                            <input
                                id="gc-iban"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.iban}
                                onChange={(e) => setData('iban', e.target.value)}
                            />
                            {errors.iban && <div className="mt-1 text-xs text-rose-600">{errors.iban}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-bic">BIC</label>
                            <input
                                id="gc-bic"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bic}
                                onChange={(e) => setData('bic', e.target.value)}
                            />
                            {errors.bic && <div className="mt-1 text-xs text-rose-600">{errors.bic}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-plaats-van-tekenen">Plaats van tekenen</label>
                            <input
                                id="gc-plaats-van-tekenen"
                                autoComplete="off"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.plaats_van_tekenen}
                                onChange={(e) => setData('plaats_van_tekenen', e.target.value)}
                            />
                            {errors.plaats_van_tekenen && (
                                <div className="mt-1 text-xs text-rose-600">{errors.plaats_van_tekenen}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-datum-van-tekenen">Datum van tekenen</label>
                            <input
                                id="gc-datum-van-tekenen"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.datum_van_tekenen}
                                onChange={(e) => setData('datum_van_tekenen', e.target.value)}
                            />
                            {errors.datum_van_tekenen && (
                                <div className="mt-1 text-xs text-rose-600">{errors.datum_van_tekenen}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">CRM</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-status">Status</label>
                            <select
                                id="gc-status"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {statusLabels?.[status] || status}
                                    </option>
                                ))}
                            </select>
                            {errors.status && <div className="mt-1 text-xs text-rose-600">{errors.status}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-proefperiode-start">Demo start</label>
                            <input
                                id="gc-proefperiode-start"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.proefperiode_start}
                                onChange={(e) => setData('proefperiode_start', e.target.value)}
                            />
                            {errors.proefperiode_start && (
                                <div className="mt-1 text-xs text-rose-600">{errors.proefperiode_start}</div>
                            )}
                        </div>
                        {isDemo && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-demo-duur">Demo duur (dagen)</label>
                                <input
                                    id="gc-demo-duur"
                                    type="number"
                                    min="1"
                                    max="365"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    aria-describedby="gc-demo-eind"
                                    value={data.demo_duur_dagen}
                                    onChange={(e) => setData('demo_duur_dagen', e.target.value)}
                                />
                                <div id="gc-demo-eind" className="mt-1 text-xs text-zinc-600">
                                    {demoEnd ? `Demo eindigt op ${formatDateNl(demoEnd)}.` : 'Vul een startdatum en duur in.'}
                                </div>
                                {errors.demo_duur_dagen && (
                                    <div className="mt-1 text-xs text-rose-600">{errors.demo_duur_dagen}</div>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-actief-vanaf">Actief vanaf</label>
                            <input
                                id="gc-actief-vanaf"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.actief_vanaf}
                                onChange={(e) => setData('actief_vanaf', e.target.value)}
                            />
                            {errors.actief_vanaf && (
                                <div className="mt-1 text-xs text-rose-600">{errors.actief_vanaf}</div>
                            )}
                        </div>
                        {data.status === 'opgezegd' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-opgezegd-op">Opgezegd op</label>
                                    <input
                                        id="gc-opgezegd-op"
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={data.opgezegd_op}
                                        onChange={(e) => setData('opgezegd_op', e.target.value)}
                                    />
                                    {errors.opgezegd_op && (
                                        <div className="mt-1 text-xs text-rose-600">{errors.opgezegd_op}</div>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-opzegreden">Opzegreden</label>
                                    <input
                                        id="gc-opzegreden"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={data.opzegreden}
                                        onChange={(e) => setData('opzegreden', e.target.value)}
                                    />
                                    {errors.opzegreden && (
                                        <div className="mt-1 text-xs text-rose-600">{errors.opzegreden}</div>
                                    )}
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-bron">Bron</label>
                            <select
                                id="gc-bron"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.bron}
                                onChange={(e) => setData('bron', e.target.value)}
                            >
                                {sourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {SOURCE_LABELS[source] || source}
                                    </option>
                                ))}
                            </select>
                            {errors.bron && <div className="mt-1 text-xs text-rose-600">{errors.bron}</div>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-tags">Tags</label>
                            <textarea
                                id="gc-tags"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                rows={2}
                                value={data.tags}
                                onChange={(e) => setData('tags', e.target.value)}
                            />
                            {errors.tags && <div className="mt-1 text-xs text-rose-600">{errors.tags}</div>}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="text-sm font-semibold">Login gegevens</div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-login-email">Login e-mail</label>
                            <input
                                id="gc-login-email"
                                type="email"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={data.login_email}
                                onChange={(e) => setData('login_email', e.target.value)}
                            />
                            {errors.login_email && (
                                <div className="mt-1 text-xs text-rose-600">{errors.login_email}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="gc-login-password">Wachtwoord</label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    id="gc-login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full rounded-md border-zinc-300 text-sm"
                                    value={data.login_password}
                                    onChange={(e) => setData('login_password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 text-xs font-semibold hover:bg-zinc-50"
                                    aria-pressed={showPassword}
                                    aria-controls="gc-login-password"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? 'Verberg' : 'Toon'}
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 text-xs font-semibold hover:bg-zinc-50"
                                    onClick={() => {
                                        setData('login_password', generatePassword());
                                        setShowPassword(true);
                                    }}
                                >
                                    Genereer
                                </button>
                            </div>
                            {errors.login_password && (
                                <div className="mt-1 text-xs text-rose-600">{errors.login_password}</div>
                            )}
                        </div>
                        <div className="sm:col-span-2 text-xs text-zinc-500">
                            Vul alleen login e-mail in om een account met activatielink-flow te maken. Wachtwoord invullen is optioneel.
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Modules & prijzen</div>
                            <div className="mt-1 text-xs text-zinc-500">
                                Activeer modules en leg prijsafspraken vast per maand. Actief: {totals.actieveModules} /{' '}
                                {totals.totaleModules}. Actief vereist aantal ≥ 1. Prijs 0 is toegestaan.
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal excl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.totaalExcl)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">BTW bedrag</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.btw)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal incl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(totals.totaalIncl)}</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Aantal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl.)</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {data.moduleRows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                                            Er zijn nog geen modules beschikbaar.
                                        </td>
                                    </tr>
                                )}
                                {data.moduleRows.map((row, index) => (
                                    <tr key={row.module_id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300"
                                                checked={!!row.actief}
                                                onChange={() => toggleModule(index)}
                                                aria-label={`${row.naam} actief`}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold">{row.naam}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="999"
                                                className="w-24 rounded-md border-zinc-300 text-sm"
                                                value={row.aantal ?? ''}
                                                onChange={(e) => updateModuleRow(index, 'aantal', e.target.value)}
                                                aria-label={`Aantal ${row.naam}`}
                                            />
                                            {errors[`moduleRows.${index}.aantal`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.aantal`]}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-40 rounded-md border-zinc-300 text-sm"
                                                value={row.prijs_maand_excl ?? ''}
                                                onChange={(e) => updateModuleRow(index, 'prijs_maand_excl', e.target.value)}
                                                aria-label={`Prijs per maand excl. btw ${row.naam}`}
                                            />
                                            {errors[`moduleRows.${index}.prijs_maand_excl`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.prijs_maand_excl`]}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-24 rounded-md border-zinc-300 text-sm"
                                                value={row.btw_percentage ?? ''}
                                                onChange={(e) => updateModuleRow(index, 'btw_percentage', e.target.value)}
                                                aria-label={`BTW percentage ${row.naam}`}
                                            />
                                            {errors[`moduleRows.${index}.btw_percentage`] && (
                                                <div className="mt-1 text-xs text-rose-600">
                                                    {errors[`moduleRows.${index}.btw_percentage`]}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                    {hasErrors && !processing && (
                        <div role="alert" className="text-sm text-rose-600">
                            Niet alle velden zijn juist ingevuld. Controleer de rood gemarkeerde velden hierboven.
                        </div>
                    )}
                    <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={processing}
                    >
                        {processing ? 'Opslaan...' : 'Klant opslaan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
