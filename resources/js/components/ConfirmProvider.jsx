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

    const confirmClass =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400'
            : tone === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400'
              : 'bg-zinc-900 hover:bg-zinc-800 focus-visible:ring-zinc-500';

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/30 px-4 py-8 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                ref={panelRef}
                className="w-full max-w-sm rounded-2xl border border-zinc-200/60 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.7)] ring-1 ring-black/5"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={message ? 'confirm-dialog-message' : undefined}
            >
                <div className="px-5 pt-4">
                    <div id="confirm-dialog-title" className="text-[13px] font-semibold text-zinc-900">{title}</div>
                    {message && (
                        <p id="confirm-dialog-message" className="mt-1 whitespace-pre-line text-xs leading-relaxed text-zinc-600">
                            {message}
                        </p>
                    )}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
                    {showCancel && (
                        <button
                            ref={cancelRef}
                            type="button"
                            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        ref={confirmRef}
                        type="button"
                        className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${confirmClass}`}
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

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            setState({
                open: true,
                title: options.title ?? defaultState.title,
                message: options.message ?? defaultState.message,
                confirmText: options.confirmText ?? defaultState.confirmText,
                cancelText: options.cancelText ?? defaultState.cancelText,
                tone: options.tone ?? defaultState.tone,
                showCancel: options.showCancel ?? defaultState.showCancel,
                resolve,
            });
        });
    }, []);

    const close = useCallback(
        (result) => {
            if (state.resolve) state.resolve(result);
            setState((prev) => ({ ...prev, open: false, resolve: null }));
        },
        [state.resolve]
    );

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
