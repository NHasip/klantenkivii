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
            ? 'bg-rose-600 hover:bg-rose-700'
            : tone === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-zinc-900 hover:bg-zinc-800';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                <div className="text-base font-semibold text-zinc-900">{title}</div>
                {message && <p className="mt-2 text-sm text-zinc-600">{message}</p>}
                <div className="mt-5 flex items-center justify-end gap-2">
                    {showCancel && (
                        <button
                            type="button"
                            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${confirmClass}`}
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
