import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
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

function formatDate(isoString) {
    if (!isoString) return '-';
    try {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(isoString));
    } catch {
        return String(isoString);
    }
}

function numberValue(value) {
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
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
                    preserveScroll
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

const TABS = [
    { key: 'overzicht', label: 'Overzicht' },
    { key: 'klantpersonen', label: 'Contactpersonen' },
    { key: 'demo_status', label: 'Demo & status' },
    { key: 'incasso', label: 'Incasso' },
    { key: 'modules', label: 'Modules & prijzen' },
    { key: 'gebruikers', label: 'Gebruikers' },
    { key: 'timeline', label: 'Notities & timeline' },
    { key: 'taken_afspraken', label: 'Taken & afspraken' },
];

export default function Show({
    garageCompany,
    tab,
    statusOptions,
    sourceOptions,
    moduleRows,
    moduleTotals,
    persons,
    seats,
    mandates,
    activities,
    tasks,
    appointments,
    reminderChannels,
    hasActiveMandate,
    statusErrors,
    welcomeEmail,
    smtpConfigured,
    urls,
}) {
    const activeTab = tab || 'overzicht';

    const deleteCompany = () => {
        if (!confirm(`Weet je zeker dat je "${garageCompany.bedrijfsnaam}" wilt verwijderen?`)) return;
        router.delete(urls.delete_company);
    };

    const overviewForm = useForm({
        bedrijfsnaam: garageCompany.bedrijfsnaam || '',
        kvk_nummer: garageCompany.kvk_nummer || '',
        btw_nummer: garageCompany.btw_nummer || '',
        adres_straat_nummer: garageCompany.adres_straat_nummer || '',
        postcode: garageCompany.postcode || '',
        plaats: garageCompany.plaats || '',
        land: garageCompany.land || 'Nederland',
        website: garageCompany.website || '',
        hoofd_email: garageCompany.hoofd_email || '',
        hoofd_telefoon: garageCompany.hoofd_telefoon || '',
        login_email: garageCompany.login_email || '',
        login_password: garageCompany.login_password || '',
        status: garageCompany.status || statusOptions?.[0],
        bron: garageCompany.bron || sourceOptions?.[0],
        tags: garageCompany.tags || '',
        demo_aangevraagd_op: garageCompany.demo_aangevraagd_op || '',
        demo_gepland_op: garageCompany.demo_gepland_op || '',
        proefperiode_start: garageCompany.proefperiode_start || '',
        actief_vanaf: garageCompany.actief_vanaf || '',
        opgezegd_op: garageCompany.opgezegd_op || '',
        opzegreden: garageCompany.opzegreden || '',
        verloren_op: garageCompany.verloren_op || '',
        verloren_reden: garageCompany.verloren_reden || '',
    });

    const handleStatusChange = (value) => {
        overviewForm.setData('status', value);
        if (value === 'demo_aangevraagd' && !overviewForm.data.demo_aangevraagd_op) {
            overviewForm.setData('demo_aangevraagd_op', new Date().toISOString().slice(0, 16));
        }
        if (value === 'actief' && !overviewForm.data.actief_vanaf) {
            overviewForm.setData('actief_vanaf', new Date().toISOString().slice(0, 16));
        }
    };

    const submitOverview = (event) => {
        event.preventDefault();
        if (['opgezegd', 'verloren'].includes(overviewForm.data.status)) {
            const ok = confirm('Weet je het zeker? Dit wordt gelogd in de timeline.');
            if (!ok) return;
        }
        overviewForm.patch(urls.update_overview, { preserveScroll: true });
    };

    const [showPersonForm, setShowPersonForm] = useState(false);
    const [editingPersonId, setEditingPersonId] = useState(null);

    const personForm = useForm({
        voornaam: '',
        achternaam: '',
        rol: '',
        email: '',
        telefoon: '',
        is_primary: false,
        active: true,
    });

    const startPersonCreate = () => {
        setEditingPersonId(null);
        setShowPersonForm(true);
        personForm.setData({
            voornaam: '',
            achternaam: '',
            rol: '',
            email: '',
            telefoon: '',
            is_primary: false,
            active: true,
        });
        personForm.clearErrors();
    };

    const startPersonEdit = (person) => {
        setEditingPersonId(person.id);
        setShowPersonForm(true);
        personForm.setData({
            voornaam: person.voornaam || '',
            achternaam: person.achternaam || '',
            rol: person.rol || '',
            email: person.email || '',
            telefoon: person.telefoon || '',
            is_primary: !!person.is_primary,
            active: !!person.active,
        });
        personForm.clearErrors();
    };

    const cancelPerson = () => {
        setEditingPersonId(null);
        setShowPersonForm(false);
        personForm.clearErrors();
    };

    const submitPerson = (event) => {
        event.preventDefault();
        if (editingPersonId) {
            const url = urls.update_person.replace('__PERSON__', editingPersonId);
            personForm.patch(url, { preserveScroll: true });
        } else {
            personForm.post(urls.store_person, { preserveScroll: true });
        }
    };

    const deletePerson = (personId) => {
        if (!confirm('Verwijderen?')) return;
        const url = urls.delete_person.replace('__PERSON__', personId);
        router.delete(url, { preserveScroll: true });
    };

    const moduleForm = useForm({
        rows: moduleRows || [],
    });

    const moduleTotalsLive = useMemo(() => {
        let totaalExcl = 0;
        let btw = 0;
        let actieveModules = 0;
        moduleForm.data.rows.forEach((row) => {
            if (!row.actief) return;
            const prijs = numberValue(row.prijs_maand_excl);
            const aantal = Math.max(1, Number(row.aantal || 1));
            totaalExcl += prijs * aantal;
            btw += prijs * aantal * (numberValue(row.btw_percentage) / 100);
            actieveModules += 1;
        });
        return {
            totaleModules: moduleForm.data.rows.length,
            actieveModules,
            totaalExcl,
            btw,
            totaalIncl: totaalExcl + btw,
        };
    }, [moduleForm.data.rows]);

    const updateModuleRow = (index, key, value) => {
        moduleForm.setData(
            'rows',
            moduleForm.data.rows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
        );
    };

    const toggleModule = (index) => {
        const row = moduleForm.data.rows[index];
        updateModuleRow(index, 'actief', !row.actief);
        if (!row.actief && Number(row.aantal || 0) < 1) {
            updateModuleRow(index, 'aantal', 1);
        }
    };

    const submitModules = () => {
        moduleForm.patch(urls.update_modules, { preserveScroll: true });
    };

    const [showSeatForm, setShowSeatForm] = useState(false);
    const [editingSeatId, setEditingSeatId] = useState(null);

    const seatForm = useForm({
        naam: '',
        email: '',
        rol_in_kivii: '',
        actief: true,
        aangemaakt_op: '',
    });

    const startSeatCreate = () => {
        setEditingSeatId(null);
        setShowSeatForm(true);
        seatForm.setData({ naam: '', email: '', rol_in_kivii: '', actief: true, aangemaakt_op: '' });
        seatForm.clearErrors();
    };

    const startSeatEdit = (seat) => {
        setEditingSeatId(seat.id);
        setShowSeatForm(true);
        seatForm.setData({
            naam: seat.naam || '',
            email: seat.email || '',
            rol_in_kivii: seat.rol_in_kivii || '',
            actief: !!seat.actief,
            aangemaakt_op: seat.aangemaakt_op || '',
        });
        seatForm.clearErrors();
    };

    const cancelSeat = () => {
        setEditingSeatId(null);
        setShowSeatForm(false);
        seatForm.clearErrors();
    };

    const submitSeat = (event) => {
        event.preventDefault();
        if (editingSeatId) {
            seatForm.patch(urls.update_seat.replace('__SEAT__', editingSeatId), { preserveScroll: true });
        } else {
            seatForm.post(urls.store_seat, { preserveScroll: true });
        }
    };

    const deleteSeat = (seatId) => {
        if (!confirm('Verwijderen?')) return;
        router.delete(urls.delete_seat.replace('__SEAT__', seatId), { preserveScroll: true });
    };

    const demoForm = useForm({
        demo_aangevraagd_op: garageCompany.demo_aangevraagd_op || '',
        demo_gepland_op: garageCompany.demo_gepland_op || '',
        demo_duur_dagen: garageCompany.demo_duur_dagen || '',
        proefperiode_start: garageCompany.proefperiode_start || '',
        actief_vanaf: garageCompany.actief_vanaf || '',
    });

    const demoEndPreview = useMemo(() => {
        if (demoForm.data.demo_aangevraagd_op && demoForm.data.demo_duur_dagen) {
            const date = new Date(demoForm.data.demo_aangevraagd_op);
            if (!Number.isNaN(date.getTime())) {
                date.setDate(date.getDate() + Number(demoForm.data.demo_duur_dagen));
                return date.toISOString().slice(0, 16);
            }
        }
        return garageCompany.demo_eind_op || '';
    }, [demoForm.data.demo_aangevraagd_op, demoForm.data.demo_duur_dagen, garageCompany.demo_eind_op]);

    const submitDemoDates = (event) => {
        event.preventDefault();
        demoForm.patch(urls.save_demo_dates, { preserveScroll: true });
    };

    const extendForm = useForm({
        demo_verleng_dagen: '',
        demo_verleng_notitie: '',
    });

    const submitExtend = (event) => {
        event.preventDefault();
        extendForm.post(urls.extend_demo, {
            preserveScroll: true,
            onSuccess: () => extendForm.reset(),
        });
    };

    const setDemoStatus = (status) => {
        router.patch(urls.set_demo_status, { status }, { preserveScroll: true });
    };

    const [showMandateForm, setShowMandateForm] = useState(false);
    const [editingMandateId, setEditingMandateId] = useState(null);

    const blankMandate = () => {
        const primaryName = garageCompany.primary_person
            ? `${garageCompany.primary_person.voornaam} ${garageCompany.primary_person.achternaam}`.trim()
            : '';
        return {
            mandate_id: null,
            bedrijfsnaam: garageCompany.bedrijfsnaam || '',
            voor_en_achternaam: primaryName || garageCompany.bedrijfsnaam || '',
            straatnaam_en_nummer: garageCompany.adres_straat_nummer || '',
            postcode: garageCompany.postcode || '',
            plaats: garageCompany.plaats || '',
            land: garageCompany.land || 'Nederland',
            iban: '',
            bic: '',
            email: garageCompany.hoofd_email || '',
            telefoonnummer: garageCompany.hoofd_telefoon || '',
            plaats_van_tekenen: garageCompany.plaats || '',
            datum_van_tekenen: new Date().toISOString().slice(0, 10),
            ondertekenaar_naam: '',
            akkoord_checkbox: false,
            akkoord_op: '',
            status: 'pending',
            ontvangen_op: new Date().toISOString().slice(0, 16),
        };
    };

    const mandateForm = useForm(blankMandate());

    const startMandateNew = () => {
        setEditingMandateId(null);
        setShowMandateForm(true);
        mandateForm.setData(blankMandate());
        mandateForm.clearErrors();
    };

    const startMandateEdit = (mandate) => {
        setEditingMandateId(mandate.id);
        setShowMandateForm(true);
        mandateForm.setData({
            mandate_id: mandate.id,
            bedrijfsnaam: mandate.bedrijfsnaam || '',
            voor_en_achternaam: mandate.voor_en_achternaam || '',
            straatnaam_en_nummer: mandate.straatnaam_en_nummer || '',
            postcode: mandate.postcode || '',
            plaats: mandate.plaats || '',
            land: mandate.land || 'Nederland',
            iban: mandate.iban || '',
            bic: mandate.bic || '',
            email: mandate.email || '',
            telefoonnummer: mandate.telefoonnummer || '',
            plaats_van_tekenen: mandate.plaats_van_tekenen || '',
            datum_van_tekenen: mandate.datum_van_tekenen || '',
            ondertekenaar_naam: mandate.ondertekenaar_naam || '',
            akkoord_checkbox: !!mandate.akkoord_checkbox,
            akkoord_op: mandate.akkoord_op || '',
            status: mandate.status || 'pending',
            ontvangen_op: mandate.ontvangen_op || '',
        });
        mandateForm.clearErrors();
    };

    const cancelMandate = () => {
        setEditingMandateId(null);
        setShowMandateForm(false);
        mandateForm.clearErrors();
    };

    const submitMandate = (event) => {
        event.preventDefault();
        mandateForm.post(urls.save_mandate, {
            preserveScroll: true,
            onSuccess: () => setShowMandateForm(false),
        });
    };

    const setMandateStatus = (mandateId, status) => {
        router.patch(urls.set_mandate_status.replace('__MANDATE__', mandateId), { status }, { preserveScroll: true });
    };

    const noteForm = useForm({
        titel: 'Notitie',
        inhoud: '',
    });

    const submitNote = (event) => {
        event.preventDefault();
        noteForm.post(urls.add_note, {
            preserveScroll: true,
            onSuccess: () => noteForm.reset('inhoud'),
        });
    };

    const taskForm = useForm({
        type: 'taak',
        titel: '',
        inhoud: '',
        due_at: '',
        createReminder: false,
        remind_at: '',
        channel: reminderChannels?.[0] || 'popup',
    });

    const submitTask = (event) => {
        event.preventDefault();
        taskForm.post(urls.add_task, {
            preserveScroll: true,
            onSuccess: () => taskForm.reset('titel', 'inhoud', 'due_at', 'createReminder', 'remind_at'),
        });
    };

    const markDone = (activityId) => {
        router.patch(urls.mark_task_done.replace('__ACTIVITY__', activityId), {}, { preserveScroll: true });
    };

    const welcomeForm = useForm({
        subject: welcomeEmail?.subject || '',
        body_html: welcomeEmail?.body_html || '',
        body_text: welcomeEmail?.body_text || '',
    });

    useEffect(() => {
        welcomeForm.setData({
            subject: welcomeEmail?.subject || '',
            body_html: welcomeEmail?.body_html || '',
            body_text: welcomeEmail?.body_text || '',
        });
    }, [welcomeEmail?.id]);

    const refreshWelcome = () => {
        router.post(urls.refresh_welcome_email, {}, { preserveScroll: true });
    };

    const saveWelcome = () => {
        welcomeForm.post(urls.update_welcome_email, { preserveScroll: true });
    };

    const welcomeStatus = welcomeEmail?.status || 'concept';
    const welcomeStatusClass = {
        draft: 'bg-amber-50 text-amber-700',
        concept: 'bg-amber-50 text-amber-700',
        sent: 'bg-emerald-50 text-emerald-700',
        failed: 'bg-rose-50 text-rose-700',
    }[welcomeStatus] || 'bg-zinc-100 text-zinc-700';

    const sendWelcome = () => {
        if (!welcomeEmail) return;
        if (!smtpConfigured) {
            alert('SMTP instellingen ontbreken. Voeg deze toe via profiel > systeem-instellingen.');
            return;
        }
        if (!confirm('Welkomstmail versturen?')) return;
        welcomeForm.post(urls.update_welcome_email, {
            preserveScroll: true,
            onSuccess: () => {
                router.post(urls.send_welcome_email, {}, { preserveScroll: true });
            },
        });
    };

    return (
        <div className="space-y-6">
            <Head title={garageCompany.bedrijfsnaam} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">{garageCompany.bedrijfsnaam}</h1>
                    <p className="mt-1 text-sm text-zinc-500">Klantdossier en modules</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={urls.index}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                        Terug naar overzicht
                    </Link>
                    <button
                        type="button"
                        onClick={deleteCompany}
                        className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                        Verwijder klant
                    </button>
                    <Link
                        href={urls.old_show}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
                    >
                        Klant (old)
                    </Link>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {TABS.map((item) => (
                    <Link
                        key={item.key}
                        href={`${urls.show}?tab=${item.key}`}
                        className={cx(
                            'rounded-md border px-3 py-2 text-sm font-semibold',
                            activeTab === item.key
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>

            {activeTab === 'overzicht' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (excl. btw)</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(garageCompany.active_mrr_excl)}</div>
                            <div className="mt-2 text-xs text-zinc-500">Actieve modules, vandaag.</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Maandelijks terugkerende omzet (incl. btw)</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(garageCompany.active_mrr_incl)}</div>
                            <div className="mt-2 text-xs text-zinc-500">BTW standaard 21% (instelbaar per module).</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">SEPA mandaat</div>
                            <div className="mt-1 text-xl font-semibold">{hasActiveMandate ? 'Actief' : 'Niet actief'}</div>
                            <div className="mt-2 text-xs text-zinc-500">Zie tab Incasso voor historie.</div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link
                            href={`${urls.show}?tab=modules`}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                        >
                            Modules & prijzen wijzigen
                        </Link>
                    </div>

                    {statusErrors && statusErrors.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <div className="font-semibold">Let op</div>
                            <ul className="mt-2 list-disc pl-5">
                                {statusErrors.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <form onSubmit={submitOverview} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.bedrijfsnaam}
                                    onChange={(e) => overviewForm.setData('bedrijfsnaam', e.target.value)}
                                />
                                {overviewForm.errors.bedrijfsnaam && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.bedrijfsnaam}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Status</label>
                                <select
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Bron</label>
                                <select
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.bron}
                                    onChange={(e) => overviewForm.setData('bron', e.target.value)}
                                >
                                    {sourceOptions.map((source) => (
                                        <option key={source} value={source}>
                                            {source}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Hoofd e-mail *</label>
                                <input
                                    type="email"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.hoofd_email}
                                    onChange={(e) => overviewForm.setData('hoofd_email', e.target.value)}
                                />
                                {overviewForm.errors.hoofd_email && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.hoofd_email}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Hoofd telefoon *</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.hoofd_telefoon}
                                    onChange={(e) => overviewForm.setData('hoofd_telefoon', e.target.value)}
                                />
                                {overviewForm.errors.hoofd_telefoon && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.hoofd_telefoon}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Login e-mail</label>
                                <input
                                    type="email"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.login_email}
                                    onChange={(e) => overviewForm.setData('login_email', e.target.value)}
                                />
                                {overviewForm.errors.login_email && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.login_email}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Login wachtwoord</label>
                                <input
                                    type="password"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.login_password}
                                    onChange={(e) => overviewForm.setData('login_password', e.target.value)}
                                />
                                {overviewForm.errors.login_password && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.login_password}</div>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600">Adres</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.adres_straat_nummer}
                                    onChange={(e) => overviewForm.setData('adres_straat_nummer', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Postcode</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.postcode}
                                    onChange={(e) => overviewForm.setData('postcode', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Plaats *</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.plaats}
                                    onChange={(e) => overviewForm.setData('plaats', e.target.value)}
                                />
                                {overviewForm.errors.plaats && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.plaats}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Land</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.land}
                                    onChange={(e) => overviewForm.setData('land', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Website</label>
                                <input
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.website}
                                    onChange={(e) => overviewForm.setData('website', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Demo aangevraagd op</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.demo_aangevraagd_op}
                                    onChange={(e) => overviewForm.setData('demo_aangevraagd_op', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Demo gepland op</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.demo_gepland_op}
                                    onChange={(e) => overviewForm.setData('demo_gepland_op', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Proefperiode start</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.proefperiode_start}
                                    onChange={(e) => overviewForm.setData('proefperiode_start', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Actief vanaf</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.actief_vanaf}
                                    onChange={(e) => overviewForm.setData('actief_vanaf', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Opgezegd op</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.opgezegd_op}
                                    onChange={(e) => overviewForm.setData('opgezegd_op', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Verloren op</label>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.verloren_op}
                                    onChange={(e) => overviewForm.setData('verloren_op', e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600">Opzegreden</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    rows={2}
                                    value={overviewForm.data.opzegreden}
                                    onChange={(e) => overviewForm.setData('opzegreden', e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600">Verloren reden</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    rows={2}
                                    value={overviewForm.data.verloren_reden}
                                    onChange={(e) => overviewForm.setData('verloren_reden', e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600">Tags</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    rows={2}
                                    value={overviewForm.data.tags}
                                    onChange={(e) => overviewForm.setData('tags', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                disabled={overviewForm.processing}
                            >
                                {overviewForm.processing ? 'Opslaan...' : 'Opslaan'}
                            </button>
                        </div>
                    </form>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold">Welkomstmail</div>
                                <div className="mt-1 text-xs text-zinc-500">
                                    Concept op basis van template. Controleer, pas aan en verstuur handmatig.
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={refreshWelcome}
                                    disabled={!welcomeEmail}
                                >
                                    Concept vernieuwen
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={saveWelcome}
                                    disabled={!welcomeEmail}
                                >
                                    Concept opslaan
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                    onClick={sendWelcome}
                                    disabled={!welcomeEmail}
                                >
                                    Verstuur welkomstmail
                                </button>
                            </div>
                        </div>

                        {!welcomeEmail && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                                Welkomstmail is nog niet beschikbaar. Draai migraties en refresh deze pagina.
                            </div>
                        )}

                        {welcomeEmail && (
                            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
                                <div className="space-y-4 lg:col-span-4">
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                        <div className="text-xs font-medium text-zinc-500">Status</div>
                                        <div className="mt-2">
                                            <span
                                                className={cx(
                                                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                                                    welcomeStatusClass
                                                )}
                                            >
                                                {welcomeStatus}
                                            </span>
                                        </div>
                                        {welcomeEmail?.sent_at && (
                                            <div className="mt-2 text-xs text-zinc-500">
                                                Laatst verstuurd: {formatDateTime(welcomeEmail.sent_at)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                        <div className="text-xs font-semibold text-zinc-500">Ontvanger</div>
                                        <div className="mt-2 text-sm font-semibold">{welcomeEmail?.to_email || '-'}</div>
                                        <div className="mt-4 text-xs font-semibold text-zinc-500">Beschikbare velden</div>
                                        <div className="mt-2 space-y-1 text-xs text-zinc-600">
                                            {['{{ naam }}', '{{ bedrijfsnaam }}', '{{ loginnaam }}', '{{ wachtwoord }}', '{{ weblink }}'].map((token) => (
                                                <div key={token} className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono">
                                                    {token}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {!smtpConfigured && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                                            SMTP instellingen ontbreken. Voeg deze toe via profiel &gt; systeem-instellingen.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 lg:col-span-8">
                                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                        <div className="text-xs font-semibold text-zinc-500">Onderwerp</div>
                                        <input
                                            className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                            value={welcomeForm.data.subject}
                                            onChange={(e) => welcomeForm.setData('subject', e.target.value)}
                                        />
                                        {welcomeForm.errors.subject && (
                                            <div className="mt-1 text-xs text-rose-600">{welcomeForm.errors.subject}</div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                            <div className="text-xs font-semibold text-zinc-500">HTML template</div>
                                            <textarea
                                                className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                                rows={10}
                                                value={welcomeForm.data.body_html}
                                                onChange={(e) => welcomeForm.setData('body_html', e.target.value)}
                                            />
                                        </div>
                                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                            <div className="text-xs font-semibold text-zinc-500">Tekst template</div>
                                            <textarea
                                                className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                                rows={10}
                                                value={welcomeForm.data.body_text}
                                                onChange={(e) => welcomeForm.setData('body_text', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                        <div className="text-xs font-semibold text-zinc-500">Preview</div>
                                        {welcomeForm.data.body_html ? (
                                            <div
                                                className="prose prose-sm mt-3 max-w-none text-zinc-700"
                                                dangerouslySetInnerHTML={{ __html: welcomeForm.data.body_html }}
                                            />
                                        ) : welcomeForm.data.body_text ? (
                                            <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{welcomeForm.data.body_text}</pre>
                                        ) : (
                                            <div className="mt-3 text-sm text-zinc-600">
                                                Geen preview beschikbaar. Vul eerst login gegevens en vernieuw het concept.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

            {activeTab === 'klantpersonen' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Contactpersonen</div>
                            <div className="text-xs text-zinc-500">Meerdere contactpersonen per klant.</div>
                        </div>
                        <button
                            type="button"
                            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                            onClick={startPersonCreate}
                        >
                            Nieuwe contactpersoon
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Rol</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {persons.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                                            Nog geen contactpersonen.
                                        </td>
                                    </tr>
                                )}
                                {persons.map((person) => (
                                    <tr key={person.id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-semibold">
                                                {person.voornaam} {person.achternaam}
                                            </div>
                                            {person.is_primary && (
                                                <div className="mt-0.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                                    Primair
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">{person.rol || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>{person.email}</div>
                                            <div className="text-xs text-zinc-500">{person.telefoon || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{person.active ? 'Ja' : 'Nee'}</td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <button
                                                type="button"
                                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                                onClick={() => startPersonEdit(person)}
                                            >
                                                Bewerken
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                                                onClick={() => deletePerson(person.id)}
                                            >
                                                Verwijderen
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showPersonForm && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">
                                    {editingPersonId ? 'Contactpersoon bewerken' : 'Contactpersoon toevoegen'}
                                </div>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={cancelPerson}
                                >
                                    Annuleren
                                </button>
                            </div>

                            <form onSubmit={submitPerson} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Voornaam *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.voornaam}
                                        onChange={(e) => personForm.setData('voornaam', e.target.value)}
                                    />
                                    {personForm.errors.voornaam && (
                                        <div className="mt-1 text-xs text-rose-600">{personForm.errors.voornaam}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Achternaam *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.achternaam}
                                        onChange={(e) => personForm.setData('achternaam', e.target.value)}
                                    />
                                    {personForm.errors.achternaam && (
                                        <div className="mt-1 text-xs text-rose-600">{personForm.errors.achternaam}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">E-mail *</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.email}
                                        onChange={(e) => personForm.setData('email', e.target.value)}
                                    />
                                    {personForm.errors.email && (
                                        <div className="mt-1 text-xs text-rose-600">{personForm.errors.email}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Telefoon</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.telefoon}
                                        onChange={(e) => personForm.setData('telefoon', e.target.value)}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Rol</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.rol}
                                        onChange={(e) => personForm.setData('rol', e.target.value)}
                                        placeholder="bijv. eigenaar, administratie, monteur"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300"
                                        checked={personForm.data.is_primary}
                                        onChange={(e) => personForm.setData('is_primary', e.target.checked)}
                                    />
                                    <span className="text-sm">Primair</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300"
                                        checked={personForm.data.active}
                                        onChange={(e) => personForm.setData('active', e.target.checked)}
                                    />
                                    <span className="text-sm">Actief</span>
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                        disabled={personForm.processing}
                                    >
                                        {personForm.processing ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'demo_status' && (
                <div className="space-y-6">
                    <div>
                        <div className="text-sm font-semibold">Demo & status</div>
                        <div className="mt-1 text-xs text-zinc-500">Beheer statusflow en bijbehorende datums.</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-medium text-zinc-500">Huidige status</div>
                                <div className="mt-1 text-lg font-semibold">{garageCompany.status}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={() => setDemoStatus('demo_aangevraagd')}
                                >
                                    Naar demo aangevraagd
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={() => setDemoStatus('demo_gepland')}
                                >
                                    Naar demo gepland
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={() => setDemoStatus('proefperiode')}
                                >
                                    Naar proefperiode
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={() => setDemoStatus('actief')}
                                >
                                    Actief
                                </button>
                            </div>
                        </div>
                        {!hasActiveMandate && (
                            <div className="mt-3 text-xs text-amber-800">Let op: geen actief SEPA mandaat gekoppeld.</div>
                        )}
                    </div>

                    <form onSubmit={submitDemoDates} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Demo aangevraagd op</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_aangevraagd_op}
                                onChange={(e) => demoForm.setData('demo_aangevraagd_op', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Demo gepland op</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_gepland_op}
                                onChange={(e) => demoForm.setData('demo_gepland_op', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Demo duur (dagen)</label>
                            <input
                                type="number"
                                min="1"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_duur_dagen}
                                onChange={(e) => demoForm.setData('demo_duur_dagen', e.target.value)}
                            />
                            <div className="mt-1 text-xs text-zinc-500">Einddatum wordt automatisch berekend.</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Demo einddatum</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-200 bg-zinc-50 text-sm"
                                value={demoEndPreview}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Proefperiode start</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.proefperiode_start}
                                onChange={(e) => demoForm.setData('proefperiode_start', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600">Actief vanaf</label>
                            <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.actief_vanaf}
                                onChange={(e) => demoForm.setData('actief_vanaf', e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                disabled={demoForm.processing}
                            >
                                {demoForm.processing ? 'Opslaan...' : 'Datums opslaan'}
                            </button>
                        </div>
                    </form>

                    <form onSubmit={submitExtend} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="text-sm font-semibold">Demo verlengen</div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Verleng met (dagen)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={extendForm.data.demo_verleng_dagen}
                                    onChange={(e) => extendForm.setData('demo_verleng_dagen', e.target.value)}
                                />
                                {extendForm.errors.demo_verleng_dagen && (
                                    <div className="mt-1 text-xs text-rose-600">{extendForm.errors.demo_verleng_dagen}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600">Notitie (optioneel)</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={extendForm.data.demo_verleng_notitie}
                                    onChange={(e) => extendForm.setData('demo_verleng_notitie', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                disabled={extendForm.processing}
                            >
                                {extendForm.processing ? 'Bezig...' : 'Verleng demo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'incasso' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Incasso (SEPA mandaten)</div>
                            <div className="mt-1 text-xs text-zinc-500">0 of 1 actief mandaat per klant, historie blijft behouden.</div>
                        </div>
                        <button
                            type="button"
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            onClick={startMandateNew}
                        >
                            Nieuw mandaat
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Mandaat</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">IBAN</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Ontvangen</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {mandates.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                                            Nog geen mandaten.
                                        </td>
                                    </tr>
                                )}
                                {mandates.map((mandate) => (
                                    <tr key={mandate.id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-semibold">{mandate.mandaat_id}</div>
                                            <div className="text-xs text-zinc-500">{mandate.bedrijfsnaam}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{mandate.iban}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                                {mandate.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">
                                            {mandate.ontvangen_op ? formatDateTime(mandate.ontvangen_op) : '�'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <button
                                                type="button"
                                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                                onClick={() => startMandateEdit(mandate)}
                                            >
                                                Bewerken
                                            </button>
                                            <div className="mt-2 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'pending')}
                                                >
                                                    Pending
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'actief')}
                                                >
                                                    Actief
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'ingetrokken')}
                                                >
                                                    Ingetrokken
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showMandateForm && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">
                                    {editingMandateId ? 'Mandaat bewerken' : 'Nieuw mandaat'}
                                </div>
                                <button
                                    type="button"
                                    className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                                    onClick={cancelMandate}
                                >
                                    Sluiten
                                </button>
                            </div>

                            <form onSubmit={submitMandate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <input type="hidden" value={mandateForm.data.mandate_id || ''} />
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Bedrijfsnaam *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.bedrijfsnaam}
                                        onChange={(e) => mandateForm.setData('bedrijfsnaam', e.target.value)}
                                    />
                                    {mandateForm.errors.bedrijfsnaam && (
                                        <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.bedrijfsnaam}</div>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Voor- en achternaam *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.voor_en_achternaam}
                                        onChange={(e) => mandateForm.setData('voor_en_achternaam', e.target.value)}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Straat + nummer *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.straatnaam_en_nummer}
                                        onChange={(e) => mandateForm.setData('straatnaam_en_nummer', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Postcode *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.postcode}
                                        onChange={(e) => mandateForm.setData('postcode', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Plaats *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.plaats}
                                        onChange={(e) => mandateForm.setData('plaats', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Land</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.land}
                                        onChange={(e) => mandateForm.setData('land', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">IBAN *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.iban}
                                        onChange={(e) => mandateForm.setData('iban', e.target.value)}
                                    />
                                    {mandateForm.errors.iban && (
                                        <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.iban}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">BIC</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.bic}
                                        onChange={(e) => mandateForm.setData('bic', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">E-mail *</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.email}
                                        onChange={(e) => mandateForm.setData('email', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Telefoon *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.telefoonnummer}
                                        onChange={(e) => mandateForm.setData('telefoonnummer', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Plaats van tekenen *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.plaats_van_tekenen}
                                        onChange={(e) => mandateForm.setData('plaats_van_tekenen', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Datum van tekenen *</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.datum_van_tekenen}
                                        onChange={(e) => mandateForm.setData('datum_van_tekenen', e.target.value)}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="text-xs font-semibold text-zinc-500">Ondertekening (typed naam)</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Ondertekenaar naam</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.ondertekenaar_naam}
                                        onChange={(e) => mandateForm.setData('ondertekenaar_naam', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300"
                                        checked={mandateForm.data.akkoord_checkbox}
                                        onChange={(e) => mandateForm.setData('akkoord_checkbox', e.target.checked)}
                                    />
                                    <span className="text-sm">Akkoord</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Akkoord op</label>
                                    <input
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.akkoord_op}
                                        onChange={(e) => mandateForm.setData('akkoord_op', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Ontvangen op</label>
                                    <input
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.ontvangen_op}
                                        onChange={(e) => mandateForm.setData('ontvangen_op', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Status</label>
                                    <select
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.status}
                                        onChange={(e) => mandateForm.setData('status', e.target.value)}
                                    >
                                        {['pending', 'actief', 'ingetrokken'].map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="sm:col-span-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                        onClick={cancelMandate}
                                    >
                                        Annuleren
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                        disabled={mandateForm.processing}
                                    >
                                        {mandateForm.processing ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'modules' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Modules & prijzen</div>
                            <div className="mt-1 text-xs text-zinc-500">Aantallen, prijzen en btw per module.</div>
                        </div>
                        <button
                            type="button"
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            onClick={submitModules}
                            disabled={moduleForm.processing}
                        >
                            {moduleForm.processing ? 'Opslaan...' : 'Opslaan'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Actieve modules</div>
                            <div className="mt-1 text-xl font-semibold">
                                {moduleTotalsLive.actieveModules} / {moduleTotalsLive.totaleModules}
                            </div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal excl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(moduleTotalsLive.totaalExcl)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">BTW</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(moduleTotalsLive.btw)}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-medium text-zinc-500">Totaal incl. btw</div>
                            <div className="mt-1 text-xl font-semibold">{formatEuro(moduleTotalsLive.totaalIncl)}</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                        Totaal: {formatEuro(moduleTotalsLive.totaalExcl)} excl. btw � BTW {formatEuro(moduleTotalsLive.btw)} �{' '}
                        {formatEuro(moduleTotalsLive.totaalIncl)} incl. btw
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Module</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Aantal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Prijs (excl. btw)</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">BTW %</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Subtotaal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {moduleForm.data.rows.map((row, index) => {
                                    const effectiveAantal = Math.max(1, Number(row.aantal || 1));
                                    const subtotal = numberValue(row.prijs_maand_excl) * effectiveAantal;
                                    const aantalError = moduleForm.errors[`rows.${index}.aantal`];
                                    const prijsError = moduleForm.errors[`rows.${index}.prijs_maand_excl`];
                                    const btwError = moduleForm.errors[`rows.${index}.btw_percentage`];

                                    return (
                                        <tr key={row.module_id} className={row.actief ? '' : 'bg-zinc-50/60'}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-zinc-300"
                                                    checked={!!row.actief}
                                                    onChange={() => toggleModule(index)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{row.naam}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-24 rounded-md border-zinc-300 text-sm"
                                                    value={row.aantal}
                                                    onChange={(e) => updateModuleRow(index, 'aantal', e.target.value)}
                                                />
                                                {aantalError && <div className="mt-1 text-xs text-rose-600">{aantalError}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-28 rounded-md border-zinc-300 text-sm"
                                                    value={row.prijs_maand_excl}
                                                    onChange={(e) => updateModuleRow(index, 'prijs_maand_excl', e.target.value)}
                                                />
                                                {prijsError && <div className="mt-1 text-xs text-rose-600">{prijsError}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    className="w-20 rounded-md border-zinc-300 text-sm"
                                                    value={row.btw_percentage}
                                                    onChange={(e) => updateModuleRow(index, 'btw_percentage', e.target.value)}
                                                />
                                                {btwError && <div className="mt-1 text-xs text-rose-600">{btwError}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-700">{row.actief ? formatEuro(subtotal) : '�'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'gebruikers' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Gebruikers</div>
                            <div className="mt-1 text-xs text-zinc-500">Accounts binnen deze garage.</div>
                        </div>
                        <button
                            type="button"
                            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                            onClick={startSeatCreate}
                        >
                            Nieuwe gebruiker
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <table className="min-w-full divide-y divide-zinc-100">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Naam</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">E-mail</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Rol</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Actief</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600">Aangemaakt</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {seats.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600">
                                            Nog geen gebruikers.
                                        </td>
                                    </tr>
                                )}
                                {seats.map((seat) => (
                                    <tr key={seat.id} className="hover:bg-zinc-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{seat.naam}</td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">{seat.email}</td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">{seat.rol_in_kivii || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{seat.actief ? 'Ja' : 'Nee'}</td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">{formatDate(seat.aangemaakt_op)}</td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <button
                                                type="button"
                                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                                                onClick={() => startSeatEdit(seat)}
                                            >
                                                Bewerken
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                                                onClick={() => deleteSeat(seat.id)}
                                            >
                                                Verwijderen
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showSeatForm && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">
                                    {editingSeatId ? 'Gebruiker bewerken' : 'Gebruiker toevoegen'}
                                </div>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={cancelSeat}
                                >
                                    Annuleren
                                </button>
                            </div>

                            <form onSubmit={submitSeat} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Naam *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.naam}
                                        onChange={(e) => seatForm.setData('naam', e.target.value)}
                                    />
                                    {seatForm.errors.naam && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.naam}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">E-mail *</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.email}
                                        onChange={(e) => seatForm.setData('email', e.target.value)}
                                    />
                                    {seatForm.errors.email && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.email}</div>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600">Rol</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.rol_in_kivii}
                                        onChange={(e) => seatForm.setData('rol_in_kivii', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Aangemaakt op</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.aangemaakt_op}
                                        onChange={(e) => seatForm.setData('aangemaakt_op', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300"
                                        checked={seatForm.data.actief}
                                        onChange={(e) => seatForm.setData('actief', e.target.checked)}
                                    />
                                    <span className="text-sm">Actief</span>
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                        disabled={seatForm.processing}
                                    >
                                        {seatForm.processing ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'timeline' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <div className="rounded-xl border border-zinc-200 bg-white p-5">
                            <div className="text-sm font-semibold">Nieuwe notitie</div>
                            <form onSubmit={submitNote} className="mt-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Titel</label>
                                    <input
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={noteForm.data.titel}
                                        onChange={(e) => noteForm.setData('titel', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600">Notitie</label>
                                    <textarea
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        rows={4}
                                        value={noteForm.data.inhoud}
                                        onChange={(e) => noteForm.setData('inhoud', e.target.value)}
                                    />
                                    {noteForm.errors.inhoud && (
                                        <div className="mt-1 text-xs text-rose-600">{noteForm.errors.inhoud}</div>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                        disabled={noteForm.processing}
                                    >
                                        {noteForm.processing ? 'Opslaan...' : 'Notitie toevoegen'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="space-y-4">
                            {activities.data.length === 0 && (
                                <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
                                    Nog geen activiteiten.
                                </div>
                            )}
                            {activities.data.map((activity) => (
                                <div key={activity.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold">{activity.titel}</div>
                                            <div className="mt-1 text-xs text-zinc-500">
                                                {activity.type ? activity.type.replace('_', ' ') : 'Activiteit'} �{' '}
                                                {formatDateTime(activity.created_at)}
                                            </div>
                                        </div>
                                        {activity.creator && <div className="text-xs font-semibold text-zinc-500">{activity.creator.name}</div>}
                                    </div>
                                    {activity.inhoud && <div className="mt-3 text-sm text-zinc-700">{activity.inhoud}</div>}
                                    {(activity.due_at || activity.done_at) && (
                                        <div className="mt-3 text-xs text-zinc-500">
                                            {activity.due_at && `Gepland: ${formatDateTime(activity.due_at)}`}
                                            {activity.done_at && ` � Afgerond: ${formatDateTime(activity.done_at)}`}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Pagination links={activities.links} />
                    </div>
                </div>
            )}

            {activeTab === 'taken_afspraken' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <div className="rounded-xl border border-zinc-200 bg-white p-5">
                                <div className="text-sm font-semibold">Nieuwe taak / afspraak</div>
                                <form onSubmit={submitTask} className="mt-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600">Type</label>
                                        <select
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.type}
                                            onChange={(e) => taskForm.setData('type', e.target.value)}
                                        >
                                            <option value="taak">Taak</option>
                                            <option value="afspraak">Afspraak</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600">Titel</label>
                                        <input
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.titel}
                                            onChange={(e) => taskForm.setData('titel', e.target.value)}
                                        />
                                        {taskForm.errors.titel && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.titel}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600">Omschrijving</label>
                                        <textarea
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            rows={3}
                                            value={taskForm.data.inhoud}
                                            onChange={(e) => taskForm.setData('inhoud', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600">Planning</label>
                                        <input
                                            type="datetime-local"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.due_at}
                                            onChange={(e) => taskForm.setData('due_at', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-zinc-300"
                                            checked={taskForm.data.createReminder}
                                            onChange={(e) => taskForm.setData('createReminder', e.target.checked)}
                                        />
                                        <span className="text-sm">Reminder instellen</span>
                                    </div>
                                    {taskForm.data.createReminder && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600">Reminder tijd</label>
                                                <input
                                                    type="datetime-local"
                                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                    value={taskForm.data.remind_at}
                                                    onChange={(e) => taskForm.setData('remind_at', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600">Kanaal</label>
                                                <select
                                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                    value={taskForm.data.channel}
                                                    onChange={(e) => taskForm.setData('channel', e.target.value)}
                                                >
                                                    {reminderChannels.map((channel) => (
                                                        <option key={channel} value={channel}>
                                                            {channel}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                            disabled={taskForm.processing}
                                        >
                                            {taskForm.processing ? 'Opslaan...' : 'Opslaan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-2">
                            <div>
                                <div className="text-sm font-semibold">Open taken</div>
                                <div className="mt-3 space-y-3">
                                    {tasks.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
                                            Geen open taken.
                                        </div>
                                    )}
                                    {tasks.map((task) => (
                                        <div key={task.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold">{task.titel}</div>
                                                    {task.inhoud && <div className="mt-1 text-xs text-zinc-500">{task.inhoud}</div>}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => markDone(task.id)}
                                                >
                                                    Afgerond
                                                </button>
                                            </div>
                                            {task.due_at && (
                                                <div className="mt-2 text-xs text-zinc-500">Planning: {formatDateTime(task.due_at)}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-semibold">Open afspraken</div>
                                <div className="mt-3 space-y-3">
                                    {appointments.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
                                            Geen open afspraken.
                                        </div>
                                    )}
                                    {appointments.map((appointment) => (
                                        <div key={appointment.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold">{appointment.titel}</div>
                                                    {appointment.inhoud && (
                                                        <div className="mt-1 text-xs text-zinc-500">{appointment.inhoud}</div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => markDone(appointment.id)}
                                                >
                                                    Afgerond
                                                </button>
                                            </div>
                                            {appointment.due_at && (
                                                <div className="mt-2 text-xs text-zinc-500">Planning: {formatDateTime(appointment.due_at)}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

