import React, { useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import StatusBadge from '../../../../components/StatusBadge';

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

const BTN = 'inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 sm:text-sm';
const BTN_PRIMARY = 'inline-flex items-center justify-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm';

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
            panelRef.current?.querySelector('input, textarea')?.focus();
        });
    }, [panel]);

    const togglePanel = (name) => setPanel(panel === name ? null : name);

    return (
        <div className="sticky top-14 z-20 -mx-4 border-b border-zinc-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4 sm:shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-semibold text-zinc-900 sm:text-xl">{company.bedrijfsnaam}</h1>
                        <StatusBadge status={status} labels={statusLabels} />
                        {demoInfo && (
                            <span
                                className={cx(
                                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                                    demoInfo.expired ? 'bg-rose-50 text-rose-700' : demoInfo.soon ? 'bg-amber-50 text-amber-800' : 'bg-zinc-100 text-zinc-700'
                                )}
                            >
                                {demoInfo.text}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500 sm:text-sm">
                        {nextAction ? (
                            <button type="button" onClick={onNextActionClick} className="truncate text-left hover:underline">
                                <span className="font-medium text-zinc-700">Volgende actie:</span>{' '}
                                <span className={nextAction.overdue ? 'font-semibold text-rose-700' : ''}>{nextAction.text}</span>
                            </button>
                        ) : (
                            <span>Geen open taken of afspraken</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                    <button type="button" className={BTN} onClick={() => togglePanel('note')} aria-expanded={panel === 'note'}>
                        Notitie
                    </button>
                    {isDemo && (
                        <>
                            <button type="button" className={BTN} onClick={() => togglePanel('extend')} aria-expanded={panel === 'extend'}>
                                Demo verlengen
                            </button>
                            <button type="button" className={BTN_PRIMARY} onClick={onActivate}>
                                Activeren
                            </button>
                        </>
                    )}
                    <Link href={indexUrl} className={cx(BTN, 'hidden sm:inline-flex')}>
                        Terug
                    </Link>
                </div>
            </div>

            {panel === 'note' && (
                <form ref={panelRef} onSubmit={onSubmitNote} className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-start">
                    <div>
                        <label className="sr-only" htmlFor="header-note-titel">Titel</label>
                        <input
                            id="header-note-titel"
                            className="w-full rounded-md border-zinc-300 text-sm"
                            value={noteForm.data.titel}
                            onChange={(e) => noteForm.setData('titel', e.target.value)}
                            placeholder="Titel"
                        />
                        {noteForm.errors.titel && <div className="mt-1 text-xs text-rose-600">{noteForm.errors.titel}</div>}
                    </div>
                    <div>
                        <label className="sr-only" htmlFor="header-note-inhoud">Notitie</label>
                        <textarea
                            id="header-note-inhoud"
                            rows={2}
                            className="w-full rounded-md border-zinc-300 text-sm"
                            value={noteForm.data.inhoud}
                            onChange={(e) => noteForm.setData('inhoud', e.target.value)}
                            placeholder="Typ een notitie..."
                        />
                        {noteForm.errors.inhoud && <div className="mt-1 text-xs text-rose-600">{noteForm.errors.inhoud}</div>}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" className={BTN} onClick={() => setPanel(null)}>
                            Annuleren
                        </button>
                        <button type="submit" className={BTN_PRIMARY} disabled={noteForm.processing}>
                            {noteForm.processing ? 'Opslaan...' : 'Toevoegen'}
                        </button>
                    </div>
                </form>
            )}

            {panel === 'extend' && isDemo && (
                <form ref={panelRef} onSubmit={onSubmitExtend} className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="header-extend-dagen">Verleng met (dagen)</label>
                        <input
                            id="header-extend-dagen"
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
                        <label className="block text-xs font-medium text-zinc-600" htmlFor="header-extend-notitie">Notitie (optioneel)</label>
                        <input
                            id="header-extend-notitie"
                            type="text"
                            className="mt-1 w-full rounded-md border-zinc-300 text-sm"
                            value={extendForm.data.demo_verleng_notitie}
                            onChange={(e) => extendForm.setData('demo_verleng_notitie', e.target.value)}
                        />
                        {extendForm.errors.demo_verleng_notitie && (
                            <div className="mt-1 text-xs text-rose-600">{extendForm.errors.demo_verleng_notitie}</div>
                        )}
                    </div>
                    <div className="flex gap-2 sm:pt-5">
                        <button type="button" className={BTN} onClick={() => setPanel(null)}>
                            Annuleren
                        </button>
                        <button type="submit" className={BTN_PRIMARY} disabled={extendForm.processing}>
                            {extendForm.processing ? 'Bezig...' : 'Verleng demo'}
                        </button>
                    </div>
                </form>
            )}

            <nav aria-label="Klantdossier" className="-mx-1 mt-3 overflow-x-auto">
                <div className="flex min-w-max gap-1.5 px-1 pb-1">
                    {tabs.map((item) => (
                        <a
                            key={item.key}
                            href={item.href}
                            onClick={(event) => {
                                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
                                event.preventDefault();
                                onTabChange(item.key);
                            }}
                            aria-current={activeTab === item.key ? 'page' : undefined}
                            className={cx(
                                'whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold',
                                activeTab === item.key ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            )}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            </nav>
        </div>
    );
}
