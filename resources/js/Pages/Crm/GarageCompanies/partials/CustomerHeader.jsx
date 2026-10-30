import React, { useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import StatusBadge from '../../../../components/StatusBadge';
import { Badge, Button, buttonClasses, cx, inputClasses } from '../../../../components/ui';

const BTN = buttonClasses({ variant: 'secondary', size: 'sm' });

export default function CustomerHeader({
    company,
    status,
    statusLabels,
    demoInfo,
    nextAction,
    onNextActionClick,
    phone,
    email,
    indexUrl,
    tabs,
    activeTab,
    onTabChange,
    isDemo,
    onActivate,
    activateBusy = false,
    panel,
    setPanel,
    extendForm,
    onSubmitExtend,
    noteForm,
    onSubmitNote,
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

    return (
        <div className="sticky top-14 z-20 -mx-4 border-b border-zinc-200 bg-white/95 px-4 pt-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5 sm:shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={indexUrl} className="text-sm font-medium text-zinc-500 hover:text-zinc-800 sm:hidden" aria-label="Terug naar klanten">
                            &larr;
                        </Link>
                        <h1 className="min-w-0 truncate text-lg font-semibold text-zinc-900 sm:text-xl">{company.bedrijfsnaam}</h1>
                        <StatusBadge status={status} labels={statusLabels} />
                        {demoInfo && <Badge tone={demoInfo.expired ? 'danger' : demoInfo.soon ? 'warning' : 'neutral'}>{demoInfo.text}</Badge>}
                    </div>
                    <div className="mt-1 truncate text-sm text-zinc-500">
                        {nextAction ? (
                            <button type="button" onClick={onNextActionClick} className="max-w-full truncate text-left underline-offset-2 hover:underline">
                                <span className="font-medium text-zinc-700">Volgende actie:</span>{' '}
                                <span className={nextAction.overdue ? 'font-semibold text-rose-700' : ''}>{nextAction.text}</span>
                            </button>
                        ) : (
                            <span>Geen open taken of afspraken</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {phone && (
                        <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} className={BTN} title={phone}>
                            Bellen
                        </a>
                    )}
                    {email && (
                        <a href={`mailto:${email}`} className={BTN} title={email}>
                            Mailen
                        </a>
                    )}
                    <button type="button" className={BTN} onClick={() => togglePanel('note')} aria-expanded={panel === 'note'} aria-controls="header-panel-note">
                        Notitie
                    </button>
                    {isDemo && (
                        <>
                            <button type="button" className={BTN} onClick={() => togglePanel('extend')} aria-expanded={panel === 'extend'} aria-controls="header-panel-extend">
                                Demo verlengen
                            </button>
                            <Button size="sm" onClick={onActivate} loading={activateBusy}>
                                Activeren
                            </Button>
                        </>
                    )}
                    <Link href={indexUrl} className={cx(buttonClasses({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}>
                        Terug
                    </Link>
                </div>
            </div>

            {panel === 'note' && (
                <form
                    id="header-panel-note"
                    ref={panelRef}
                    onSubmit={onSubmitNote}
                    noValidate
                    aria-label="Snelle notitie"
                    className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-start"
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

            {panel === 'extend' && isDemo && (
                <form
                    id="header-panel-extend"
                    ref={panelRef}
                    onSubmit={onSubmitExtend}
                    noValidate
                    aria-label="Demo verlengen"
                    className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
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

            <nav aria-label="Klantdossier" className="scrollbar-none scroll-fade-r -mx-1 mt-3 overflow-x-auto">
                <div className="flex min-w-max gap-1 pl-1 pr-6">
                    {tabs.map((item) => {
                        const active = activeTab === item.key;
                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                onClick={(event) => {
                                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
                                    event.preventDefault();
                                    onTabChange(item.key);
                                }}
                                aria-current={active ? 'page' : undefined}
                                className={cx(
                                    'inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors',
                                    active ? 'border-indigo-600 text-zinc-900' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                                )}
                            >
                                {item.label}
                            </a>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
