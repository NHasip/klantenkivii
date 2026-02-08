import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
    useEffect(() => {
        if (!open) return undefined;
        const handleKey = (event) => {
            if (event.key === 'Escape') onCancel();
            if (event.key === 'Enter') onConfirm();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onCancel, onConfirm]);

    if (!open) return null;

    const confirmClass =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400'
            : tone === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400'
              : 'bg-zinc-900 hover:bg-zinc-800 focus-visible:ring-zinc-500';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 px-4 py-8 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-zinc-200/60 bg-white/95 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.7)] ring-1 ring-black/5"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="px-5 pt-4">
                    <div className="text-[13px] font-semibold text-zinc-900">{title}</div>
                    {message && (
                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                            {message}
                        </p>
                    )}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
                    {showCancel && (
                        <button
                            type="button"
                            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
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
