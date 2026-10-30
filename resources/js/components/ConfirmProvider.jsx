import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

const defaultState = {
    open: false,
    title: 'Bevestigen',
    message: '',
    confirmText: 'OK',
    cancelText: 'Annuleren',
    tone: 'primary',
    showCancel: true,
};

function ConfirmDialog({
    open,
    title,
    message,
    confirmText,
    cancelText,
    tone,
    showCancel,
    onConfirm,
    onCancel,
}) {
    const panelRef = useRef(null);
    const confirmRef = useRef(null);
    const cancelRef = useRef(null);
    const handlersRef = useRef({ onConfirm, onCancel });
    handlersRef.current = { onConfirm, onCancel };

    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        // Bij destructieve acties staat de focus standaard op Annuleren.
        const initial = tone === 'danger' && showCancel ? cancelRef.current : confirmRef.current;
        initial?.focus();

        const handleKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handlersRef.current.onCancel();
                return;
            }
            if (event.key === 'Enter') {
                // Een knop met focus handelt Enter zelf af (klik).
                if (event.target instanceof HTMLElement && event.target.closest('button')) {
                    event.stopPropagation();
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                handlersRef.current.onConfirm();
                return;
            }
            if (event.key === 'Tab') {
                const items = [cancelRef.current, confirmRef.current].filter(Boolean);
                event.preventDefault();
                event.stopPropagation();
                if (items.length === 0) return;
                const index = items.indexOf(document.activeElement);
                const nextIndex = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index + 1) % items.length;
                items[nextIndex].focus();
            }
        };
        // Capture-fase zodat onderliggende modals deze toetsen niet ook verwerken.
        document.addEventListener('keydown', handleKey, true);
        return () => {
            document.removeEventListener('keydown', handleKey, true);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [open, tone, showCancel]);

    if (!open) return null;

    // Zelfde knopstijl als ui.jsx (h-9, rounded-lg); primair = merkgroen.
    const confirmClass =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600'
            : tone === 'success'
              ? 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700'
              : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-600';

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/40 px-4 py-6 backdrop-blur-sm sm:items-center"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                ref={panelRef}
                className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
                role={tone === 'danger' ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={message ? 'confirm-dialog-message' : undefined}
            >
                <div className="px-5 pb-4 pt-5">
                    <h2 id="confirm-dialog-title" className="text-base font-semibold text-zinc-900">{title}</h2>
                    {message && (
                        <p id="confirm-dialog-message" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                            {message}
                        </p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3">
                    {showCancel && (
                        <button
                            ref={cancelRef}
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        ref={confirmRef}
                        type="button"
                        className={`inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${confirmClass}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(defaultState);
    // De resolver staat in een ref: zo wordt elke belofte precies een keer afgehandeld,
    // ook als er een nieuwe bevestiging opent terwijl de vorige nog openstaat.
    const resolverRef = useRef(null);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            if (resolverRef.current) resolverRef.current(false);
            resolverRef.current = resolve;
            setState({
                open: true,
                title: options.title ?? defaultState.title,
                message: options.message ?? defaultState.message,
                confirmText: options.confirmText ?? defaultState.confirmText,
                cancelText: options.cancelText ?? defaultState.cancelText,
                tone: options.tone ?? defaultState.tone,
                showCancel: options.showCancel ?? defaultState.showCancel,
            });
        });
    }, []);

    const close = useCallback((result) => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        if (resolve) resolve(result);
        setState((prev) => ({ ...prev, open: false }));
    }, []);

    // Bij unmount een openstaande belofte niet laten hangen.
    useEffect(() => () => {
        if (resolverRef.current) resolverRef.current(false);
    }, []);

    const contextValue = useMemo(() => confirm, [confirm]);

    return (
        <ConfirmContext.Provider value={contextValue}>
            {children}
            <ConfirmDialog
                open={state.open}
                title={state.title}
                message={state.message}
                confirmText={state.confirmText}
                cancelText={state.cancelText}
                tone={state.tone}
                showCancel={state.showCancel}
                onConfirm={() => close(true)}
                onCancel={() => close(false)}
            />
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmProvider');
    }
    return context;
}
