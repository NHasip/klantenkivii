import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import StatusBadge from '../../../../components/StatusBadge';
import { Icon } from '../../../../components/icons';
import { Avatar, Button, ProgressBar, Tabs, buttonClasses, cx, inputClasses } from '../../../../components/ui';
import { formatDate, formatDateTime, formatEuro, startOfDay, telHref } from './showUtils';
import PauseForm from './PauseForm';

const QUICK = buttonClasses({ variant: 'secondary', size: 'sm' });

function toDay(value) {
    if (!value) return null;
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

// Demo-voortgang: dagen gebruikt en over, van demo start (of aanvraag) tot de effectieve einddatum.
function demoProgress(company) {
    const end = toDay(company.demo_eind_effectief || company.demo_eind_op);
    const start = toDay(company.proefperiode_start || company.demo_aangevraagd_op);
    if (!end) return null;
    const today = startOfDay(new Date());
    const total = start ? Math.max(1, Math.round((end - start) / 86400000)) : Number(company.demo_duur_dagen) || 14;
    const left = Math.round((end - today) / 86400000);
    const used = Math.min(total, Math.max(0, total - Math.max(0, left)));
    return { total, used, left, expired: left < 0 };
}

function lifecycleCell(company, status) {
    if (status === 'actief') return { label: 'Actief sinds', value: company.actief_vanaf ? formatDate(company.actief_vanaf) : 'Datum onbekend', icon: 'check-circle' };
    if (status === 'gepauzeerd') {
        return {
            label: company.gepauzeerd_tot ? 'Gepauzeerd tot' : 'Gepauzeerd sinds',
            value: company.gepauzeerd_tot ? formatDate(company.gepauzeerd_tot) : company.gepauzeerd_op ? formatDate(company.gepauzeerd_op) : 'Geen einddatum',
            icon: 'clock',
        };
    }
    if (status === 'opgezegd') return { label: 'Opgezegd op', value: company.opgezegd_op ? formatDate(company.opgezegd_op) : 'Datum onbekend', icon: 'x-circle' };
    if (status === 'verloren') return { label: 'Verloren op', value: company.verloren_op ? formatDate(company.verloren_op) : 'Datum onbekend', icon: 'archive' };
    if (company.demo_gepland_op) return { label: 'Demo gepland op', value: formatDateTime(company.demo_gepland_op), icon: 'calendar' };
    return { label: 'Demo aangevraagd', value: company.demo_aangevraagd_op ? formatDate(company.demo_aangevraagd_op) : 'Datum onbekend', icon: 'inbox' };
}

function MetricCell({ label, icon, children }) {
    return (
        <div className="min-w-0 px-5 py-3 sm:px-6 sm:py-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Icon name={icon} className="h-3.5 w-3.5 text-zinc-400" />
                {label}
            </dt>
            <dd className="mt-1.5 min-w-0">{children}</dd>
        </div>
    );
}

// Snelacties in de kop. Volgorde = prioriteit: op mobiel zijn de eerste twee direct zichtbaar, de rest staat onder "Meer".
function buildActions({ phone, email, status, isDemo, panel, togglePanel, onSendMandate, pauseForm, onResume, onActivate, activateBusy }) {
    const list = [];
    if (status === 'gepauzeerd' && onResume) {
        list.push({ key: 'resume', label: 'Hervatten', icon: 'check-circle', primary: true, onClick: onResume, loading: activateBusy });
    }
    if (isDemo) {
        list.push({ key: 'activate', label: 'Activeren', icon: 'check-circle', primary: true, onClick: onActivate, loading: activateBusy });
    }
    if (phone) list.push({ key: 'call', label: 'Bellen', icon: 'phone', href: telHref(phone), title: phone });
    if (email) list.push({ key: 'mail', label: 'Mailen', icon: 'mail', href: `mailto:${email}`, title: email });
    list.push({ key: 'note', label: 'Notitie', icon: 'message-square', onClick: () => togglePanel('note'), expanded: panel === 'note', controls: 'header-panel-note' });
    if (onSendMandate) list.push({ key: 'mandate', label: 'Machtiging versturen', icon: 'file-text', onClick: onSendMandate });
    if (status === 'actief' && pauseForm) {
        list.push({ key: 'pause', label: 'Pauzeren', icon: 'clock', onClick: () => togglePanel('pause'), expanded: panel === 'pause', controls: 'header-panel-pause-form' });
    }
    if (isDemo) {
        list.push({ key: 'extend', label: 'Demo verlengen', icon: 'clock', onClick: () => togglePanel('extend'), expanded: panel === 'extend', controls: 'header-panel-extend' });
    }
    return list;
}

// Desktopvolgorde (ongewijzigd): contactacties eerst, primaire statusactie als laatste.
const DESKTOP_ORDER = ['call', 'mail', 'mandate', 'note', 'pause', 'resume', 'extend', 'activate'];

function ActionButton({ action, className = '' }) {
    if (action.primary) {
        return (
            <Button size="sm" icon={action.icon} onClick={action.onClick} loading={action.loading} className={className}>
                {action.label}
            </Button>
        );
    }
    const content = (
        <>
            <Icon name={action.icon} className="h-4 w-4 text-zinc-500" />
            {action.label}
        </>
    );
    if (action.href) {
        return (
            <a href={action.href} className={cx(QUICK, className)} title={action.title}>
                {content}
            </a>
        );
    }
    return (
        <button type="button" className={cx(QUICK, className)} onClick={action.onClick} aria-expanded={action.expanded} aria-controls={action.controls}>
            {content}
        </button>
    );
}

function MoreMenu({ actions }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const run = (action) => {
        setOpen(false);
        action.onClick?.();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                className={QUICK}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls="klant-meer-acties"
            >
                <Icon name="more-horizontal" className="h-4 w-4 text-zinc-500" />
                Meer
            </button>
            {open ? (
                <div id="klant-meer-acties" className="menu-panel absolute right-0 top-full z-30 mt-2 w-60">
                    {actions.map((action) =>
                        action.href ? (
                            <a key={action.key} href={action.href} className="menu-item" onClick={() => setOpen(false)}>
                                <Icon name={action.icon} className="h-4 w-4 text-zinc-400" />
                                {action.label}
                            </a>
                        ) : (
                            <button key={action.key} type="button" className="menu-item" onClick={() => run(action)} aria-controls={action.controls}>
                                <Icon name={action.icon} className="h-4 w-4 text-zinc-400" />
                                {action.label}
                            </button>
                        ),
                    )}
                </div>
            ) : null}
        </div>
    );
}

function HeaderActions({ actions }) {
    const desktop = [...actions].sort((a, b) => DESKTOP_ORDER.indexOf(a.key) - DESKTOP_ORDER.indexOf(b.key));
    const visible = actions.slice(0, 2);
    const overflow = actions.slice(2);
    return (
        <>
            <div className="hidden flex-wrap items-center gap-2 sm:flex lg:justify-end">
                {desktop.map((action) => (
                    <ActionButton key={action.key} action={action} />
                ))}
            </div>
            <div className="flex items-center gap-2 sm:hidden">
                {visible.map((action) => (
                    <ActionButton key={action.key} action={action} className="flex-1" />
                ))}
                {overflow.length > 0 ? <MoreMenu actions={overflow} /> : null}
            </div>
        </>
    );
}

export default function CustomerHeader({
    company,
    status,
    statusLabels,
    demoInfo,
    nextAction,
    onNextActionClick,
    phone,
    email,
    primaryName,
    indexUrl,
    tabs,
    activeTab,
    onTabChange,
    tabsIdBase,
    isDemo,
    onActivate,
    activateBusy = false,
    panel,
    setPanel,
    extendForm,
    onSubmitExtend,
    noteForm,
    onSubmitNote,
    pauseForm,
    onSubmitPause,
    onResume,
    onSendMandate,
}) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!panel) return;
        window.requestAnimationFrame(() => {
            panelRef.current?.querySelector('textarea, input[type="number"], input')?.focus();
        });
    }, [panel]);

    // Escape sluit een open snelpaneel.
    useEffect(() => {
        if (!panel) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && panelRef.current?.contains(document.activeElement)) setPanel(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [panel, setPanel]);

    const togglePanel = (name) => setPanel(panel === name ? null : name);
    const progress = isDemo ? demoProgress(company) : null;
    const lifecycle = lifecycleCell(company, status);
    const actions = buildActions({
        phone,
        email,
        status,
        isDemo,
        panel,
        togglePanel,
        onSendMandate,
        pauseForm,
        onResume,
        onActivate,
        activateBusy,
    });
    const place = [company.plaats, company.land && company.land !== 'Nederland' ? company.land : null].filter(Boolean).join(', ');

    return (
        <>
            <section className="card overflow-hidden" aria-labelledby="klant-titel">
                <div className="p-5 sm:p-6">
                    <Link href={indexUrl} className="tap-link mb-3 inline-flex items-center gap-1 rounded-md text-sm sm:mb-4 font-medium text-zinc-500 hover:text-zinc-900 focus-ring">
                        <Icon name="arrow-left" className="h-4 w-4" />
                        Klanten
                    </Link>

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <Avatar name={company.bedrijfsnaam} size="lg" className="sm:h-16 sm:w-16 sm:text-xl" />
                            <div className="min-w-0 pt-0.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <h1 id="klant-titel" className="min-w-0 break-words text-2xl font-semibold tracking-display text-zinc-900 sm:text-[1.75rem] sm:leading-9">
                                        {company.bedrijfsnaam}
                                    </h1>
                                    <StatusBadge status={status} labels={statusLabels} className="px-2.5 py-1" />
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                                    {place ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Icon name="map-pin" className="h-4 w-4 text-zinc-400" />
                                            {place}
                                        </span>
                                    ) : null}
                                    {primaryName ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Icon name="user" className="h-4 w-4 text-zinc-400" />
                                            {primaryName}
                                        </span>
                                    ) : null}
                                    {company.kvk_nummer ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Icon name="briefcase" className="h-4 w-4 text-zinc-400" />
                                            KVK {company.kvk_nummer}
                                        </span>
                                    ) : null}
                                </p>
                            </div>
                        </div>

                        <HeaderActions actions={actions} />
                    </div>

                    {panel === 'note' && (
                        <form
                            id="header-panel-note"
                            ref={panelRef}
                            onSubmit={onSubmitNote}
                            noValidate
                            aria-label="Snelle notitie"
                            className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-start"
                        >
                            <div>
                                <label className="sr-only" htmlFor="header-note-titel">Titel</label>
                                <input
                                    id="header-note-titel"
                                    className={inputClasses}
                                    value={noteForm.data.titel}
                                    onChange={(e) => noteForm.setData('titel', e.target.value)}
                                    placeholder="Titel (standaard Notitie)"
                                    aria-invalid={noteForm.errors.titel ? true : undefined}
                                />
                                {noteForm.errors.titel && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{noteForm.errors.titel}</p>}
                            </div>
                            <div>
                                <label className="sr-only" htmlFor="header-note-inhoud">Notitie</label>
                                <textarea
                                    id="header-note-inhoud"
                                    rows={2}
                                    className={inputClasses}
                                    value={noteForm.data.inhoud}
                                    onChange={(e) => noteForm.setData('inhoud', e.target.value)}
                                    placeholder="Typ een notitie..."
                                    aria-invalid={noteForm.errors.inhoud ? true : undefined}
                                />
                                {noteForm.errors.inhoud && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{noteForm.errors.inhoud}</p>}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setPanel(null)}>
                                    Annuleren
                                </Button>
                                <Button type="submit" size="sm" loading={noteForm.processing}>
                                    {noteForm.processing ? 'Opslaan...' : 'Toevoegen'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {panel === 'pause' && status === 'actief' && pauseForm && (
                        <PauseForm ref={panelRef} idBase="header-panel-pause" form={pauseForm} onSubmit={onSubmitPause} onCancel={() => setPanel(null)} className="mt-5" />
                    )}

                    {panel === 'extend' && isDemo && (
                        <form
                            id="header-panel-extend"
                            ref={panelRef}
                            onSubmit={onSubmitExtend}
                            noValidate
                            aria-label="Demo verlengen"
                            className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-700" htmlFor="header-extend-dagen">Verleng met (dagen)</label>
                                <input
                                    id="header-extend-dagen"
                                    type="number"
                                    min="1"
                                    inputMode="numeric"
                                    className={inputClasses}
                                    value={extendForm.data.demo_verleng_dagen}
                                    onChange={(e) => extendForm.setData('demo_verleng_dagen', e.target.value)}
                                    aria-invalid={extendForm.errors.demo_verleng_dagen ? true : undefined}
                                />
                                {extendForm.errors.demo_verleng_dagen && (
                                    <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{extendForm.errors.demo_verleng_dagen}</p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-700" htmlFor="header-extend-notitie">Notitie (optioneel)</label>
                                <input
                                    id="header-extend-notitie"
                                    type="text"
                                    className={inputClasses}
                                    value={extendForm.data.demo_verleng_notitie}
                                    onChange={(e) => extendForm.setData('demo_verleng_notitie', e.target.value)}
                                />
                                {extendForm.errors.demo_verleng_notitie && (
                                    <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{extendForm.errors.demo_verleng_notitie}</p>
                                )}
                            </div>
                            <div className="flex gap-2 sm:pt-5">
                                <Button variant="secondary" size="sm" onClick={() => setPanel(null)}>
                                    Annuleren
                                </Button>
                                <Button type="submit" size="sm" loading={extendForm.processing}>
                                    {extendForm.processing ? 'Bezig...' : 'Verleng demo'}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <dl className="grid grid-cols-1 divide-y divide-zinc-100 border-t border-zinc-100 bg-zinc-50/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {progress ? (
                        <MetricCell label="Demo" icon="clock">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className={cx('text-sm font-semibold', progress.expired ? 'text-rose-700' : progress.left <= 3 ? 'text-amber-800' : 'text-zinc-900')}>
                                    {progress.expired ? 'Verlopen' : progress.left === 0 ? 'Laatste dag' : `Nog ${progress.left} ${progress.left === 1 ? 'dag' : 'dagen'}`}
                                </span>
                                <span className="text-xs tabular-nums text-zinc-500">
                                    dag {Math.min(progress.used, progress.total)} van {progress.total}
                                </span>
                            </div>
                            <ProgressBar
                                value={progress.used}
                                max={progress.total}
                                label={demoInfo?.text || 'Demo voortgang'}
                                hideLabel
                                size="sm"
                                tone={progress.expired ? 'danger' : progress.left <= 3 ? 'warning' : 'brand'}
                                className="mt-2"
                            />
                            {demoInfo ? <p className="mt-1.5 truncate text-xs text-zinc-500">{demoInfo.text}</p> : null}
                        </MetricCell>
                    ) : (
                        <MetricCell label={lifecycle.label} icon={lifecycle.icon}>
                            <span className="text-sm font-semibold text-zinc-900">{lifecycle.value}</span>
                        </MetricCell>
                    )}

                    <MetricCell label="MRR excl. btw" icon="euro">
                        <span className="text-lg font-semibold tabular-nums tracking-display text-zinc-900">{formatEuro(company.active_mrr_excl)}</span>
                        <span className="ml-2 text-xs tabular-nums text-zinc-500">{formatEuro(company.active_mrr_incl)} incl.</span>
                    </MetricCell>

                    <MetricCell label="Volgende actie" icon="bell">
                        {nextAction ? (
                            <button
                                type="button"
                                onClick={onNextActionClick}
                                className="group -mx-1 block max-w-full rounded-md px-1 text-left focus-ring"
                            >
                                <span className="block truncate text-sm font-semibold text-zinc-900 group-hover:underline group-hover:underline-offset-2">{nextAction.title}</span>
                                <span className={cx('block truncate text-xs', nextAction.overdue ? 'font-semibold text-rose-700' : 'text-zinc-500')}>{nextAction.meta}</span>
                            </button>
                        ) : (
                            <span className="text-sm text-zinc-500">Geen open taken of afspraken</span>
                        )}
                    </MetricCell>
                </dl>
            </section>

            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-canvas/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
                {/* Mobiel: volledige breedte keuzelijst in plaats van een onzichtbaar scrollende tabbalk. */}
                <div className="py-2 sm:hidden">
                    <label htmlFor={`${tabsIdBase}-picker`} className="sr-only">
                        Onderdeel van het klantdossier
                    </label>
                    <div className="relative">
                        <select
                            id={`${tabsIdBase}-picker`}
                            className={cx(inputClasses, 'h-11 pr-10 font-medium')}
                            value={activeTab}
                            onChange={(e) => onTabChange(e.target.value)}
                        >
                            {tabs.map((item) => (
                                <option key={item.key} value={item.key}>
                                    {item.count !== undefined && item.count !== null ? `${item.label} (${item.count})` : item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="scroll-fade-r hidden sm:block">
                    <Tabs
                        label="Klantdossier"
                        idBase={tabsIdBase}
                        items={tabs.map((item) => ({ value: item.key, label: item.label, icon: item.icon, count: item.count }))}
                        value={activeTab}
                        onChange={onTabChange}
                        className="pr-6"
                    />
                </div>
            </div>
        </>
    );
}
