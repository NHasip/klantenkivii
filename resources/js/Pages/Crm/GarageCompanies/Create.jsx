import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Icon } from '../../../components/icons';
import StatusBadge, { FOCUS_SCOPE } from '../../../components/StatusBadge';
import { Avatar, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, buttonClasses, cx, inputClasses } from '../../../components/ui';

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
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

// Uitleg en icoon per status voor de keuzetegels.
const STATUS_META = {
    demo_aangevraagd: { icon: 'inbox', text: 'Heeft interesse, demo nog niet gestart' },
    lead: { icon: 'inbox', text: 'Heeft interesse, demo nog niet gestart' },
    proefperiode: { icon: 'sparkles', text: 'Demo loopt, met start- en einddatum' },
    demo_gepland: { icon: 'sparkles', text: 'Demo loopt, met start- en einddatum' },
    actief: { icon: 'check-circle', text: 'Betalende klant' },
    gepauzeerd: { icon: 'clock', text: 'Tijdelijk gestopt, geen incasso' },
    opgezegd: { icon: 'x-circle', text: 'Heeft het abonnement opgezegd' },
    verloren: { icon: 'archive', text: 'Is geen klant geworden' },
};

function addDaysToDateInput(value, days) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    const amount = Number(days);
    if (!match || !Number.isFinite(amount) || amount < 1) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setDate(date.getDate() + amount);
    return date;
}

function formatDateNl(date, long = true) {
    if (!date) return '';
    try {
        return new Intl.DateTimeFormat('nl-NL', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return toLocalDateInput(date);
    }
}

function daysFromToday(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date.getTime());
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

// Lichte controle (mod 97) alleen als hint; de server valideert het IBAN definitief.
function ibanLooksValid(raw) {
    const iban = String(raw || '').replace(/\s+/g, '').toUpperCase();
    if (iban.length < 15) return null;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const ch of rearranged) {
        const code = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
        for (const digit of code) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}

function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(length);
    const result = [];
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i += 1) result.push(chars[values[i] % chars.length]);
    } else {
        for (let i = 0; i < length; i += 1) result.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return result.join('');
}

/* ------------------------------------------------------------------ Bouwstenen */

function DuplicateWarning({ matches }) {
    if (!Array.isArray(matches) || matches.length === 0) return null;
    return (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <IconTile icon="alert-triangle" tone="warning" size="sm" className="bg-amber-100" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-950">{matches.length === 1 ? 'Deze klant bestaat mogelijk al' : `Er bestaan mogelijk al ${matches.length} vergelijkbare klanten`}</p>
                    <p className="mt-0.5 text-sm text-amber-900">Controleer het even voordat je opslaat. Is het een andere klant, dan kun je gewoon doorgaan.</p>
                    <ul className="mt-3 space-y-2">
                        {matches.map((match) => (
                            <li key={match.id}>
                                <a
                                    href={match.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 rounded-xl bg-white p-2.5 pr-3 shadow-card ring-1 ring-amber-200/70 transition-colors hover:ring-amber-300 focus-ring"
                                >
                                    <Avatar name={match.bedrijfsnaam} size="sm" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-zinc-900 group-hover:underline">{match.bedrijfsnaam}</span>
                                        <span className="block truncate text-xs text-zinc-500">
                                            {[match.plaats, match.status_label, match.in_prullenbak ? 'in prullenbak' : null].filter(Boolean).join(', ')}
                                            {Array.isArray(match.redenen) && match.redenen.length > 0 ? `. Zelfde ${match.redenen.join(', ')}` : ''}
                                        </span>
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-900">
                                        Bekijken
                                        <Icon name="external-link" className="h-3.5 w-3.5" />
                                        <span className="sr-only"> (opent in nieuw tabblad)</span>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// Formulierveld met label, verplicht-markering, hint en foutmelding gekoppeld aan het invoerveld.
function TextField({ name, label, value, onChange, error, required = false, hint, warning, className = '', type = 'text', icon, inputProps = {} }) {
    const id = `gc-${name}`;
    const describedBy = error ? `${id}-error` : warning ? `${id}-warning` : hint ? `${id}-hint` : undefined;
    return (
        <div className={cx('min-w-0', className)}>
            <label htmlFor={id} className="label mb-1.5">
                {label}
                {required ? <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span> : null}
                {required ? <span className="sr-only"> (verplicht)</span> : null}
            </label>
            <div className="relative">
                {icon ? <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /> : null}
                <input
                    id={id}
                    name={name}
                    type={type}
                    className={cx(inputClasses, icon && 'pl-9', error && 'border-rose-400 focus:border-rose-600 focus:ring-rose-600')}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={describedBy}
                    {...inputProps}
                />
            </div>
            {error ? (
                <p id={`${id}-error`} className="field-error">{error}</p>
            ) : warning ? (
                <p id={`${id}-warning`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-800">
                    <Icon name="alert-circle" className="h-3.5 w-3.5 shrink-0" />
                    {warning}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="field-hint">{hint}</p>
            ) : null}
        </div>
    );
}

const STEP_STATE_BADGE = {
    done: { text: 'Compleet', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: 'check' },
    todo: { text: 'Nog invullen', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200', icon: null },
    optional: { text: 'Optioneel', className: 'bg-zinc-50 text-zinc-500 ring-zinc-200', icon: null },
};

function StepSection({ id, step, total, title, description, icon, state, children }) {
    const badge = STEP_STATE_BADGE[state] ?? STEP_STATE_BADGE.todo;
    return (
        <Card id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
            <CardHeader
                icon={icon}
                title={
                    <span id={`${id}-title`}>
                        <span className="sr-only">Stap {step} van {total}: </span>
                        {title}
                    </span>
                }
                description={description}
                actions={
                    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badge.className)}>
                        {badge.icon ? <Icon name={badge.icon} className="h-3 w-3" strokeWidth={2.5} /> : null}
                        {badge.text}
                    </span>
                }
            />
            {children}
        </Card>
    );
}

const fieldError = (errors, name) => (errors && errors[name]) || null;

/* ------------------------------------------------------------------ Pagina */

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
        return { totaleModules: data.moduleRows.length, actieveModules, totaalExcl, btw, totaalIncl: totaalExcl + btw };
    }, [data.moduleRows]);

    const updateModuleRow = (index, key, value) => {
        setData('moduleRows', data.moduleRows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    };

    const toggleModule = (index) => {
        setData(
            'moduleRows',
            data.moduleRows.map((row, i) => {
                if (i !== index) return row;
                const actief = !row.actief;
                return { ...row, actief, aantal: actief && Number(row.aantal || 0) < 1 ? 1 : row.aantal };
            })
        );
    };

    // Bij een demo-aanvraag zijn alleen bedrijfsnaam, naam en e-mail verplicht.
    const isLead = data.status === 'demo_aangevraagd' || data.status === 'lead';
    const isDemo = data.status === 'proefperiode';
    const showActiefVanaf = data.status === 'actief' || data.status === 'gepauzeerd' || data.status === 'opgezegd';
    const isOpgezegd = data.status === 'opgezegd';
    const required = !isLead;
    const hasIban = data.iban.trim() !== '';
    const addressRequired = required || hasIban;
    const demoEnd = isDemo ? addDaysToDateInput(data.proefperiode_start, data.demo_duur_dagen) : null;
    const demoDaysLeft = demoEnd ? daysFromToday(demoEnd) : null;
    const ibanValid = ibanLooksValid(data.iban);

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

    const field = (name) => ({ name, value: data[name], onChange: (value) => setData(name, value), error: fieldError(errors, name) });
    const filled = (name) => String(data[name] ?? '').trim() !== '';

    // Voortgang per stap voor de badges en het overzicht aan de zijkant.
    const steps = [
        {
            id: 'stap-bedrijf',
            title: 'Bedrijf',
            icon: 'building',
            state: filled('bedrijfsnaam') && (!addressRequired || ['straatnaam_en_nummer', 'postcode', 'plaats'].every(filled)) && (!required || filled('land')) ? 'done' : 'todo',
        },
        {
            id: 'stap-contact',
            title: 'Contact',
            icon: 'user',
            state: filled('voor_en_achternaam') && filled('email') && (!required || filled('telefoonnummer')) ? 'done' : 'todo',
        },
        {
            id: 'stap-status',
            title: 'Status en demo',
            icon: 'sparkles',
            state: filled('status') && (!isDemo || demoEnd) && (!isOpgezegd || (filled('opgezegd_op') && filled('opzegreden'))) ? 'done' : 'todo',
        },
        { id: 'stap-modules', title: 'Modules', icon: 'package', state: totals.actieveModules > 0 ? 'done' : 'optional' },
        { id: 'stap-incasso', title: 'Incasso', icon: 'credit-card', state: hasIban ? (filled('plaats_van_tekenen') && filled('datum_van_tekenen') && ibanValid !== false ? 'done' : 'todo') : 'optional' },
    ];
    const stepState = (id) => steps.find((s) => s.id === id)?.state;
    const requiredDone = steps.filter((s) => s.state !== 'optional').every((s) => s.state === 'done');

    const statusLabel = statusLabels?.[data.status] || data.status;
    const previewName = data.bedrijfsnaam.trim() || 'Nieuwe klant';

    return (
        <div className={FOCUS_SCOPE}>
            <Head title="Nieuwe klant" />

            <PageHeader
                back={{ href: urls.index, label: 'Klanten' }}
                title="Nieuwe klant"
                description={isLead ? 'Voor een demo-aanvraag heb je alleen de bedrijfsnaam, een naam en een e-mailadres nodig. De rest vul je later aan.' : 'Leg een garagebedrijf vast. Velden met een sterretje zijn verplicht voor deze status.'}
            />

            <form ref={formRef} onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="min-w-0 space-y-5">
                    {errorCount > 0 && !processing ? (
                        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                            <IconTile icon="alert-circle" tone="danger" size="sm" className="bg-rose-100" />
                            <div>
                                <p className="font-semibold">De klant is nog niet opgeslagen</p>
                                <p className="mt-0.5">{errorCount === 1 ? 'Er is 1 veld dat aandacht nodig heeft.' : `Er zijn ${errorCount} velden die aandacht nodig hebben.`} Het eerste veld is gemarkeerd.</p>
                            </div>
                        </div>
                    ) : null}

                    <div aria-live="polite">
                        <DuplicateWarning matches={duplicates} />
                    </div>

                    <StepSection
                        id="stap-bedrijf"
                        step={1}
                        total={5}
                        icon="building"
                        title="Bedrijf"
                        description={isLead && !hasIban ? 'Alleen de bedrijfsnaam is nu verplicht. Het adres kun je later aanvullen.' : 'Naam en vestigingsadres van de garage.'}
                        state={stepState('stap-bedrijf')}
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                            <TextField {...field('bedrijfsnaam')} label="Bedrijfsnaam" required className="sm:col-span-4" inputProps={{ autoComplete: 'organization', maxLength: 255 }} />
                            <TextField {...field('kvk_nummer')} label="KVK-nummer" className="sm:col-span-2" inputProps={{ inputMode: 'numeric', maxLength: 50 }} />
                            <TextField {...field('straatnaam_en_nummer')} label="Straat en huisnummer" required={addressRequired} className="sm:col-span-6" icon="map-pin" inputProps={{ autoComplete: 'street-address' }} />
                            <TextField {...field('postcode')} label="Postcode" required={addressRequired} className="sm:col-span-2" inputProps={{ autoComplete: 'postal-code', maxLength: 20 }} />
                            <TextField {...field('plaats')} label="Plaats" required={addressRequired} className="sm:col-span-2" inputProps={{ autoComplete: 'address-level2' }} />
                            <TextField {...field('land')} label="Land" required={required} className="sm:col-span-2" inputProps={{ autoComplete: 'country-name' }} />
                        </div>
                    </StepSection>

                    <StepSection id="stap-contact" step={2} total={5} icon="user" title="Contact" description="Deze persoon wordt de primaire contactpersoon (eigenaar) van het bedrijf." state={stepState('stap-contact')}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TextField
                                {...field('voor_en_achternaam')}
                                label="Volledige naam"
                                required
                                className="sm:col-span-2"
                                hint={isLead ? undefined : 'Voor- en achternaam, gescheiden door een spatie.'}
                                inputProps={{ autoComplete: 'name' }}
                            />
                            <TextField {...field('email')} label="E-mail" type="email" required icon="mail" inputProps={{ autoComplete: 'email' }} />
                            <TextField {...field('telefoonnummer')} label="Telefoon" type="tel" required={required} icon="phone" inputProps={{ autoComplete: 'tel' }} />
                        </div>

                        <div className="mt-6 rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-100">
                            <div className="mb-3 flex items-start gap-2.5">
                                <Icon name="key" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900">Login voor Kivii <span className="font-normal text-zinc-500">(optioneel)</span></p>
                                    <p className="text-xs text-zinc-500">Met alleen een login-e-mail krijgt de klant een activatielink; een wachtwoord is dan niet nodig.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <TextField {...field('login_email')} label="Login-e-mail" type="email" inputProps={{ autoComplete: 'off' }} />
                                <div className="min-w-0">
                                    <label className="label mb-1.5" htmlFor="gc-login_password">Wachtwoord</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="gc-login_password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            className={cx(inputClasses, 'min-w-0 flex-1', errors.login_password && 'border-rose-400')}
                                            value={data.login_password}
                                            onChange={(e) => setData('login_password', e.target.value)}
                                            aria-invalid={errors.login_password ? 'true' : undefined}
                                            aria-describedby={errors.login_password ? 'gc-login_password-error' : 'gc-login_password-hint'}
                                        />
                                        <Button
                                            variant="secondary"
                                            iconOnly
                                            icon="eye"
                                            aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                                            aria-pressed={showPassword}
                                            aria-controls="gc-login_password"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                        />
                                        <Button
                                            variant="secondary"
                                            icon="refresh"
                                            onClick={() => {
                                                setData('login_password', generatePassword());
                                                setShowPassword(true);
                                            }}
                                        >
                                            Genereer
                                        </Button>
                                    </div>
                                    {errors.login_password ? (
                                        <p id="gc-login_password-error" className="field-error">{errors.login_password}</p>
                                    ) : (
                                        <p id="gc-login_password-hint" className="field-hint">Minimaal 8 tekens. Leeg laten mag.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </StepSection>

                    <StepSection id="stap-status" step={3} total={5} icon="sparkles" title="Status en demo" description="De status bepaalt welke velden verplicht zijn en of er een demo loopt." state={stepState('stap-status')}>
                        <fieldset>
                            <legend className="label mb-2">Status</legend>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-describedby={errors.status ? 'gc-status-error' : undefined}>
                                {statusOptions.map((status) => {
                                    const meta = STATUS_META[status] ?? { icon: 'info', text: '' };
                                    const checked = data.status === status;
                                    return (
                                        <label
                                            key={status}
                                            className={cx(
                                                'relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2',
                                                checked ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                id={`gc-status-${status}`}
                                                value={status}
                                                checked={checked}
                                                onChange={() => handleStatusChange(status)}
                                                className="sr-only"
                                                aria-invalid={errors.status ? 'true' : undefined}
                                            />
                                            <span className={cx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', checked ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-500')} aria-hidden="true">
                                                <Icon name={meta.icon} className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-zinc-900">{statusLabels?.[status] || status}</span>
                                                {meta.text ? <span className="block text-xs text-zinc-500">{meta.text}</span> : null}
                                            </span>
                                            {checked ? <Icon name="check-circle" className="absolute right-2.5 top-2.5 h-4 w-4 text-indigo-700" /> : null}
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.status ? <p id="gc-status-error" className="field-error">{errors.status}</p> : null}
                        </fieldset>

                        {isDemo ? (
                            <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-amber-50/60 p-4 ring-1 ring-inset ring-amber-100 sm:grid-cols-2">
                                <TextField {...field('proefperiode_start')} label="Demo start" type="date" />
                                <TextField
                                    {...field('demo_duur_dagen')}
                                    label="Demoduur (dagen)"
                                    type="number"
                                    hint={demoEnd ? `Demo eindigt op ${formatDateNl(demoEnd)}.` : 'Vul een startdatum en duur in.'}
                                    inputProps={{ min: 1, max: 365, inputMode: 'numeric' }}
                                />
                                <div className="flex flex-wrap gap-1.5 sm:col-span-2" role="group" aria-label="Snel een demoduur kiezen">
                                    {[7, 14, 30].map((days) => (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => setData('demo_duur_dagen', days)}
                                            aria-pressed={Number(data.demo_duur_dagen) === days}
                                            className={cx(
                                                'h-8 rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors focus-ring',
                                                Number(data.demo_duur_dagen) === days ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50'
                                            )}
                                        >
                                            {days} dagen{days === defaultDemoDays ? ' (standaard)' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
                                <label className="label mb-1.5" htmlFor="gc-bron">Bron</label>
                                <select
                                    id="gc-bron"
                                    className={cx(inputClasses, errors.bron && 'border-rose-400')}
                                    value={data.bron}
                                    onChange={(e) => setData('bron', e.target.value)}
                                    aria-invalid={errors.bron ? 'true' : undefined}
                                    aria-describedby={errors.bron ? 'gc-bron-error' : undefined}
                                >
                                    {sourceOptions.map((source) => (
                                        <option key={source} value={source}>{SOURCE_LABELS[source] || source}</option>
                                    ))}
                                </select>
                                {errors.bron ? <p id="gc-bron-error" className="field-error">{errors.bron}</p> : null}
                            </div>
                            {showActiefVanaf ? <TextField {...field('actief_vanaf')} label="Actief vanaf" type="date" /> : null}
                            {isOpgezegd ? (
                                <>
                                    <TextField {...field('opgezegd_op')} label="Opgezegd op" type="date" required />
                                    <TextField {...field('opzegreden')} label="Opzegreden" required className="sm:col-span-2" inputProps={{ maxLength: 255 }} />
                                </>
                            ) : null}
                            <TextField {...field('tags')} label="Tags" icon="tag" className="sm:col-span-2" hint="Meerdere tags scheiden met een komma." inputProps={{ placeholder: 'bijv. premium, bosch' }} />
                        </div>
                    </StepSection>

                    <StepSection
                        id="stap-modules"
                        step={4}
                        total={5}
                        icon="package"
                        title="Modules"
                        description={`Prijsafspraken per maand. ${totals.actieveModules} van ${totals.totaleModules} modules actief. Een actieve module heeft minimaal aantal 1; prijs 0 mag.`}
                        state={stepState('stap-modules')}
                    >
                        {data.moduleRows.length === 0 ? (
                            <EmptyState compact illustration="tasks" title="Nog geen modules beschikbaar" description="Je kunt de klant wel opslaan en later modules toevoegen in het klantdossier." />
                        ) : (
                            <ul className="space-y-2">
                                {data.moduleRows.map((row, index) => {
                                    const err = (key) => errors[`moduleRows.${index}.${key}`];
                                    const rowHasError = ['aantal', 'prijs_maand_excl', 'btw_percentage'].some((key) => err(key));
                                    const showInputs = row.actief || rowHasError;
                                    const subtotal = numberValue(row.prijs_maand_excl) * Math.max(1, Number(row.aantal || 1));
                                    const checkboxId = `gc-module-${index}-actief`;
                                    return (
                                        <li key={row.module_id ?? index} className={cx('rounded-xl border p-3 transition-colors', row.actief ? 'border-indigo-300 bg-indigo-50/50' : 'border-zinc-200 bg-white')}>
                                            <div className="flex items-center gap-3">
                                                <input id={checkboxId} type="checkbox" className="checkbox h-5 w-5" checked={!!row.actief} onChange={() => toggleModule(index)} />
                                                <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer">
                                                    <span className="block truncate text-sm font-semibold text-zinc-900">{row.naam}</span>
                                                    {!row.actief ? <span className="block text-xs text-zinc-500">{formatEuro(numberValue(row.prijs_maand_excl))} per maand excl. btw</span> : null}
                                                </label>
                                                {row.actief ? <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">{formatEuro(subtotal)}<span className="font-normal text-zinc-500"> p/m</span></span> : null}
                                            </div>
                                            {showInputs ? (
                                                <div className="mt-3 grid grid-cols-3 gap-2 sm:ml-8 sm:max-w-md">
                                                    {[
                                                        { key: 'aantal', label: 'Aantal', props: { min: 0, max: 999, inputMode: 'numeric' } },
                                                        { key: 'prijs_maand_excl', label: 'Prijs p/m excl.', props: { min: 0, step: '0.01', inputMode: 'decimal' } },
                                                        { key: 'btw_percentage', label: 'Btw %', props: { min: 0, max: 100, step: '0.01', inputMode: 'decimal' } },
                                                    ].map((col) => {
                                                        const inputId = `gc-module-${index}-${col.key}`;
                                                        return (
                                                            <div key={col.key} className="min-w-0">
                                                                <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-zinc-500">
                                                                    {col.label}
                                                                    <span className="sr-only"> {row.naam}</span>
                                                                </label>
                                                                <input
                                                                    id={inputId}
                                                                    type="number"
                                                                    className={cx(inputClasses, 'tabular-nums', err(col.key) && 'border-rose-400')}
                                                                    value={row[col.key] ?? ''}
                                                                    onChange={(e) => updateModuleRow(index, col.key, e.target.value)}
                                                                    aria-invalid={err(col.key) ? 'true' : undefined}
                                                                    aria-describedby={err(col.key) ? `${inputId}-error` : undefined}
                                                                    {...col.props}
                                                                />
                                                                {err(col.key) ? <p id={`${inputId}-error`} className="field-error">{err(col.key)}</p> : null}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </StepSection>

                    <StepSection
                        id="stap-incasso"
                        step={5}
                        total={5}
                        icon="credit-card"
                        title="Incasso (SEPA)"
                        description="Optioneel. Met een IBAN wordt een SEPA-mandaat met status pending vastgelegd."
                        state={stepState('stap-incasso')}
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TextField
                                {...field('iban')}
                                label="IBAN"
                                hint="Spaties mogen, bijvoorbeeld NL91 ABNA 0417 1643 00."
                                warning={ibanValid === false ? 'Dit IBAN lijkt niet te kloppen. Controleer de cijfers.' : null}
                                inputProps={{ autoComplete: 'off', spellCheck: false, maxLength: 42 }}
                            />
                            <TextField {...field('bic')} label="BIC" inputProps={{ autoComplete: 'off', spellCheck: false, maxLength: 14 }} />
                            <TextField {...field('plaats_van_tekenen')} label="Plaats van tekenen" required={hasIban} inputProps={{ autoComplete: 'off' }} />
                            <TextField {...field('datum_van_tekenen')} label="Datum van tekenen" type="date" required={hasIban} />
                        </div>
                        {hasIban && !['straatnaam_en_nummer', 'postcode', 'plaats'].every(filled) ? (
                            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
                                <Icon name="info" className="h-4 w-4 shrink-0 text-sky-600" />
                                Met een IBAN is ook het adres bij
                                <a href="#stap-bedrijf" className="link font-medium">Bedrijf</a>
                                verplicht.
                            </p>
                        ) : null}
                    </StepSection>
                </div>

                {/* Live samenvatting */}
                <aside className="hidden lg:block" aria-label="Samenvatting">
                    <div className="sticky top-6 space-y-4">
                        <Card padded={false}>
                            <div className="flex items-center gap-3 border-b border-zinc-100 p-5">
                                <Avatar name={previewName} size="lg" />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-zinc-900" title={previewName}>{previewName}</p>
                                    <p className="truncate text-xs text-zinc-500">{[data.plaats.trim(), data.voor_en_achternaam.trim()].filter(Boolean).join(', ') || 'Nog geen plaats of contact'}</p>
                                    <StatusBadge status={data.status} labels={statusLabels} className="mt-1.5" />
                                </div>
                            </div>

                            <div className="space-y-4 p-5">
                                <div>
                                    <p className="text-xs font-medium text-zinc-500">MRR excl. btw</p>
                                    <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-display text-zinc-900">{formatEuro(totals.totaalExcl)}</p>
                                    <p className="text-xs text-zinc-500">
                                        {formatEuro(totals.totaalIncl)} incl. btw, {totals.actieveModules} {totals.actieveModules === 1 ? 'module' : 'modules'}
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3">
                                    <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                                    <div className="min-w-0 text-sm">
                                        {isDemo ? (
                                            demoEnd ? (
                                                <>
                                                    <p className="font-medium text-zinc-900">Demo eindigt {formatDateNl(demoEnd, false)}</p>
                                                    <p className="text-xs text-zinc-500">
                                                        {Number(data.demo_duur_dagen)} dagen
                                                        {demoDaysLeft !== null ? (demoDaysLeft >= 0 ? `, nog ${demoDaysLeft} ${demoDaysLeft === 1 ? 'dag' : 'dagen'}` : ', al verlopen') : ''}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-zinc-600">Vul de demostart en duur in.</p>
                                            )
                                        ) : (
                                            <p className="text-zinc-600">Geen lopende demo bij status {statusLabel}.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <nav aria-label="Stappen" className="border-t border-zinc-100 p-3">
                                <ol className="space-y-0.5">
                                    {steps.map((step, i) => (
                                        <li key={step.id}>
                                            <a href={`#${step.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 focus-ring">
                                                <span
                                                    className={cx(
                                                        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
                                                        step.state === 'done' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200'
                                                    )}
                                                    aria-hidden="true"
                                                >
                                                    {step.state === 'done' ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                                                </span>
                                                <span className="flex-1">{step.title}</span>
                                                <span className="text-xs text-zinc-400">{STEP_STATE_BADGE[step.state].text}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </nav>

                            <div className="space-y-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 p-4">
                                <Button type="submit" size="lg" className="w-full" icon="check" loading={processing}>
                                    {processing ? 'Opslaan...' : 'Klant opslaan'}
                                </Button>
                                <Link href={urls.index} className={buttonClasses({ variant: 'ghost', className: 'w-full' })}>
                                    Annuleren
                                </Link>
                                {!requiredDone ? <p className="pt-1 text-center text-xs text-zinc-500">Nog niet alle verplichte stappen zijn compleet.</p> : null}
                            </div>
                        </Card>
                    </div>
                </aside>

                {/* Mobiel: vaste balk onderaan met totaal en opslaan */}
                <div className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200 bg-white/95 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-pop lg:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 text-sm text-zinc-600">
                            <span className="font-semibold tabular-nums text-zinc-900">{formatEuro(totals.totaalExcl)}</span> p/m excl.
                            {isDemo && demoEnd ? <span className="block text-xs text-zinc-500">Demo tot {formatDateNl(demoEnd, false)}</span> : null}
                        </div>
                        <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                            <Link href={urls.index} className={buttonClasses({ variant: 'ghost', size: 'lg' })}>
                                Annuleren
                            </Link>
                            <Button type="submit" size="lg" icon="check" loading={processing}>
                                {processing ? 'Opslaan...' : 'Klant opslaan'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
