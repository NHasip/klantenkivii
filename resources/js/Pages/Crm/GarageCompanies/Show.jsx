import React, { useEffect, useId, useMemo, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Head, router, useForm } from '@inertiajs/react';
import { useConfirm } from '../../../components/ConfirmProvider';
import { FOCUS_SCOPE } from '../../../components/StatusBadge';
import { TabPanel, cx } from '../../../components/ui';
import CustomerHeader from './partials/CustomerHeader';
import OverviewTab from './partials/OverviewTab';
import ContactTab from './partials/ContactTab';
import SubscriptionTab from './partials/SubscriptionTab';
import ActivityTab from './partials/ActivityTab';
import DemoStatusTab from './partials/DemoStatusTab';
import WelcomeTab from './partials/WelcomeTab';
import { MandateRequestDialog } from './partials/MandateRequests';
import {
    CURRENT_DRAFT,
    DATE_ONLY_FIELDS,
    LEGACY_TABS,
    MANDATE_STATUS_LABELS,
    TABS,
    WELCOME_TAB,
    formatDate,
    formatDateTime,
    keepOriginalIfSameDate,
    personName,
    numberValue,
    scrollToForm,
    startOfDay,
    tabUrl,
    toDateOnly,
    toLocalDateInput,
    toLocalDateTimeInput,
} from './partials/showUtils';

const MAAND_OPTIES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'].map(
    (label, idx) => ({ value: String(idx + 1), label })
);

const EMPTY_PERSON = { voornaam: '', achternaam: '', rol: '', email: '', telefoon: '', is_primary: false, active: true };
const EMPTY_SEAT = { naam: '', email: '', rol_in_kivii: '', actief: true, aangemaakt_op: '' };

function asList(value) {
    return Array.isArray(value) ? value : [];
}

export default function Show({
    garageCompany,
    tab,
    statusOptions,
    statusLabels,
    sourceOptions,
    moduleRows,
    persons: personsProp,
    seats: seatsProp,
    mandates: mandatesProp,
    activities,
    tasks: tasksProp,
    crmTasks: crmTasksProp,
    appointments: appointmentsProp,
    recentNotes,
    welcomeSentActivityAt,
    reminderChannels,
    hasActiveMandate,
    statusErrors,
    welcomeEmail,
    emailTemplates,
    smtpConfigured,
    incasso,
    mandateRequests,
    urls,
}) {
    const persons = asList(personsProp);
    const seats = asList(seatsProp);
    const mandates = asList(mandatesProp);
    const tasks = asList(tasksProp);
    const appointments = asList(appointmentsProp);
    const crmTasks = asList(crmTasksProp);
    const tabsIdBase = useId();

    // Welkomstmail is eenmalig: verstuurd (status/sent_at of tijdlijn) = ingeklapt met "Al verstuurd op ...".
    const welcomeSentAt = welcomeEmail?.sent_at || welcomeSentActivityAt || null;
    const welcomeEmailSent = Boolean(welcomeSentAt || welcomeEmail?.status === 'sent');
    const [welcomeExpanded, setWelcomeExpanded] = useState(false);
    const requestedTab = tab || 'overzicht';
    const legacyTab = LEGACY_TABS[requestedTab] || null;
    const mappedTab = legacyTab ? legacyTab.tab : requestedTab;
    // Welkomstmail-tab alleen tonen als die relevant is (nog niet verstuurd) of expliciet gevraagd.
    const showWelcomeTab = !welcomeEmailSent || mappedTab === 'welkomst';
    const visibleTabs = showWelcomeTab ? [...TABS, WELCOME_TAB] : TABS;
    const activeTab = visibleTabs.some((item) => item.key === mappedTab) ? mappedTab : 'overzicht';
    const confirm = useConfirm();
    const [mandateDialog, setMandateDialog] = useState({ open: false, resend: null });
    const canSendMandate = Boolean(mandateRequests?.config?.available && mandateRequests?.config?.can_send);
    const openMandateDialog = (resend = null) => setMandateDialog({ open: true, resend });
    const closeMandateDialog = () => setMandateDialog({ open: false, resend: null });

    // Tabwissel zonder serververzoek: alle data staat al in de props.
    const changeTab = (key, anchor = null) => {
        router.replace({
            url: tabUrl(key, anchor),
            props: (current) => ({ ...current, tab: key }),
            preserveState: true,
            preserveScroll: true,
        });
        if (anchor) {
            scrollToForm(anchor);
        } else {
            window.requestAnimationFrame(() => {
                const top = document.getElementById('klantdossier-top');
                if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
            });
        }
    };

    useEffect(() => {
        const anchor = legacyTab?.anchor || (window.location.hash ? window.location.hash.slice(1) : null);
        if (anchor) {
            window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start' }), 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // ---- Overzicht: klantgegevens ----
    const overviewInitialData = () => ({
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
        bron: garageCompany.bron || sourceOptions?.[0] || '',
        tags: garageCompany.tags || '',
        opgezegd_op: toDateOnly(garageCompany.opgezegd_op),
        opzegreden: garageCompany.opzegreden || '',
        verloren_op: toDateOnly(garageCompany.verloren_op),
        verloren_reden: garageCompany.verloren_reden || '',
    });

    const overviewForm = useForm(overviewInitialData());
    const [headerPanel, setHeaderPanel] = useState(null);
    const [editingOverview, setEditingOverview] = useState(false);
    const [showPasswordField, setShowPasswordField] = useState(false);

    const withOriginalTimes = (data) => {
        const next = { ...data };
        DATE_ONLY_FIELDS.forEach((field) => {
            if (field in next) next[field] = keepOriginalIfSameDate(next[field], garageCompany[field]);
        });
        return next;
    };

    // Status en demo-datums wijzig je alleen via tab "Demo & status"; Overzicht stuurt de huidige status
    // ongewijzigd mee en laat de demo-datums weg (de server wijzigt velden die ontbreken niet).
    const submitOverview = (event) => {
        event.preventDefault();
        if (overviewForm.processing) return;
        overviewForm.transform((data) => ({ ...withOriginalTimes(data), status: normalizedCompanyStatus }));
        overviewForm.patch(urls.update_overview, {
            preserveScroll: true,
            onSuccess: () => {
                overviewForm.reset('login_password');
                setShowPasswordField(false);
                setEditingOverview(false);
            },
        });
    };

    const startOverviewEdit = () => {
        overviewForm.setData(overviewInitialData());
        overviewForm.clearErrors();
        setShowPasswordField(false);
        setEditingOverview(true);
    };

    const cancelOverviewEdit = () => {
        overviewForm.setData(overviewInitialData());
        overviewForm.clearErrors();
        setShowPasswordField(false);
        setEditingOverview(false);
    };

    // ---- Contactpersonen ----
    const [showPersonForm, setShowPersonForm] = useState(false);
    const [editingPersonId, setEditingPersonId] = useState(null);
    const personForm = useForm({ ...EMPTY_PERSON });

    const startPersonCreate = () => {
        setEditingPersonId(null);
        setShowPersonForm(true);
        personForm.setData({ ...EMPTY_PERSON });
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
        if (personForm.processing) return;
        if (editingPersonId) {
            personForm.patch(urls.update_person.replace('__PERSON__', editingPersonId), { preserveScroll: true, onSuccess: cancelPerson });
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
        router.delete(urls.delete_person.replace('__PERSON__', personId), {
            preserveScroll: true,
            onSuccess: () => {
                if (editingPersonId === personId) cancelPerson();
            },
        });
    };

    // ---- Modules ----
    const moduleForm = useForm({ rows: asList(moduleRows) });

    // Na opslaan levert de server de opgeslagen rijen; formulier en "niet opgeslagen"-status daarop gelijk zetten.
    const moduleRowsKey = JSON.stringify(moduleRows || []);
    useEffect(() => {
        const fresh = { rows: asList(moduleRows) };
        moduleForm.setDefaults(fresh);
        moduleForm.setData(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleRowsKey]);

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
                return { ...row, actief, aantal: actief && Number(row.aantal || 0) < 1 ? 1 : row.aantal };
            })
        );
    };

    // Hint: vergelijk aantal van een module als "Extra gebruikers" met het aantal actieve gebruikers (geen automatische wijziging).
    const extraUsersHint = (() => {
        const row = moduleForm.data.rows.find((item) => /extra\s*gebruiker/i.test(item.naam || ''));
        if (!row) return null;
        const quantity = row.actief ? Math.max(0, Number(row.aantal || 0)) : 0;
        const activeSeats = seats.filter((seat) => seat.actief).length;
        return { name: row.naam, quantity, activeSeats, matches: quantity === activeSeats };
    })();

    const submitModules = () => {
        if (moduleForm.processing) return;
        moduleForm.patch(urls.update_modules, { preserveScroll: true });
    };

    // ---- Gebruikers ----
    const [showSeatForm, setShowSeatForm] = useState(false);
    const [editingSeatId, setEditingSeatId] = useState(null);
    const seatForm = useForm({ ...EMPTY_SEAT });

    const startSeatCreate = () => {
        setEditingSeatId(null);
        setShowSeatForm(true);
        seatForm.setData({ ...EMPTY_SEAT });
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
        if (seatForm.processing) return;
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
        router.delete(urls.delete_seat.replace('__SEAT__', seatId), {
            preserveScroll: true,
            onSuccess: () => {
                if (editingSeatId === seatId) cancelSeat();
            },
        });
    };

    // ---- Demo ----
    const demoValues = () => ({
        demo_aangevraagd_op: garageCompany.demo_aangevraagd_op || '',
        demo_gepland_op: garageCompany.demo_gepland_op || '',
        demo_duur_dagen: garageCompany.demo_duur_dagen ?? '',
        proefperiode_start: toDateOnly(garageCompany.proefperiode_start),
        actief_vanaf: toDateOnly(garageCompany.actief_vanaf),
    });
    const demoForm = useForm(demoValues());

    // Formulier opnieuw vullen zodra de server nieuwe demo-waarden levert (bijv. na "Demo verlengen").
    useEffect(() => {
        const fresh = demoValues();
        demoForm.setDefaults(fresh);
        demoForm.setData(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        garageCompany.demo_aangevraagd_op,
        garageCompany.demo_gepland_op,
        garageCompany.demo_duur_dagen,
        garageCompany.demo_eind_op,
        garageCompany.proefperiode_start,
        garageCompany.actief_vanaf,
    ]);

    // Zelfde regel als de server: einde = start (proefperiode, anders aanvraag) + duur.
    const demoEndPreview = useMemo(() => {
        const startValue = demoForm.data.proefperiode_start || demoForm.data.demo_aangevraagd_op;
        if (startValue) {
            const m = String(startValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) {
                const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                date.setDate(date.getDate() + (Number(demoForm.data.demo_duur_dagen) || 14));
                return toLocalDateTimeInput(date);
            }
        }
        return garageCompany.demo_eind_effectief || garageCompany.demo_eind_op || '';
    }, [
        demoForm.data.proefperiode_start,
        demoForm.data.demo_aangevraagd_op,
        demoForm.data.demo_duur_dagen,
        garageCompany.demo_eind_effectief,
        garageCompany.demo_eind_op,
    ]);

    const submitDemoDates = (event) => {
        event.preventDefault();
        if (demoForm.processing) return;
        demoForm.transform((data) => withOriginalTimes(data));
        demoForm.patch(urls.save_demo_dates, { preserveScroll: true });
    };

    const extendForm = useForm({ demo_verleng_dagen: '', demo_verleng_notitie: '' });

    const submitExtend = async (event) => {
        event.preventDefault();
        if (extendForm.processing) return;
        const dagen = Number(extendForm.data.demo_verleng_dagen);
        if (!Number.isInteger(dagen) || dagen < 1) {
            extendForm.setError('demo_verleng_dagen', 'Vul een geheel aantal dagen in (minimaal 1).');
            return;
        }
        extendForm.clearErrors('demo_verleng_dagen');
        const ok = await confirm({
            title: 'Demo verlengen',
            message: `Demo verlengen met ${dagen} ${dagen === 1 ? 'dag' : 'dagen'}? Dit wordt vastgelegd in de tijdlijn.`,
            confirmText: 'Verlengen',
            cancelText: 'Annuleren',
            tone: 'primary',
        });
        if (!ok) return;
        extendForm.post(urls.extend_demo, {
            preserveScroll: true,
            onSuccess: () => {
                extendForm.reset();
                setHeaderPanel(null);
            },
        });
    };

    // ---- Status ----
    const statusForm = useForm({ status: normalizedCompanyStatus });
    const [statusBusy, setStatusBusy] = useState(false);

    useEffect(() => {
        statusForm.setData('status', normalizedCompanyStatus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [garageCompany.status]);

    const setDemoStatus = (status) => {
        if (statusBusy) return;
        router.patch(
            urls.set_demo_status,
            { status },
            {
                preserveScroll: true,
                preserveState: false,
                onStart: () => setStatusBusy(true),
                onFinish: () => setStatusBusy(false),
            }
        );
    };

    const activateCompany = async () => {
        const ok = await confirm({
            title: 'Klant activeren',
            message: hasActiveMandate
                ? 'Status wordt Actief. Dit wordt vastgelegd in de tijdlijn.'
                : 'Status wordt Actief. Let op: er is nog geen actief SEPA mandaat gekoppeld. Dit wordt vastgelegd in de tijdlijn.',
            confirmText: 'Activeren',
            cancelText: 'Annuleren',
            tone: 'success',
        });
        if (!ok) return;
        setDemoStatus('actief');
    };

    // ---- Pauzeren / hervatten ----
    const pauseForm = useForm({ tot: '', reden: '' });
    const [showPauseForm, setShowPauseForm] = useState(false);

    const formatIsoDate = (value) => {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
    };

    const submitPause = async (event) => {
        event.preventDefault();
        if (pauseForm.processing || !urls.pause) return;
        const tot = formatIsoDate(pauseForm.data.tot);
        const ok = await confirm({
            title: 'Klant pauzeren',
            message: `${tot ? `Klant wordt gepauzeerd tot ${tot}.` : 'Klant wordt gepauzeerd zonder einddatum.'} Tijdens de pauze telt de klant niet mee voor MRR en wordt er niet geïncasseerd. Dit wordt vastgelegd in de tijdlijn.`,
            confirmText: 'Pauzeren',
            cancelText: 'Annuleren',
            tone: 'primary',
        });
        if (!ok) return;
        pauseForm.post(urls.pause, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                pauseForm.reset();
                setShowPauseForm(false);
                setHeaderPanel(null);
            },
        });
    };

    const resumeCompany = async () => {
        if (statusBusy || !urls.resume) return;
        const ok = await confirm({
            title: 'Klant hervatten',
            message: 'Status wordt weer Actief en de pauzegegevens worden gewist. Dit wordt vastgelegd in de tijdlijn.',
            confirmText: 'Hervatten',
            cancelText: 'Annuleren',
            tone: 'success',
        });
        if (!ok) return;
        router.post(urls.resume, {}, {
            preserveScroll: true,
            preserveState: false,
            onStart: () => setStatusBusy(true),
            onFinish: () => setStatusBusy(false),
        });
    };

    const submitDemoStatus = async (event) => {
        event.preventDefault();
        if (statusForm.processing || statusBusy) return;
        if (statusForm.data.status === normalizedCompanyStatus) return;
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
        statusForm.patch(urls.set_demo_status, { preserveScroll: true, preserveState: false });
    };

    // ---- SEPA-mandaten ----
    const [showMandateForm, setShowMandateForm] = useState(false);
    const [editingMandateId, setEditingMandateId] = useState(null);
    const [mandateBusyId, setMandateBusyId] = useState(null);

    const blankMandate = () => {
        const primaryName = garageCompany.primary_person
            ? `${garageCompany.primary_person.voornaam || ''} ${garageCompany.primary_person.achternaam || ''}`.trim()
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
        if (mandateForm.processing) return;
        mandateForm.post(urls.save_mandate, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: cancelMandate,
        });
    };

    // Eén select per mandaat; elke wijziging vraagt eerst om bevestiging.
    const changeMandateStatus = async (mandate, status) => {
        if (!status || status === mandate.status || mandateBusyId) return;
        const from = MANDATE_STATUS_LABELS[mandate.status] || mandate.status;
        const to = MANDATE_STATUS_LABELS[status] || status;
        let message = `Status van mandaat ${mandate.mandaat_id} wijzigen van "${from}" naar "${to}"?`;
        if (status === 'ingetrokken') {
            message += ' Er wordt dan niet meer op dit mandaat geïncasseerd.';
        }
        if (status === 'actief' && mandates.some((item) => item.id !== mandate.id && item.status === 'actief')) {
            message += ' Het huidige actieve mandaat wordt dan ingetrokken.';
        }
        const ok = await confirm({
            title: 'Mandaatstatus wijzigen',
            message,
            confirmText: 'Wijzigen',
            cancelText: 'Annuleren',
            tone: status === 'ingetrokken' ? 'danger' : 'primary',
        });
        if (!ok) return;
        router.patch(
            urls.set_mandate_status.replace('__MANDATE__', mandate.id),
            { status },
            {
                preserveScroll: true,
                onStart: () => setMandateBusyId(mandate.id),
                onFinish: () => setMandateBusyId(null),
            }
        );
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

    // ---- Activiteit ----
    const [timelineFilter, setTimelineFilter] = useState('alles');

    // Titel start leeg (placeholder "Notitie"); leeg laten wordt bij versturen "Notitie".
    const noteForm = useForm({ titel: '', inhoud: '' });

    const submitNote = (event) => {
        event.preventDefault();
        if (noteForm.processing) return;
        noteForm.transform((data) => ({ ...data, titel: String(data.titel ?? '').trim() || 'Notitie' }));
        noteForm.post(urls.add_note, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset();
                setHeaderPanel(null);
            },
        });
    };

    const taskForm = useForm({
        type: 'taak',
        titel: '',
        inhoud: '',
        due_at: '',
        createReminder: true,
        remind_at: '',
        channel: reminderChannels?.[0] || 'popup',
    });

    const submitTask = (event) => {
        event.preventDefault();
        if (taskForm.processing) return;
        taskForm.post(urls.add_task, {
            preserveScroll: true,
            onSuccess: () => {
                taskForm.reset('titel', 'inhoud', 'due_at', 'remind_at');
                taskForm.setData((data) => ({ ...data, createReminder: data.type === 'taak' }));
            },
        });
    };

    const [doneBusyId, setDoneBusyId] = useState(null);
    const markDone = (activityId) => {
        if (doneBusyId) return;
        router.patch(
            urls.mark_task_done.replace('__ACTIVITY__', activityId),
            {},
            {
                preserveScroll: true,
                onStart: () => setDoneBusyId(activityId),
                onFinish: () => setDoneBusyId(null),
            }
        );
    };

    // ---- Welkomstmail ----
    const welcomeValues = () => ({
        subject: welcomeEmail?.subject || '',
        body_html: welcomeEmail?.body_html || '',
        to_email: welcomeEmail?.to_email || '',
        template_id: welcomeEmail?.template_id || null,
    });
    const welcomeForm = useForm(welcomeValues());

    const templates = asList(emailTemplates);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(welcomeEmail?.template_id ?? null);
    const [pendingSend, setPendingSend] = useState(false);
    const [sendingWelcome, setSendingWelcome] = useState(false);

    // Concept van de server overnemen; ook als standaard, zodat "niet opgeslagen" klopt.
    useEffect(() => {
        const fresh = welcomeValues();
        welcomeForm.setDefaults(fresh);
        welcomeForm.setData(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [welcomeEmail?.id, welcomeEmail?.subject, welcomeEmail?.body_html, welcomeEmail?.to_email, welcomeEmail?.template_id]);

    useEffect(() => {
        if (welcomeEmail?.template_id) {
            setSelectedTemplateId(welcomeEmail.template_id);
        }
    }, [welcomeEmail?.template_id]);

    const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;

    const welcomeEditor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
            LinkExtension.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
            Placeholder.configure({ placeholder: 'Typ hier je welkomstmail...' }),
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

    const refreshWelcome = async () => {
        const ok = await confirm({
            title: 'Concept vernieuwen',
            message: 'Het concept wordt opnieuw opgebouwd uit de welkomsttemplate en de klantgegevens. Eigen aanpassingen gaan verloren.',
            confirmText: 'Vernieuwen',
            cancelText: 'Annuleren',
            tone: 'danger',
        });
        if (!ok) return;
        router.post(urls.refresh_welcome_email, {}, { preserveScroll: true });
    };

    const saveWelcome = () => {
        if (welcomeForm.processing) return;
        welcomeForm.post(urls.update_welcome_email, { preserveScroll: true });
    };

    const showSmtpMissing = () =>
        confirm({
            title: 'SMTP ontbreekt',
            message: 'SMTP instellingen ontbreken. Voeg deze toe via profiel > systeem-instellingen.',
            confirmText: 'Sluiten',
            showCancel: false,
            tone: 'primary',
        });

    const confirmSendWelcome = async (draftOverride = null, { skipConfirm = false } = {}) => {
        if (!welcomeEmail || sendingWelcome) return;
        if (!smtpConfigured) {
            await showSmtpMissing();
            return;
        }
        const payload = draftOverride || {
            subject: welcomeForm.data.subject,
            body_html: welcomeForm.data.body_html,
            to_email: welcomeForm.data.to_email,
            template_id: welcomeForm.data.template_id,
        };
        if (!String(payload.to_email || '').trim()) {
            welcomeForm.setError('to_email', 'Vul een ontvanger in voordat je verstuurt.');
            changeTab('welkomst');
            return;
        }
        if (!skipConfirm) {
            const ok = await confirm({
                title: 'Welkomstmail versturen',
                message: `Welkomstmail versturen naar ${payload.to_email}?`,
                confirmText: 'Versturen',
                cancelText: 'Annuleren',
                tone: 'success',
            });
            if (!ok) return;
        }
        welcomeForm.clearErrors();
        setSendingWelcome(true);
        // Eerst het concept opslaan, daarna versturen; knoppen blijven uit tot beide klaar zijn.
        router.post(urls.update_welcome_email, payload, {
            preserveScroll: true,
            onError: (errors) => {
                welcomeForm.setError(errors);
                setSendingWelcome(false);
            },
            onSuccess: () => {
                router.post(
                    urls.send_welcome_email,
                    {},
                    {
                        preserveScroll: true,
                        onError: (errors) => welcomeForm.setError(errors),
                        onFinish: () => setSendingWelcome(false),
                    }
                );
            },
            onCancel: () => setSendingWelcome(false),
        });
    };

    const applyTemplate = (template, { close = true, send = false } = {}) => {
        if (!template) return;
        welcomeForm.setData((data) => ({ ...data, subject: template.subject, body_html: template.body_html, template_id: template.id }));
        if (welcomeEditor) {
            welcomeEditor.commands.setContent(template.body_html || '<p></p>', false);
        }
        setSelectedTemplateId(template.id);
        if (close) setTemplatePickerOpen(false);
        if (send) {
            confirmSendWelcome(
                {
                    subject: template.subject || '',
                    body_html: template.body_html || '',
                    to_email: welcomeForm.data.to_email,
                    template_id: template.id,
                },
                { skipConfirm: true }
            );
        }
    };

    const closeTemplatePicker = () => {
        setTemplatePickerOpen(false);
        setPendingSend(false);
        setSelectedTemplateId(welcomeForm.data.template_id ?? null);
    };

    useEffect(() => {
        if (!templatePickerOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') closeTemplatePicker();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templatePickerOpen]);

    // Versturen: een dialoog met templatekeuze, ontvanger en Versturen/Annuleren.
    const openTemplatePicker = (sendAfter = false) => {
        if (sendAfter && !smtpConfigured) {
            showSmtpMissing();
            return;
        }
        if (!templates.length) {
            if (sendAfter) confirmSendWelcome();
            return;
        }
        setPendingSend(sendAfter);
        setSelectedTemplateId(sendAfter ? CURRENT_DRAFT : welcomeForm.data.template_id ?? null);
        setTemplatePickerOpen(true);
    };

    const confirmTemplatePicker = () => {
        if (pendingSend && !selectedTemplate) {
            setTemplatePickerOpen(false);
            confirmSendWelcome(null, { skipConfirm: true });
        } else {
            applyTemplate(selectedTemplate, { close: true, send: pendingSend });
        }
        setPendingSend(false);
    };

    const welcomeSentText = welcomeSentAt ? `Al verstuurd op ${formatDateTime(welcomeSentAt)}` : 'Al verstuurd';

    // ---- Afgeleide gegevens voor header en Overzicht (alleen weergave) ----
    const isDemoStatus = normalizedCompanyStatus === 'proefperiode';
    const contactPhone = garageCompany.hoofd_telefoon || garageCompany.primary_person?.telefoon || '';
    const contactEmail = garageCompany.hoofd_email || garageCompany.primary_person?.email || '';

    const demoInfo = (() => {
        // Effectieve einddatum: opgeslagen of berekend uit start + duur (niet opgeslagen).
        const endValue = garageCompany.demo_eind_effectief || garageCompany.demo_eind_op;
        if (!isDemoStatus || !endValue) return null;
        const end = new Date(endValue);
        if (Number.isNaN(end.getTime())) return null;
        const suffix = garageCompany.demo_eind_berekend ? ' (berekend)' : '';
        const days = Math.round((startOfDay(end) - startOfDay(new Date())) / 86400000);
        if (days < 0) return { text: `Demo verlopen op ${formatDate(endValue)}${suffix}`, expired: true };
        if (days === 0) return { text: `Demo eindigt vandaag${suffix}`, soon: true };
        return { text: `Demo eindigt over ${days} ${days === 1 ? 'dag' : 'dagen'}${suffix}`, soon: days <= 3 };
    })();

    const openItems = useMemo(() => {
        const rows = [...tasks.map((item) => ({ ...item, kind: 'Taak' })), ...appointments.map((item) => ({ ...item, kind: 'Afspraak' }))];
        return rows.sort((a, b) => {
            if (!a.due_at && !b.due_at) return 0;
            if (!a.due_at) return 1;
            if (!b.due_at) return -1;
            return new Date(a.due_at) - new Date(b.due_at);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasksProp, appointmentsProp]);

    const nextAction = (() => {
        const item = openItems[0];
        if (!item) return null;
        const overdue = Boolean(item.due_at && new Date(item.due_at) < new Date());
        const meta = `${item.kind}${item.due_at ? `, ${formatDateTime(item.due_at)}` : ', geen planning'}${overdue ? ', te laat' : ''}`;
        return { title: item.titel, meta, overdue };
    })();

    const activeModuleRows = asList(moduleRows).filter((row) => row.actief);
    const tabCounts = {
        contact: persons.length + seats.length,
        abonnement: activeModuleRows.length,
        activiteit: openItems.length || undefined,
    };
    const tabItems = visibleTabs.map((item) => ({ ...item, count: tabCounts[item.key] }));

    return (
        <div className={cx('space-y-6', FOCUS_SCOPE)}>
            <Head title={garageCompany.bedrijfsnaam} />
            <div id="klantdossier-top" className="scroll-mt-16" />

            <CustomerHeader
                company={garageCompany}
                status={normalizedCompanyStatus}
                statusLabels={safeStatusLabels}
                demoInfo={demoInfo}
                nextAction={nextAction}
                onNextActionClick={() => changeTab('activiteit', 'sectie-klantafspraken')}
                phone={contactPhone}
                email={contactEmail}
                primaryName={personName(garageCompany.primary_person)}
                indexUrl={urls.index}
                tabs={tabItems}
                tabsIdBase={tabsIdBase}
                activeTab={activeTab}
                onTabChange={(key) => changeTab(key)}
                isDemo={isDemoStatus}
                onActivate={activateCompany}
                activateBusy={statusBusy}
                panel={headerPanel}
                setPanel={setHeaderPanel}
                extendForm={extendForm}
                onSubmitExtend={submitExtend}
                noteForm={noteForm}
                onSubmitNote={submitNote}
                pauseForm={pauseForm}
                onSubmitPause={submitPause}
                onResume={resumeCompany}
                onSendMandate={canSendMandate ? () => openMandateDialog() : null}
            />

            <MandateRequestDialog
                open={mandateDialog.open}
                onClose={closeMandateDialog}
                company={garageCompany}
                config={mandateRequests?.config}
                urls={mandateRequests?.urls || {}}
                templates={asList(emailTemplates)}
                resendRequest={mandateDialog.resend}
            />

            <TabPanel idBase={tabsIdBase} value="overzicht" active={activeTab === 'overzicht'}>
                    <OverviewTab
                        company={garageCompany}
                        status={normalizedCompanyStatus}
                        statusErrors={statusErrors}
                        hasActiveMandate={hasActiveMandate}
                        sourceOptions={sourceOptions}
                        recentNotes={recentNotes}
                        openItems={openItems}
                        crmTasks={crmTasks}
                        tasksUrl={urls.tasks_index || '/taken'}
                        persons={persons}
                        seats={seats}
                        mandates={mandates}
                        activeMandate={activeMandate}
                        activeModules={activeModuleRows}
                        activities={activities}
                        statusLabels={safeStatusLabels}
                        welcome={{
                            sent: welcomeEmailSent,
                            text: welcomeSentText,
                            status: welcomeEmail?.status,
                            onOpen: () => {
                                if (welcomeEmailSent) setWelcomeExpanded(false);
                                changeTab('welkomst');
                            },
                        }}
                        overviewForm={overviewForm}
                        editingOverview={editingOverview}
                        showPasswordField={showPasswordField}
                        setShowPasswordField={setShowPasswordField}
                        onStartEdit={startOverviewEdit}
                        onCancelEdit={cancelOverviewEdit}
                        onSubmit={submitOverview}
                        onAddNote={() => setHeaderPanel('note')}
                        changeTab={changeTab}
                        onDeleteCompany={deleteCompany}
                    />
            </TabPanel>

            <TabPanel idBase={tabsIdBase} value="contact" active={activeTab === 'contact'}>
                    <ContactTab
                        persons={persons}
                        seats={seats}
                        personProps={{
                            form: personForm,
                            showForm: showPersonForm,
                            editingId: editingPersonId,
                            onCreate: startPersonCreate,
                            onEdit: startPersonEdit,
                            onCancel: cancelPerson,
                            onSubmit: submitPerson,
                            onDelete: deletePerson,
                        }}
                        seatProps={{
                            form: seatForm,
                            showForm: showSeatForm,
                            editingId: editingSeatId,
                            onCreate: startSeatCreate,
                            onEdit: startSeatEdit,
                            onCancel: cancelSeat,
                            onSubmit: submitSeat,
                            onDelete: deleteSeat,
                        }}
                    />
            </TabPanel>

            <TabPanel idBase={tabsIdBase} value="abonnement" active={activeTab === 'abonnement'}>
                    <SubscriptionTab
                        moduleProps={{
                            form: moduleForm,
                            totals: moduleTotalsLive,
                            extraUsersHint,
                            onToggle: toggleModule,
                            onUpdateRow: updateModuleRow,
                            onSubmit: submitModules,
                            changeTab,
                        }}
                        incassoProps={{
                            company: garageCompany,
                            incasso,
                            activeMandate,
                            mandates,
                            omschrijving: incassoOmschrijvingPreview,
                            mandateForm,
                            showMandateForm,
                            editingMandateId,
                            onNewMandate: startMandateNew,
                            onEditMandate: startMandateEdit,
                            onCancelMandate: cancelMandate,
                            onSubmitMandate: submitMandate,
                            onChangeMandateStatus: changeMandateStatus,
                            mandateBusyId,
                        }}
                        exportProps={{ form: exportForm, maandOpties: MAAND_OPTIES, jaarOpties, onExport: exportIncasso }}
                        mandateRequestProps={{
                            requests: asList(mandateRequests?.requests),
                            config: mandateRequests?.config,
                            urls: mandateRequests?.urls || {},
                            onSend: () => openMandateDialog(),
                            onResend: (request) => openMandateDialog(request),
                        }}
                    />
            </TabPanel>

            <TabPanel idBase={tabsIdBase} value="activiteit" active={activeTab === 'activiteit'}>
                    <ActivityTab
                        taskForm={taskForm}
                        onSubmitTask={submitTask}
                        reminderChannels={reminderChannels}
                        tasks={tasks}
                        appointments={appointments}
                        onMarkDone={markDone}
                        doneBusyId={doneBusyId}
                        noteForm={noteForm}
                        onSubmitNote={submitNote}
                        activities={activities}
                        timelineFilter={timelineFilter}
                        setTimelineFilter={setTimelineFilter}
                        statusLabels={safeStatusLabels}
                    />
            </TabPanel>

            <TabPanel idBase={tabsIdBase} value="demo_status" active={activeTab === 'demo_status'}>
                    <DemoStatusTab
                        company={garageCompany}
                        status={normalizedCompanyStatus}
                        statusLabels={safeStatusLabels}
                        statusLabel={statusLabel}
                        statusOptions={statusOptions}
                        statusForm={statusForm}
                        onSubmitStatus={submitDemoStatus}
                        onSetStatus={setDemoStatus}
                        onActivate={activateCompany}
                        pauseForm={pauseForm}
                        onSubmitPause={submitPause}
                        showPauseForm={showPauseForm}
                        setShowPauseForm={setShowPauseForm}
                        onResume={resumeCompany}
                        statusBusy={statusBusy}
                        hasActiveMandate={hasActiveMandate}
                        demoInfo={demoInfo}
                        welcomeEmailSent={welcomeEmailSent}
                        welcomeSentText={welcomeSentText}
                        onResendWelcome={() => {
                            setWelcomeExpanded(true);
                            changeTab('welkomst');
                        }}
                        demoForm={demoForm}
                        onSubmitDates={submitDemoDates}
                        demoEndPreview={demoEndPreview}
                        extendForm={extendForm}
                        onSubmitExtend={submitExtend}
                    />
            </TabPanel>

            <TabPanel idBase={tabsIdBase} value="welkomst" active={activeTab === 'welkomst'}>
                    <WelcomeTab
                        welcomeEmail={welcomeEmail}
                        welcomeEmailSent={welcomeEmailSent}
                        welcomeExpanded={welcomeExpanded}
                        setWelcomeExpanded={setWelcomeExpanded}
                        welcomeSentText={welcomeSentText}
                        form={welcomeForm}
                        editor={welcomeEditor}
                        templates={templates}
                        smtpConfigured={smtpConfigured}
                        onRefresh={refreshWelcome}
                        onSave={saveWelcome}
                        onOpenPicker={openTemplatePicker}
                        sending={sendingWelcome}
                        picker={{
                            open: templatePickerOpen,
                            pendingSend,
                            selectedTemplateId,
                            setSelectedTemplateId,
                            selectedTemplate,
                            onClose: closeTemplatePicker,
                            onConfirm: confirmTemplatePicker,
                        }}
                    />
            </TabPanel>
        </div>
    );
}
