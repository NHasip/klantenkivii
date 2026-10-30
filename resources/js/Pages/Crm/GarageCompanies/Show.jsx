import React, { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import StatusBadge, { FOCUS_SCOPE, translateStatusText } from '../../../components/StatusBadge';

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

function pad2(value) {
    return String(value).padStart(2, '0');
}

// Lokale datum/tijd voor date/datetime-local inputs (toISOString geeft UTC en verschuift de tijd).
function toLocalDateInput(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalDateTimeInput(date) {
    return `${toLocalDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Datumvelden zonder betekenisvolle tijd: toon alleen de datum.
function toDateOnly(value) {
    return value ? String(value).slice(0, 10) : '';
}

// Bewaar de oorspronkelijke waarde (incl. tijd) als de datum niet is gewijzigd, zodat bestaande data intact blijft.
function keepOriginalIfSameDate(value, original) {
    if (value && original && String(original).slice(0, 10) === value) return original;
    return value;
}

const DATE_ONLY_FIELDS = ['proefperiode_start', 'actief_vanaf', 'opgezegd_op', 'verloren_op'];

function roleLabel(value) {
    if (!value) return '-';
    const text = String(value).trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

const SOURCE_LABELS = {
    website_formulier: 'Websiteformulier',
    telefoon: 'Telefoon',
    email: 'E-mail',
    referral: 'Doorverwijzing',
    anders: 'Anders',
};

const MANDATE_STATUS_LABELS = {
    pending: 'In afwachting',
    actief: 'Actief',
    ingetrokken: 'Ingetrokken',
};

const MANDATE_STATUS_CLASSES = {
    pending: 'bg-amber-50 text-amber-700',
    actief: 'bg-emerald-50 text-emerald-700',
    ingetrokken: 'bg-zinc-100 text-zinc-700',
};

const WELCOME_STATUS_LABELS = {
    draft: 'Concept',
    concept: 'Concept',
    sent: 'Verstuurd',
    failed: 'Mislukt',
};

const CHANNEL_LABELS = {
    popup: 'Pop-up',
    email: 'E-mail',
    beide: 'Pop-up en e-mail',
};

const ACTIVITY_TYPE_LABELS = {
    status_wijziging: 'Statuswijziging',
    notitie: 'Notitie',
    taak: 'Taak',
    afspraak: 'Afspraak',
    demo: 'Demo',
    mandate: 'Mandaat',
    module: 'Module',
    systeem: 'Systeem',
};

function scrollToForm(id) {
    window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function numberValue(value) {
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

function ToolbarButton({ active, disabled, onClick, children, title }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active === undefined ? undefined : Boolean(active)}
            onClick={onClick}
            disabled={disabled}
            className={cx(
                'rounded-md px-2 py-1 text-xs font-semibold transition',
                active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                disabled && 'cursor-not-allowed opacity-40'
            )}
        >
            {children}
        </button>
    );
}

function Pagination({ links, lastPage }) {
    if (!links || links.length <= 1) return null;
    if (lastPage !== undefined && lastPage !== null && Number(lastPage) <= 1) return null;

    return (
        <nav aria-label="Paginering" className="mt-6 flex flex-wrap gap-2">
            {links.map((link, idx) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${idx}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={cx(
                            'rounded-md border px-3 py-1.5 text-sm',
                            link.active
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        )}
                        preserveScroll
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${idx}`}
                        aria-disabled="true"
                        className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 opacity-50"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            )}
        </nav>
    );
}

const TABS = [
    { key: 'overzicht', label: 'Overzicht' },
    { key: 'klantpersonen', label: 'Contactpersonen' },
    { key: 'demo_status', label: 'Demo & status' },
    { key: 'incasso', label: 'Incasso' },
    { key: 'modules', label: 'Modules & prijzen' },
    { key: 'gebruikers', label: 'Gebruikers' },
    { key: 'timeline', label: 'Notities en tijdlijn' },
    { key: 'taken_afspraken', label: 'Klantafspraken' },
];

export default function Show({
    garageCompany,
    tab,
    statusOptions,
    statusLabels,
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
    emailTemplates,
    smtpConfigured,
    incasso,
    urls,
}) {
    const welcomeEmailSent = Boolean(welcomeEmail && (welcomeEmail.status === 'sent' || welcomeEmail.sent_at));
    // Welkomstmail is a one-time onboarding action: show the tab until it has been
    // sent, then hide it for existing customers.
    const showWelcomeTab = !welcomeEmailSent;
    const requestedTab = tab || 'overzicht';
    const activeTab = requestedTab === 'welkomst' && !showWelcomeTab ? 'overzicht' : requestedTab;
    const visibleTabs = showWelcomeTab ? [...TABS, { key: 'welkomst', label: 'Welkomstmail' }] : TABS;
    const confirm = useConfirm();
    const safeStatusLabels = statusLabels && typeof statusLabels === 'object' ? statusLabels : {};
    const normalizeStatus = (value) => {
        if (value === 'lead') return 'demo_aangevraagd';
        if (value === 'demo_gepland') return 'proefperiode';
        return value;
    };
    const statusLabel = (value) => safeStatusLabels[value] || value;
    const normalizedCompanyStatus = normalizeStatus(garageCompany.status || statusOptions?.[0] || 'demo_aangevraagd');

    const deleteCompany = async () => {
        const ok = await confirm({
            title: 'Naar prullenbak',
            message: `Weet je zeker dat je "${garageCompany.bedrijfsnaam}" naar de prullenbak wilt verplaatsen?`,
            confirmText: 'Verplaats',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.delete(urls.delete_company);
    };

    const overviewForm = useForm({
        bedrijfsnaam: garageCompany.bedrijfsnaam || '',
        primary_voornaam: garageCompany.primary_person?.voornaam || '',
        primary_achternaam: garageCompany.primary_person?.achternaam || '',
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
        login_password: '',
        status: normalizedCompanyStatus,
        bron: garageCompany.bron || sourceOptions?.[0],
        tags: garageCompany.tags || '',
        demo_aangevraagd_op: garageCompany.demo_aangevraagd_op || '',
        demo_gepland_op: garageCompany.demo_gepland_op || '',
        proefperiode_start: toDateOnly(garageCompany.proefperiode_start),
        actief_vanaf: toDateOnly(garageCompany.actief_vanaf),
        opgezegd_op: toDateOnly(garageCompany.opgezegd_op),
        opzegreden: garageCompany.opzegreden || '',
        verloren_op: toDateOnly(garageCompany.verloren_op),
        verloren_reden: garageCompany.verloren_reden || '',
    });

    const withOriginalTimes = (data) => {
        const next = { ...data };
        DATE_ONLY_FIELDS.forEach((field) => {
            if (field in next) next[field] = keepOriginalIfSameDate(next[field], garageCompany[field]);
        });
        return next;
    };

    // Status wijzig je alleen via tab "Demo & status"; Overzicht stuurt de huidige status ongewijzigd mee.
    const submitOverview = (event) => {
        event.preventDefault();
        overviewForm.transform((data) => ({ ...withOriginalTimes(data), status: normalizedCompanyStatus }));
        overviewForm.patch(urls.update_overview, {
            preserveScroll: true,
            onSuccess: () => overviewForm.reset('login_password'),
        });
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
        scrollToForm('person-form');
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
        scrollToForm('person-form');
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
            personForm.patch(url, { preserveScroll: true, onSuccess: cancelPerson });
        } else {
            personForm.post(urls.store_person, { preserveScroll: true, onSuccess: cancelPerson });
        }
    };

    const deletePerson = async (personId) => {
        const ok = await confirm({
            title: 'Contactpersoon verwijderen',
            message: 'Weet je zeker dat je deze contactpersoon wilt verwijderen?',
            confirmText: 'Verwijder',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
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
        moduleForm.setData(
            'rows',
            moduleForm.data.rows.map((row, i) => {
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
        scrollToForm('seat-form');
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
        scrollToForm('seat-form');
    };

    const cancelSeat = () => {
        setEditingSeatId(null);
        setShowSeatForm(false);
        seatForm.clearErrors();
    };

    const submitSeat = (event) => {
        event.preventDefault();
        if (editingSeatId) {
            seatForm.patch(urls.update_seat.replace('__SEAT__', editingSeatId), { preserveScroll: true, onSuccess: cancelSeat });
        } else {
            seatForm.post(urls.store_seat, { preserveScroll: true, onSuccess: cancelSeat });
        }
    };

    const deleteSeat = async (seatId) => {
        const ok = await confirm({
            title: 'Gebruiker verwijderen',
            message: 'Weet je zeker dat je deze gebruiker wilt verwijderen?',
            confirmText: 'Verwijder',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.delete(urls.delete_seat.replace('__SEAT__', seatId), { preserveScroll: true });
    };

    const demoForm = useForm({
        demo_aangevraagd_op: garageCompany.demo_aangevraagd_op || '',
        demo_gepland_op: garageCompany.demo_gepland_op || '',
        demo_duur_dagen: garageCompany.demo_duur_dagen || '',
        proefperiode_start: toDateOnly(garageCompany.proefperiode_start),
        actief_vanaf: toDateOnly(garageCompany.actief_vanaf),
    });

    const demoEndPreview = useMemo(() => {
        if (demoForm.data.demo_aangevraagd_op && demoForm.data.demo_duur_dagen) {
            const date = new Date(demoForm.data.demo_aangevraagd_op);
            if (!Number.isNaN(date.getTime())) {
                date.setDate(date.getDate() + Number(demoForm.data.demo_duur_dagen));
                return toLocalDateTimeInput(date);
            }
        }
        return garageCompany.demo_eind_op || '';
    }, [demoForm.data.demo_aangevraagd_op, demoForm.data.demo_duur_dagen, garageCompany.demo_eind_op]);

    const submitDemoDates = (event) => {
        event.preventDefault();
        demoForm.transform((data) => withOriginalTimes(data));
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

    const statusForm = useForm({
        status: normalizedCompanyStatus,
    });

    useEffect(() => {
        statusForm.setData('status', normalizedCompanyStatus);
    }, [garageCompany.status]);

    const setDemoStatus = (status) => {
        router.patch(
            urls.set_demo_status,
            { status },
            {
                preserveScroll: true,
                preserveState: false,
            }
        );
    };

    const submitDemoStatus = async (event) => {
        event.preventDefault();
        if (['opgezegd', 'verloren'].includes(statusForm.data.status)) {
            const ok = await confirm({
                title: 'Status wijzigen',
                message: 'Weet je het zeker? Dit wordt vastgelegd in de tijdlijn.',
                confirmText: 'Doorgaan',
                cancelText: 'Annuleren',
                tone: 'danger',
            });
            if (!ok) return;
        }
        statusForm.patch(urls.set_demo_status, {
            preserveScroll: true,
            preserveState: false,
        });
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
            datum_van_tekenen: toLocalDateInput(new Date()),
            ondertekenaar_naam: '',
            akkoord_checkbox: false,
            akkoord_op: '',
            status: 'pending',
            ontvangen_op: toLocalDateTimeInput(new Date()),
            incasso_kenmerk_machtiging: incasso?.kenmerk_machtiging || '',
            incasso_formulier: null,
        };
    };

    const mandateForm = useForm(blankMandate());

    const startMandateNew = () => {
        setEditingMandateId(null);
        setShowMandateForm(true);
        mandateForm.setData(blankMandate());
        mandateForm.clearErrors();
        scrollToForm('mandate-form');
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
            incasso_kenmerk_machtiging: incasso?.kenmerk_machtiging || '',
            incasso_formulier: null,
        });
        mandateForm.clearErrors();
        scrollToForm('mandate-form');
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
            forceFormData: true,
            onSuccess: () => setShowMandateForm(false),
        });
    };

    const setMandateStatus = async (mandateId, status) => {
        if (status === 'ingetrokken') {
            const ok = await confirm({
                title: 'Mandaat intrekken',
                message: 'Weet je zeker dat je dit SEPA mandaat wilt intrekken? Er wordt dan niet meer op dit mandaat geïncasseerd.',
                confirmText: 'Intrekken',
                cancelText: 'Annuleren',
                tone: 'danger',
            });
            if (!ok) return;
        }
        router.patch(urls.set_mandate_status.replace('__MANDATE__', mandateId), { status }, { preserveScroll: true });
    };

    const activeMandate = mandates.find((mandate) => mandate.status === 'actief') || null;
    const incassoOmschrijvingPreview = (() => {
        try {
            const now = new Date();
            const maand = new Intl.DateTimeFormat('nl-NL', { month: 'long' }).format(now);
            const jaar = new Intl.DateTimeFormat('nl-NL', { year: 'numeric' }).format(now);
            return `Kivii abonnement ${maand} ${jaar}`;
        } catch {
            return 'Kivii abonnement';
        }
    })();

    const nowDate = new Date();
    const exportForm = useForm({
        maand: String(nowDate.getMonth() + 1),
        jaar: String(nowDate.getFullYear()),
        uitvoerdatum: toLocalDateInput(nowDate),
    });

    const maandOpties = [
        { value: '1', label: 'januari' },
        { value: '2', label: 'februari' },
        { value: '3', label: 'maart' },
        { value: '4', label: 'april' },
        { value: '5', label: 'mei' },
        { value: '6', label: 'juni' },
        { value: '7', label: 'juli' },
        { value: '8', label: 'augustus' },
        { value: '9', label: 'september' },
        { value: '10', label: 'oktober' },
        { value: '11', label: 'november' },
        { value: '12', label: 'december' },
    ];

    const jaarOpties = [];
    for (let i = nowDate.getFullYear() - 1; i <= nowDate.getFullYear() + 2; i += 1) {
        jaarOpties.push(String(i));
    }

    const exportIncasso = () => {
        const query = new URLSearchParams({
            maand: exportForm.data.maand,
            jaar: exportForm.data.jaar,
            uitvoerdatum: exportForm.data.uitvoerdatum,
        });
        window.location.href = `${urls.export_incasso_batch}?${query.toString()}`;
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
        to_email: welcomeEmail?.to_email || '',
        template_id: welcomeEmail?.template_id || null,
    });

    useEffect(() => {
        welcomeForm.setData({
            subject: welcomeEmail?.subject || '',
            body_html: welcomeEmail?.body_html || '',
            to_email: welcomeEmail?.to_email || '',
            template_id: welcomeEmail?.template_id || null,
        });
    }, [
        welcomeEmail?.id,
        welcomeEmail?.subject,
        welcomeEmail?.body_html,
        welcomeEmail?.to_email,
        welcomeEmail?.template_id,
    ]);

    useEffect(() => {
        if (welcomeEmail?.template_id) {
            setSelectedTemplateId(welcomeEmail.template_id);
        }
    }, [welcomeEmail?.template_id]);

    const templates = emailTemplates ?? [];
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(welcomeEmail?.template_id ?? null);
    const [pendingSend, setPendingSend] = useState(false);

    const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;

    const welcomeEditor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            LinkExtension.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
            }),
            Placeholder.configure({
                placeholder: 'Typ hier je welkomstmail...',
            }),
        ],
        content: welcomeForm.data.body_html || '<p></p>',
        editorProps: {
            attributes: {
                'aria-label': 'Inhoud welkomstmail',
                role: 'textbox',
                'aria-multiline': 'true',
            },
        },
        onUpdate: ({ editor }) => {
            welcomeForm.setData('body_html', editor.getHTML());
        },
    });

    useEffect(() => {
        if (!welcomeEditor) return;
        const nextHtml = welcomeForm.data.body_html?.trim() ? welcomeForm.data.body_html : '<p></p>';
        if (welcomeEditor.getHTML() !== nextHtml) {
            welcomeEditor.commands.setContent(nextHtml, false);
        }
    }, [welcomeEditor, welcomeForm.data.body_html]);

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

    const confirmSendWelcome = async (draftOverride = null) => {
        if (!welcomeEmail) return;
        if (!smtpConfigured) {
            await confirm({
                title: 'SMTP ontbreekt',
                message: 'SMTP instellingen ontbreken. Voeg deze toe via profiel > systeem-instellingen.',
                confirmText: 'Sluiten',
                showCancel: false,
                tone: 'primary',
            });
            return;
        }
        const ok = await confirm({
            title: 'Welkomstmail versturen',
            message: 'Weet je zeker dat je de welkomstmail wilt versturen?',
            confirmText: 'Verstuur',
            cancelText: 'Annuleren',
            tone: 'success',
        });
        if (!ok) return;
        const payload = draftOverride || {
            subject: welcomeForm.data.subject,
            body_html: welcomeForm.data.body_html,
            to_email: welcomeForm.data.to_email,
            template_id: welcomeForm.data.template_id,
        };
        welcomeForm.clearErrors();
        router.post(urls.update_welcome_email, payload, {
            preserveScroll: true,
            onError: (errors) => welcomeForm.setError(errors),
            onSuccess: () => {
                router.post(urls.send_welcome_email, {}, { preserveScroll: true });
            },
        });
    };

    const applyTemplate = (template, { close = true, send = false } = {}) => {
        if (!template) return;
        welcomeForm.setData('subject', template.subject);
        welcomeForm.setData('body_html', template.body_html);
        welcomeForm.setData('template_id', template.id);
        if (welcomeEditor) {
            welcomeEditor.commands.setContent(template.body_html || '<p></p>', false);
        }
        setSelectedTemplateId(template.id);
        if (close) setTemplatePickerOpen(false);
        if (send) {
            confirmSendWelcome({
                subject: template.subject || '',
                body_html: template.body_html || '',
                to_email: welcomeForm.data.to_email,
                template_id: template.id,
            });
        }
    };

    useEffect(() => {
        if (!templatePickerOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setTemplatePickerOpen(false);
                setPendingSend(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [templatePickerOpen]);

    const openTemplatePicker = (sendAfter = false) => {
        if (!templates.length) {
            if (sendAfter) {
                confirmSendWelcome();
            }
            return;
        }
        setPendingSend(sendAfter);
        setTemplatePickerOpen(true);
    };

    return (
        <div className={cx('space-y-6', FOCUS_SCOPE)}>
            <Head title={garageCompany.bedrijfsnaam} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-semibold text-zinc-900">{garageCompany.bedrijfsnaam}</h1>
                        <StatusBadge status={normalizedCompanyStatus} labels={safeStatusLabels} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">Klantdossier en modules</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                        href={urls.index}
                        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-semibold hover:bg-zinc-50 sm:w-auto"
                    >
                        Terug naar overzicht
                    </Link>
                </div>
            </div>

            <div className="-mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2 px-1">
                    {visibleTabs.map((item) => (
                        <Link
                            key={item.key}
                            href={`${urls.show}?tab=${item.key}`}
                            aria-current={activeTab === item.key ? 'page' : undefined}
                            className={cx(
                                'whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold',
                                activeTab === item.key
                                    ? 'border-zinc-900 bg-zinc-900 text-white'
                                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
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

                    <div className="flex justify-stretch sm:justify-end">
                        <Link
                            href={`${urls.show}?tab=modules`}
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-semibold hover:bg-zinc-50 sm:w-auto"
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
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-bedrijfsnaam">Bedrijfsnaam *</label>
                                <input
                                    id="overviewForm-bedrijfsnaam"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.bedrijfsnaam}
                                    onChange={(e) => overviewForm.setData('bedrijfsnaam', e.target.value)}
                                />
                                {overviewForm.errors.bedrijfsnaam && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.bedrijfsnaam}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-primary-voornaam">Voornaam *</label>
                                <input
                                    id="overviewForm-primary-voornaam"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.primary_voornaam}
                                    onChange={(e) => overviewForm.setData('primary_voornaam', e.target.value)}
                                />
                                {overviewForm.errors.primary_voornaam && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.primary_voornaam}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-primary-achternaam">Achternaam *</label>
                                <input
                                    id="overviewForm-primary-achternaam"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.primary_achternaam}
                                    onChange={(e) => overviewForm.setData('primary_achternaam', e.target.value)}
                                />
                                {overviewForm.errors.primary_achternaam && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.primary_achternaam}</div>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-bron">Bron</label>
                                <select
                                    id="overviewForm-bron"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.bron}
                                    onChange={(e) => overviewForm.setData('bron', e.target.value)}
                                >
                                    {sourceOptions.map((source) => (
                                        <option key={source} value={source}>
                                            {SOURCE_LABELS[source] || source}
                                        </option>
                                    ))}
                                </select>
                                {overviewForm.errors.bron && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.bron}</div>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-hoofd-email">Hoofd e-mail *</label>
                                <input
                                    id="overviewForm-hoofd-email"
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
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-hoofd-telefoon">Hoofd telefoon *</label>
                                <input
                                    id="overviewForm-hoofd-telefoon"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.hoofd_telefoon}
                                    onChange={(e) => overviewForm.setData('hoofd_telefoon', e.target.value)}
                                />
                                {overviewForm.errors.hoofd_telefoon && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.hoofd_telefoon}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-login-email">Login e-mail</label>
                                <input
                                    id="overviewForm-login-email"
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
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-login-password">Nieuw login wachtwoord</label>
                                <input
                                    id="overviewForm-login-password"
                                    type="password"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.login_password}
                                    onChange={(e) => overviewForm.setData('login_password', e.target.value)}
                                />
                                {overviewForm.errors.login_password && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.login_password}</div>
                                )}
                                <div className="mt-1 text-[11px] text-zinc-500">
                                    Huidig wachtwoord wordt nooit getoond. Laat leeg om ongewijzigd te laten.
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-adres-straat-nummer">Adres</label>
                                <input
                                    id="overviewForm-adres-straat-nummer"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.adres_straat_nummer}
                                    onChange={(e) => overviewForm.setData('adres_straat_nummer', e.target.value)}
                                />
                                {overviewForm.errors.adres_straat_nummer && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.adres_straat_nummer}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-postcode">Postcode</label>
                                <input
                                    id="overviewForm-postcode"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.postcode}
                                    onChange={(e) => overviewForm.setData('postcode', e.target.value)}
                                />
                                {overviewForm.errors.postcode && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.postcode}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-plaats">Plaats *</label>
                                <input
                                    id="overviewForm-plaats"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.plaats}
                                    onChange={(e) => overviewForm.setData('plaats', e.target.value)}
                                />
                                {overviewForm.errors.plaats && (
                                    <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.plaats}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-land">Land</label>
                                <input
                                    id="overviewForm-land"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.land}
                                    onChange={(e) => overviewForm.setData('land', e.target.value)}
                                />
                                {overviewForm.errors.land && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.land}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-website">Website</label>
                                <input
                                    id="overviewForm-website"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.website}
                                    onChange={(e) => overviewForm.setData('website', e.target.value)}
                                />
                                {overviewForm.errors.website && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.website}</div>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-kvk-nummer">KVK nummer</label>
                                <input
                                    id="overviewForm-kvk-nummer"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.kvk_nummer}
                                    onChange={(e) => overviewForm.setData('kvk_nummer', e.target.value)}
                                />
                                {overviewForm.errors.kvk_nummer && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.kvk_nummer}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-btw-nummer">BTW nummer</label>
                                <input
                                    id="overviewForm-btw-nummer"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.btw_nummer}
                                    onChange={(e) => overviewForm.setData('btw_nummer', e.target.value)}
                                />
                                {overviewForm.errors.btw_nummer && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.btw_nummer}</div>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-demo-aangevraagd-op">Demo aangevraagd op</label>
                                <input
                                    id="overviewForm-demo-aangevraagd-op"
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.demo_aangevraagd_op}
                                    onChange={(e) => overviewForm.setData('demo_aangevraagd_op', e.target.value)}
                                />
                                {overviewForm.errors.demo_aangevraagd_op && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.demo_aangevraagd_op}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-demo-gepland-op">Demo gepland op</label>
                                <input
                                    id="overviewForm-demo-gepland-op"
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.demo_gepland_op}
                                    onChange={(e) => overviewForm.setData('demo_gepland_op', e.target.value)}
                                />
                                {overviewForm.errors.demo_gepland_op && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.demo_gepland_op}</div>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-proefperiode-start">Demo start</label>
                                <input
                                    id="overviewForm-proefperiode-start"
                                    type="date"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.proefperiode_start}
                                    onChange={(e) => overviewForm.setData('proefperiode_start', e.target.value)}
                                />
                                {overviewForm.errors.proefperiode_start && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.proefperiode_start}</div>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-actief-vanaf">Actief vanaf</label>
                                <input
                                    id="overviewForm-actief-vanaf"
                                    type="date"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={overviewForm.data.actief_vanaf}
                                    onChange={(e) => overviewForm.setData('actief_vanaf', e.target.value)}
                                />
                                {overviewForm.errors.actief_vanaf && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.actief_vanaf}</div>}
                            </div>

                            {normalizedCompanyStatus === 'opgezegd' && (
                                <>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-opgezegd-op">Opgezegd op</label>
                                    <input
                                        id="overviewForm-opgezegd-op"
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={overviewForm.data.opgezegd_op}
                                        onChange={(e) => overviewForm.setData('opgezegd_op', e.target.value)}
                                    />
                                    {overviewForm.errors.opgezegd_op && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.opgezegd_op}</div>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-opzegreden">Opzegreden</label>
                                    <textarea
                                        id="overviewForm-opzegreden"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        rows={2}
                                        value={overviewForm.data.opzegreden}
                                        onChange={(e) => overviewForm.setData('opzegreden', e.target.value)}
                                    />
                                    {overviewForm.errors.opzegreden && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.opzegreden}</div>}
                                </div>
                                </>
                            )}
                            {normalizedCompanyStatus === 'verloren' && (
                                <>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-verloren-op">Verloren op</label>
                                    <input
                                        id="overviewForm-verloren-op"
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={overviewForm.data.verloren_op}
                                        onChange={(e) => overviewForm.setData('verloren_op', e.target.value)}
                                    />
                                    {overviewForm.errors.verloren_op && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.verloren_op}</div>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-verloren-reden">Verloren reden</label>
                                    <textarea
                                        id="overviewForm-verloren-reden"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        rows={2}
                                        value={overviewForm.data.verloren_reden}
                                        onChange={(e) => overviewForm.setData('verloren_reden', e.target.value)}
                                    />
                                    {overviewForm.errors.verloren_reden && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.verloren_reden}</div>}
                                </div>
                                </>
                            )}

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="overviewForm-tags">Tags</label>
                                <textarea
                                    id="overviewForm-tags"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    rows={2}
                                    value={overviewForm.data.tags}
                                    onChange={(e) => overviewForm.setData('tags', e.target.value)}
                                />
                                {overviewForm.errors.tags && <div className="mt-1 text-xs text-rose-600">{overviewForm.errors.tags}</div>}
                            </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                            {Object.keys(overviewForm.errors).length > 0 && !overviewForm.processing && (
                                <div role="alert" className="text-sm text-rose-600">
                                    Niet alle velden zijn juist ingevuld. Controleer de rood gemarkeerde velden hierboven.
                                </div>
                            )}
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={overviewForm.processing}
                            >
                                {overviewForm.processing ? 'Opslaan...' : 'Opslaan'}
                            </button>
                        </div>
                    </form>

                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-xs text-rose-800">
                                    Verwijder deze klant en verplaats naar de prullenbak.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={deleteCompany}
                                className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 sm:w-auto"
                            >
                                Verwijder klant
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'welkomst' && (
                <div className="space-y-6">
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
                                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={refreshWelcome}
                                    disabled={!welcomeEmail}
                                >
                                    Concept vernieuwen
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                                    onClick={() => openTemplatePicker(false)}
                                    disabled={!welcomeEmail || !templates.length}
                                >
                                    Template kiezen
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={saveWelcome}
                                    disabled={!welcomeEmail}
                                >
                                    Concept opslaan
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                    onClick={() => openTemplatePicker(true)}
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
                                                {WELCOME_STATUS_LABELS[welcomeStatus] || welcomeStatus}
                                            </span>
                                        </div>
                                        {welcomeEmail?.sent_at && (
                                            <div className="mt-2 text-xs text-zinc-500">
                                                Laatst verstuurd: {formatDateTime(welcomeEmail.sent_at)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                        <label htmlFor="welcome-to-email" className="block text-xs font-semibold text-zinc-500">Ontvanger</label>
                                        <input
                                            id="welcome-to-email"
                                            type="email"
                                            className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                            value={welcomeForm.data.to_email}
                                            onChange={(e) => welcomeForm.setData('to_email', e.target.value)}
                                            placeholder="klant@voorbeeld.nl"
                                        />
                                        {welcomeForm.errors.to_email && (
                                            <div className="mt-1 text-xs text-rose-600">{welcomeForm.errors.to_email}</div>
                                        )}
                                        <div className="mt-4 text-xs font-semibold text-zinc-500">Beschikbare velden</div>
                                        <div className="mt-2 space-y-1 text-xs text-zinc-600">
                                            {['{{ naam }}', '{{ bedrijfsnaam }}', '{{ loginnaam }}', '{{ activatielink }}', '{{ reset_link }}', '{{ weblink }}'].map((token) => (
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
                                        <label htmlFor="welcome-subject" className="block text-xs font-semibold text-zinc-500">Onderwerp</label>
                                        <input
                                            id="welcome-subject"
                                            className="mt-2 w-full rounded-md border-zinc-300 text-sm"
                                            value={welcomeForm.data.subject}
                                            onChange={(e) => welcomeForm.setData('subject', e.target.value)}
                                        />
                                        {welcomeForm.errors.subject && (
                                            <div className="mt-1 text-xs text-rose-600">{welcomeForm.errors.subject}</div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-xs font-semibold text-zinc-500">Welkomstmail</div>
                                            {selectedTemplate && (
                                                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-700">
                                                    Template: {selectedTemplate.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 rounded-lg border border-zinc-200">
                                            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-2">
                                                <ToolbarButton
                                                    title="Vet"
                                                    active={welcomeEditor?.isActive('bold')}
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().toggleBold().run()}
                                                >
                                                    Vet
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Cursief"
                                                    active={welcomeEditor?.isActive('italic')}
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().toggleItalic().run()}
                                                >
                                                    Cursief
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Opsomming"
                                                    active={welcomeEditor?.isActive('bulletList')}
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().toggleBulletList().run()}
                                                >
                                                    Lijst
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Genummerde lijst"
                                                    active={welcomeEditor?.isActive('orderedList')}
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().toggleOrderedList().run()}
                                                >
                                                    Nummering
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Link"
                                                    active={welcomeEditor?.isActive('link')}
                                                    disabled={!welcomeEditor}
                                                    onClick={() => {
                                                        if (!welcomeEditor) return;
                                                        const previousUrl = welcomeEditor.getAttributes('link').href || '';
                                                        const url = window.prompt('Link (URL)', previousUrl);
                                                        if (url === null) return;
                                                        if (url === '') {
                                                            welcomeEditor.chain().focus().unsetLink().run();
                                                            return;
                                                        }
                                                        welcomeEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                                                    }}
                                                >
                                                    Link
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Opmaak wissen"
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().clearNodes().unsetAllMarks().run()}
                                                >
                                                    Wissen
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Ongedaan maken"
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().undo().run()}
                                                >
                                                    Ongedaan
                                                </ToolbarButton>
                                                <ToolbarButton
                                                    title="Opnieuw"
                                                    disabled={!welcomeEditor}
                                                    onClick={() => welcomeEditor?.chain().focus().redo().run()}
                                                >
                                                    Opnieuw
                                                </ToolbarButton>
                                            </div>
                                            <EditorContent editor={welcomeEditor} className="tiptap px-3 py-2 text-sm" />
                                        </div>
                                        <div className="mt-2 text-xs text-zinc-500">
                                            {`Gebruik variabelen zoals {{ naam }}, {{ loginnaam }}, {{ activatielink }}, {{ reset_link }}, {{ weblink }}.`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {templatePickerOpen && (
                            <div
                                className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/30 px-4 py-8 backdrop-blur-sm"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="template-picker-title"
                                onClick={(event) => {
                                    if (event.target === event.currentTarget) {
                                        setTemplatePickerOpen(false);
                                        setPendingSend(false);
                                    }
                                }}
                            >
                                <div className="w-full max-w-lg rounded-2xl border border-zinc-200/70 bg-white/95 shadow-2xl">
                                    <div className="border-b border-zinc-100 px-5 py-4">
                                        <div id="template-picker-title" className="text-sm font-semibold text-zinc-900">Kies een e-mail template</div>
                                        <div className="mt-1 text-xs text-zinc-500">
                                            Selecteer een template om het concept te vullen. Je kunt daarna nog aanpassen.
                                        </div>
                                    </div>
                                    <div className="max-h-64 space-y-2 overflow-y-auto px-5 py-4">
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                type="button"
                                                onClick={() => setSelectedTemplateId(template.id)}
                                                aria-pressed={selectedTemplateId === template.id}
                                                className={cx(
                                                    'w-full rounded-xl border px-4 py-3 text-left transition',
                                                    selectedTemplateId === template.id
                                                        ? 'border-zinc-900 bg-zinc-900 text-white'
                                                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                                )}
                                            >
                                                <div className="text-sm font-semibold">{template.name}</div>
                                                <div className={cx('mt-1 text-xs', selectedTemplateId === template.id ? 'text-zinc-200' : 'text-zinc-500')}>
                                                    {template.subject || 'Geen onderwerp'}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-zinc-100 px-5 py-4">
                                        {selectedTemplate ? (
                                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                                                <div className="font-semibold">{selectedTemplate.subject || 'Geen onderwerp'}</div>
                                                <div className="mt-1 text-zinc-500">{selectedTemplate.preview || 'Geen voorbeeld'}</div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-zinc-500">Kies een template om een voorbeeld te zien.</div>
                                        )}
                                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                                            <button
                                                type="button"
                                                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                                                onClick={() => {
                                                    setTemplatePickerOpen(false);
                                                    setPendingSend(false);
                                                }}
                                            >
                                                Annuleren
                                            </button>
                                            {pendingSend && (
                                                <button
                                                    type="button"
                                                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                                                    onClick={() => {
                                                        setTemplatePickerOpen(false);
                                                        setPendingSend(false);
                                                        confirmSendWelcome();
                                                    }}
                                                >
                                                    Verstuur huidige
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="rounded-full bg-indigo-600 px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={!selectedTemplate}
                                                onClick={() => {
                                                    applyTemplate(selectedTemplate, { close: true, send: pendingSend });
                                                    setPendingSend(false);
                                                }}
                                            >
                                                {pendingSend ? 'Gebruik & verstuur' : 'Gebruik template'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'klantpersonen' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Contactpersonen</div>
                            <div className="text-xs text-zinc-500">Meerdere contactpersonen per klant.</div>
                        </div>
                        <button
                            type="button"
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 sm:w-auto"
                            onClick={startPersonCreate}
                        >
                            Nieuwe contactpersoon
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full min-w-[760px] divide-y divide-zinc-100">
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
                                                <div className="mt-0.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                                                    Hoofdcontact
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">{roleLabel(person.rol)}</td>
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
                        <div id="person-form" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5">
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="personForm-voornaam">Voornaam *</label>
                                    <input
                                        id="personForm-voornaam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.voornaam}
                                        onChange={(e) => personForm.setData('voornaam', e.target.value)}
                                    />
                                    {personForm.errors.voornaam && (
                                        <div className="mt-1 text-xs text-rose-600">{personForm.errors.voornaam}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="personForm-achternaam">Achternaam *</label>
                                    <input
                                        id="personForm-achternaam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.achternaam}
                                        onChange={(e) => personForm.setData('achternaam', e.target.value)}
                                    />
                                    {personForm.errors.achternaam && (
                                        <div className="mt-1 text-xs text-rose-600">{personForm.errors.achternaam}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="personForm-email">E-mail *</label>
                                    <input
                                        id="personForm-email"
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="personForm-telefoon">Telefoon</label>
                                    <input
                                        id="personForm-telefoon"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.telefoon}
                                        onChange={(e) => personForm.setData('telefoon', e.target.value)}
                                    />
                                    {personForm.errors.telefoon && <div className="mt-1 text-xs text-rose-600">{personForm.errors.telefoon}</div>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="personForm-rol">Rol</label>
                                    <input
                                        id="personForm-rol"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={personForm.data.rol}
                                        onChange={(e) => personForm.setData('rol', e.target.value)}
                                        placeholder="bijv. Eigenaar, Administratie, Monteur"
                                    />
                                    {personForm.errors.rol && <div className="mt-1 text-xs text-rose-600">{personForm.errors.rol}</div>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300"
                                        checked={personForm.data.is_primary}
                                        onChange={(e) => personForm.setData('is_primary', e.target.checked)}
                                    />
                                    <span className="text-sm">Hoofdcontact</span>
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
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-medium text-zinc-500">Huidige status</div>
                                <div className="mt-1 text-lg font-semibold">{statusLabel(normalizedCompanyStatus)}</div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <form className="flex flex-wrap items-end gap-2" onSubmit={submitDemoStatus}>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600" htmlFor="statusForm-status">Nieuwe status</label>
                                        <select
                                            id="statusForm-status"
                                            className="mt-1 min-w-44 rounded-md border-zinc-300 text-sm"
                                            value={statusForm.data.status}
                                            onChange={(e) => statusForm.setData('status', e.target.value)}
                                        >
                                            {statusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {statusLabel(status)}
                                                </option>
                                            ))}
                                        </select>
                                        {statusForm.errors.status && <div className="mt-1 text-xs text-rose-600">{statusForm.errors.status}</div>}
                                    </div>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={statusForm.processing}
                                    >
                                        {statusForm.processing ? 'Opslaan...' : 'Status opslaan'}
                                    </button>
                                </form>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => setDemoStatus('demo_aangevraagd')}
                                        disabled={normalizedCompanyStatus === 'demo_aangevraagd'}
                                    >
                                        Naar demo aangevraagd
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => setDemoStatus('proefperiode')}
                                        disabled={normalizedCompanyStatus === 'proefperiode'}
                                    >
                                        Naar demo
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => setDemoStatus('actief')}
                                        disabled={normalizedCompanyStatus === 'actief'}
                                    >
                                        Actief
                                    </button>
                                </div>
                            </div>
                        </div>
                        {!hasActiveMandate && <div className="mt-3 text-xs text-amber-800">Let op: er is nog geen actief SEPA mandaat gekoppeld.</div>}
                    </div>

                    <form onSubmit={submitDemoDates} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demoForm-demo-aangevraagd-op">Demo aangevraagd op</label>
                            <input
                                id="demoForm-demo-aangevraagd-op"
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_aangevraagd_op}
                                onChange={(e) => demoForm.setData('demo_aangevraagd_op', e.target.value)}
                            />
                            {demoForm.errors.demo_aangevraagd_op && <div className="mt-1 text-xs text-rose-600">{demoForm.errors.demo_aangevraagd_op}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demoForm-demo-gepland-op">Demo gepland op</label>
                            <input
                                id="demoForm-demo-gepland-op"
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_gepland_op}
                                onChange={(e) => demoForm.setData('demo_gepland_op', e.target.value)}
                            />
                            {demoForm.errors.demo_gepland_op && <div className="mt-1 text-xs text-rose-600">{demoForm.errors.demo_gepland_op}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demoForm-demo-duur-dagen">Demo duur (dagen)</label>
                            <input
                                id="demoForm-demo-duur-dagen"
                                type="number"
                                min="1"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.demo_duur_dagen}
                                onChange={(e) => demoForm.setData('demo_duur_dagen', e.target.value)}
                            />
                            {demoForm.errors.demo_duur_dagen && <div className="mt-1 text-xs text-rose-600">{demoForm.errors.demo_duur_dagen}</div>}
                            <div className="mt-1 text-xs text-zinc-500">Einddatum wordt automatisch berekend.</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demo-eind-op">Demo einddatum</label>
                            <input
                                id="demo-eind-op"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-200 bg-zinc-50 text-sm"
                                value={toDateOnly(demoEndPreview)}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demoForm-proefperiode-start">Demo start</label>
                            <input
                                id="demoForm-proefperiode-start"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.proefperiode_start}
                                onChange={(e) => demoForm.setData('proefperiode_start', e.target.value)}
                            />
                            {demoForm.errors.proefperiode_start && <div className="mt-1 text-xs text-rose-600">{demoForm.errors.proefperiode_start}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600" htmlFor="demoForm-actief-vanaf">Actief vanaf</label>
                            <input
                                id="demoForm-actief-vanaf"
                                type="date"
                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                value={demoForm.data.actief_vanaf}
                                onChange={(e) => demoForm.setData('actief_vanaf', e.target.value)}
                            />
                            {demoForm.errors.actief_vanaf && <div className="mt-1 text-xs text-rose-600">{demoForm.errors.actief_vanaf}</div>}
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={demoForm.processing}
                            >
                                {demoForm.processing ? 'Opslaan...' : 'Datums opslaan'}
                            </button>
                        </div>
                    </form>

                    {normalizedCompanyStatus === 'proefperiode' && (
                    <form onSubmit={submitExtend} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="text-sm font-semibold">Demo verlengen</div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="extendForm-demo-verleng-dagen">Verleng met (dagen)</label>
                                <input
                                    id="extendForm-demo-verleng-dagen"
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
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="extendForm-demo-verleng-notitie">Notitie (optioneel)</label>
                                <input
                                    id="extendForm-demo-verleng-notitie"
                                    type="text"
                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                    value={extendForm.data.demo_verleng_notitie}
                                    onChange={(e) => extendForm.setData('demo_verleng_notitie', e.target.value)}
                                />
                                {extendForm.errors.demo_verleng_notitie && <div className="mt-1 text-xs text-rose-600">{extendForm.errors.demo_verleng_notitie}</div>}
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={extendForm.processing}
                            >
                                {extendForm.processing ? 'Bezig...' : 'Verleng demo'}
                            </button>
                        </div>
                    </form>
                    )}
                </div>
            )}

            {activeTab === 'incasso' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Incasso</div>
                            <div className="mt-1 text-xs text-zinc-500">Beheer de incassogegevens en SEPA-machtigingen van deze klant.</div>
                        </div>
                        <button
                            type="button"
                            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
                            onClick={startMandateNew}
                        >
                            Nieuw mandaat
                        </button>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Incasso-overzicht</div>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">Naam debiteur</dt>
                                <dd className="font-medium text-zinc-900">{garageCompany.bedrijfsnaam || '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">IBAN debiteur</dt>
                                <dd className="font-medium text-zinc-900">{activeMandate?.iban || '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">Kenmerk machtiging</dt>
                                <dd className="font-medium text-zinc-900">{incasso?.kenmerk_machtiging || '-'}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">Bedrag</dt>
                                <dd className="font-medium text-zinc-900">{formatEuro(garageCompany.active_mrr_incl || 0)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">Omschrijving</dt>
                                <dd className="font-medium text-zinc-900">{incassoOmschrijvingPreview}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-zinc-500">Machtigingsdatum</dt>
                                <dd className="font-medium text-zinc-900">{activeMandate?.datum_van_tekenen ? formatDate(activeMandate.datum_van_tekenen) : '-'}</dd>
                            </div>
                        </dl>
                        {!incasso?.is_complete && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                SEPA-gegevens onvolledig: {(incasso?.missing_fields || []).join(', ')}
                            </div>
                        )}
                        {incasso?.kenmerk_available === false && (
                            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                                Kenmerk machtiging kan nog niet opgeslagen worden: database migratie ontbreekt.
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-maand">Maand</label>
                                <select
                                    id="exportForm-maand"
                                    className="mt-1 rounded-md border-zinc-300 text-sm"
                                    value={exportForm.data.maand}
                                    onChange={(e) => exportForm.setData('maand', e.target.value)}
                                >
                                    {maandOpties.map((optie) => (
                                        <option key={optie.value} value={optie.value}>
                                            {optie.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-jaar">Jaar</label>
                                <select
                                    id="exportForm-jaar"
                                    className="mt-1 rounded-md border-zinc-300 text-sm"
                                    value={exportForm.data.jaar}
                                    onChange={(e) => exportForm.setData('jaar', e.target.value)}
                                >
                                    {jaarOpties.map((jaar) => (
                                        <option key={jaar} value={jaar}>
                                            {jaar}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600" htmlFor="exportForm-uitvoerdatum">Uitvoerdatum</label>
                                <input
                                    id="exportForm-uitvoerdatum"
                                    type="date"
                                    className="mt-1 rounded-md border-zinc-300 text-sm"
                                    value={exportForm.data.uitvoerdatum}
                                    onChange={(e) => exportForm.setData('uitvoerdatum', e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={exportIncasso}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 lg:self-end"
                            >
                                Exporteer ING incasso
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">SEPA mandaten</div>
                            <div className="mt-1 text-xs text-zinc-500">Maximaal 1 actief mandaat per klant. Eerdere mandaten blijven bewaard.</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full min-w-[760px] divide-y divide-zinc-100">
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
                                            <span
                                                className={cx(
                                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                                                    MANDATE_STATUS_CLASSES[mandate.status] || 'bg-zinc-100 text-zinc-700'
                                                )}
                                            >
                                                {MANDATE_STATUS_LABELS[mandate.status] || mandate.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">
                                            {mandate.ontvangen_op ? formatDateTime(mandate.ontvangen_op) : '-'}
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
                                                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'pending')}
                                                    disabled={mandate.status === 'pending'}
                                                >
                                                    In afwachting
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'actief')}
                                                    disabled={mandate.status === 'actief'}
                                                >
                                                    Actief
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    onClick={() => setMandateStatus(mandate.id, 'ingetrokken')}
                                                    disabled={mandate.status === 'ingetrokken'}
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
                        <div id="mandate-form" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5">
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-bedrijfsnaam">Bedrijfsnaam *</label>
                                    <input
                                        id="mandateForm-bedrijfsnaam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.bedrijfsnaam}
                                        onChange={(e) => mandateForm.setData('bedrijfsnaam', e.target.value)}
                                    />
                                    {mandateForm.errors.bedrijfsnaam && (
                                        <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.bedrijfsnaam}</div>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-voor-en-achternaam">Volledige naam *</label>
                                    <input
                                        id="mandateForm-voor-en-achternaam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.voor_en_achternaam}
                                        onChange={(e) => mandateForm.setData('voor_en_achternaam', e.target.value)}
                                    />
                                    {mandateForm.errors.voor_en_achternaam && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.voor_en_achternaam}</div>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-straatnaam-en-nummer">Straat + nummer *</label>
                                    <input
                                        id="mandateForm-straatnaam-en-nummer"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.straatnaam_en_nummer}
                                        onChange={(e) => mandateForm.setData('straatnaam_en_nummer', e.target.value)}
                                    />
                                    {mandateForm.errors.straatnaam_en_nummer && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.straatnaam_en_nummer}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-postcode">Postcode *</label>
                                    <input
                                        id="mandateForm-postcode"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.postcode}
                                        onChange={(e) => mandateForm.setData('postcode', e.target.value)}
                                    />
                                    {mandateForm.errors.postcode && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.postcode}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-plaats">Plaats *</label>
                                    <input
                                        id="mandateForm-plaats"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.plaats}
                                        onChange={(e) => mandateForm.setData('plaats', e.target.value)}
                                    />
                                    {mandateForm.errors.plaats && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.plaats}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-land">Land</label>
                                    <input
                                        id="mandateForm-land"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.land}
                                        onChange={(e) => mandateForm.setData('land', e.target.value)}
                                    />
                                    {mandateForm.errors.land && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.land}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-iban">IBAN *</label>
                                    <input
                                        id="mandateForm-iban"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.iban}
                                        onChange={(e) => mandateForm.setData('iban', e.target.value)}
                                    />
                                    {mandateForm.errors.iban && (
                                        <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.iban}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-bic">BIC</label>
                                    <input
                                        id="mandateForm-bic"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.bic}
                                        onChange={(e) => mandateForm.setData('bic', e.target.value)}
                                    />
                                    {mandateForm.errors.bic && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.bic}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-email">E-mail *</label>
                                    <input
                                        id="mandateForm-email"
                                        type="email"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.email}
                                        onChange={(e) => mandateForm.setData('email', e.target.value)}
                                    />
                                    {mandateForm.errors.email && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.email}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-telefoonnummer">Telefoon *</label>
                                    <input
                                        id="mandateForm-telefoonnummer"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.telefoonnummer}
                                        onChange={(e) => mandateForm.setData('telefoonnummer', e.target.value)}
                                    />
                                    {mandateForm.errors.telefoonnummer && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.telefoonnummer}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-plaats-van-tekenen">Plaats van tekenen *</label>
                                    <input
                                        id="mandateForm-plaats-van-tekenen"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.plaats_van_tekenen}
                                        onChange={(e) => mandateForm.setData('plaats_van_tekenen', e.target.value)}
                                    />
                                    {mandateForm.errors.plaats_van_tekenen && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.plaats_van_tekenen}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-datum-van-tekenen">Datum van tekenen *</label>
                                    <input
                                        id="mandateForm-datum-van-tekenen"
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.datum_van_tekenen}
                                        onChange={(e) => mandateForm.setData('datum_van_tekenen', e.target.value)}
                                    />
                                    {mandateForm.errors.datum_van_tekenen && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.datum_van_tekenen}</div>}
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="text-xs font-semibold text-zinc-500">Ondertekening (typed naam)</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-ondertekenaar-naam">Ondertekenaar naam</label>
                                    <input
                                        id="mandateForm-ondertekenaar-naam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.ondertekenaar_naam}
                                        onChange={(e) => mandateForm.setData('ondertekenaar_naam', e.target.value)}
                                    />
                                    {mandateForm.errors.ondertekenaar_naam && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.ondertekenaar_naam}</div>}
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-akkoord-op">Akkoord op</label>
                                    <input
                                        id="mandateForm-akkoord-op"
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.akkoord_op}
                                        onChange={(e) => mandateForm.setData('akkoord_op', e.target.value)}
                                    />
                                    {mandateForm.errors.akkoord_op && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.akkoord_op}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-ontvangen-op">Ontvangen op</label>
                                    <input
                                        id="mandateForm-ontvangen-op"
                                        type="datetime-local"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.ontvangen_op}
                                        onChange={(e) => mandateForm.setData('ontvangen_op', e.target.value)}
                                    />
                                    {mandateForm.errors.ontvangen_op && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.ontvangen_op}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-status">Status</label>
                                    <select
                                        id="mandateForm-status"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={mandateForm.data.status}
                                        onChange={(e) => mandateForm.setData('status', e.target.value)}
                                    >
                                        {['pending', 'actief', 'ingetrokken'].map((value) => (
                                            <option key={value} value={value}>
                                                {MANDATE_STATUS_LABELS[value] || value}
                                            </option>
                                        ))}
                                    </select>
                                    {mandateForm.errors.status && <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.status}</div>}
                                </div>

                                <div className="sm:col-span-2 mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                    <div className="text-sm font-semibold text-zinc-900">Incasso instellingen</div>
                                    <div className="mt-1 text-xs text-zinc-500">Kenmerk machtiging vul je handmatig in en blijft daarna bewaard.</div>

                                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-zinc-600" htmlFor="mandateForm-incasso-kenmerk-machtiging">Kenmerk machtiging *</label>
                                            <input
                                                id="mandateForm-incasso-kenmerk-machtiging"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                value={mandateForm.data.incasso_kenmerk_machtiging}
                                                onChange={(e) => mandateForm.setData('incasso_kenmerk_machtiging', e.target.value)}
                                            />
                                            {mandateForm.errors.incasso_kenmerk_machtiging && (
                                                <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.incasso_kenmerk_machtiging}</div>
                                            )}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-zinc-600" htmlFor="mandate-incasso-formulier">Upload getekend incassoformulier</label>
                                            <input
                                                id="mandate-incasso-formulier"
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="mt-1 w-full rounded-md border-zinc-300 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                                                onChange={(e) => mandateForm.setData('incasso_formulier', e.target.files?.[0] || null)}
                                            />
                                            {mandateForm.errors.incasso_formulier && (
                                                <div className="mt-1 text-xs text-rose-600">{mandateForm.errors.incasso_formulier}</div>
                                            )}
                                            <div className="mt-1 text-xs text-zinc-500">Toegestaan: PDF/JPG/PNG, max 10MB.</div>
                                        </div>
                                    </div>
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
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Modules & prijzen</div>
                            <div className="mt-1 text-xs text-zinc-500">Aantallen, prijzen en btw per module.</div>
                        </div>
                        <button
                            type="button"
                            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
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
                        Totaal: {formatEuro(moduleTotalsLive.totaalExcl)} excl. btw | BTW {formatEuro(moduleTotalsLive.btw)} |{' '}
                        {formatEuro(moduleTotalsLive.totaalIncl)} incl. btw
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full min-w-[900px] divide-y divide-zinc-100">
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
                                {moduleForm.data.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600">
                                            Er zijn nog geen modules beschikbaar.
                                        </td>
                                    </tr>
                                )}
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
                                                    aria-label={`${row.naam} actief`}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{row.naam}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-24 rounded-md border-zinc-300 text-sm"
                                                    value={row.aantal ?? ''}
                                                    onChange={(e) => updateModuleRow(index, 'aantal', e.target.value)}
                                                    aria-label={`Aantal ${row.naam}`}
                                                />
                                                {aantalError && <div className="mt-1 text-xs text-rose-600">{aantalError}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-28 rounded-md border-zinc-300 text-sm"
                                                    value={row.prijs_maand_excl ?? ''}
                                                    onChange={(e) => updateModuleRow(index, 'prijs_maand_excl', e.target.value)}
                                                    aria-label={`Prijs per maand excl. btw ${row.naam}`}
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
                                                    value={row.btw_percentage ?? ''}
                                                    onChange={(e) => updateModuleRow(index, 'btw_percentage', e.target.value)}
                                                    aria-label={`BTW percentage ${row.naam}`}
                                                />
                                                {btwError && <div className="mt-1 text-xs text-rose-600">{btwError}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-700">{row.actief ? formatEuro(subtotal) : '-'}</td>
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold">Gebruikers</div>
                            <div className="mt-1 text-xs text-zinc-500">Accounts binnen deze garage.</div>
                        </div>
                        <button
                            type="button"
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 sm:w-auto"
                            onClick={startSeatCreate}
                        >
                            Nieuwe gebruiker
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full min-w-[820px] divide-y divide-zinc-100">
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
                        <div id="seat-form" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5">
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="seatForm-naam">Naam *</label>
                                    <input
                                        id="seatForm-naam"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.naam}
                                        onChange={(e) => seatForm.setData('naam', e.target.value)}
                                    />
                                    {seatForm.errors.naam && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.naam}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="seatForm-email">E-mail *</label>
                                    <input
                                        id="seatForm-email"
                                        type="email"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.email}
                                        onChange={(e) => seatForm.setData('email', e.target.value)}
                                    />
                                    {seatForm.errors.email && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.email}</div>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="seatForm-rol-in-kivii">Rol</label>
                                    <input
                                        id="seatForm-rol-in-kivii"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.rol_in_kivii}
                                        onChange={(e) => seatForm.setData('rol_in_kivii', e.target.value)}
                                    />
                                    {seatForm.errors.rol_in_kivii && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.rol_in_kivii}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="seatForm-aangemaakt-op">Aangemaakt op</label>
                                    <input
                                        id="seatForm-aangemaakt-op"
                                        type="date"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={seatForm.data.aangemaakt_op}
                                        onChange={(e) => seatForm.setData('aangemaakt_op', e.target.value)}
                                    />
                                    {seatForm.errors.aangemaakt_op && <div className="mt-1 text-xs text-rose-600">{seatForm.errors.aangemaakt_op}</div>}
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
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="noteForm-titel">Titel</label>
                                    <input
                                        id="noteForm-titel"
                                        className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                        value={noteForm.data.titel}
                                        onChange={(e) => noteForm.setData('titel', e.target.value)}
                                    />
                                    {noteForm.errors.titel && <div className="mt-1 text-xs text-rose-600">{noteForm.errors.titel}</div>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600" htmlFor="noteForm-inhoud">Notitie</label>
                                    <textarea
                                        id="noteForm-inhoud"
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
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                                            <div className="text-sm font-semibold">
                                                {activity.type === 'status_wijziging' ? translateStatusText(activity.titel, safeStatusLabels) : activity.titel}
                                            </div>
                                            <div className="mt-1 text-xs text-zinc-500">
                                                {activity.type ? ACTIVITY_TYPE_LABELS[activity.type] || activity.type.replace(/_/g, ' ') : 'Activiteit'} |{' '}
                                                {formatDateTime(activity.created_at)}
                                            </div>
                                        </div>
                                        {activity.creator && <div className="text-xs font-semibold text-zinc-500">{activity.creator.name}</div>}
                                    </div>
                                    {activity.inhoud && <div className="mt-3 whitespace-pre-line break-words text-sm text-zinc-700">{activity.inhoud}</div>}
                                    {(activity.due_at || activity.done_at) && (
                                        <div className="mt-3 text-xs text-zinc-500">
                                            {activity.due_at && `Gepland: ${formatDateTime(activity.due_at)}`}
                                            {activity.done_at && ` | Afgerond: ${formatDateTime(activity.done_at)}`}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Pagination links={activities.links} lastPage={activities.last_page} />
                    </div>
                </div>
            )}

            {activeTab === 'taken_afspraken' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <div className="rounded-xl border border-zinc-200 bg-white p-5">
                                <div className="text-sm font-semibold">Nieuwe klantafspraak</div>
                                <form onSubmit={submitTask} className="mt-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-type">Type</label>
                                        <select
                                            id="taskForm-type"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.type}
                                            onChange={(e) => taskForm.setData('type', e.target.value)}
                                        >
                                            <option value="taak">Taak</option>
                                            <option value="afspraak">Afspraak</option>
                                        </select>
                                        {taskForm.errors.type && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.type}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-titel">Titel</label>
                                        <input
                                            id="taskForm-titel"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.titel}
                                            onChange={(e) => taskForm.setData('titel', e.target.value)}
                                        />
                                        {taskForm.errors.titel && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.titel}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-inhoud">Omschrijving</label>
                                        <textarea
                                            id="taskForm-inhoud"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            rows={3}
                                            value={taskForm.data.inhoud}
                                            onChange={(e) => taskForm.setData('inhoud', e.target.value)}
                                        />
                                        {taskForm.errors.inhoud && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.inhoud}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-due-at">Planning</label>
                                        <input
                                            id="taskForm-due-at"
                                            type="datetime-local"
                                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                            value={taskForm.data.due_at}
                                            onChange={(e) => taskForm.setData('due_at', e.target.value)}
                                        />
                                        {taskForm.errors.due_at && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.due_at}</div>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-zinc-300"
                                            checked={taskForm.data.createReminder}
                                            onChange={(e) => taskForm.setData('createReminder', e.target.checked)}
                                        />
                                        <span className="text-sm">Herinnering instellen</span>
                                    </div>
                                    {taskForm.data.createReminder && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-remind-at">Tijdstip herinnering</label>
                                                <input
                                                    id="taskForm-remind-at"
                                                    type="datetime-local"
                                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                    value={taskForm.data.remind_at}
                                                    onChange={(e) => taskForm.setData('remind_at', e.target.value)}
                                                />
                                                {taskForm.errors.remind_at && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.remind_at}</div>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600" htmlFor="taskForm-channel">Kanaal</label>
                                                <select
                                                    id="taskForm-channel"
                                                    className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                                                    value={taskForm.data.channel}
                                                    onChange={(e) => taskForm.setData('channel', e.target.value)}
                                                >
                                                    {reminderChannels.map((channel) => (
                                                        <option key={channel} value={channel}>
                                                            {CHANNEL_LABELS[channel] || channel}
                                                        </option>
                                                    ))}
                                                </select>
                                                {taskForm.errors.channel && <div className="mt-1 text-xs text-rose-600">{taskForm.errors.channel}</div>}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
