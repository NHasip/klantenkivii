import React from 'react';

/**
 * Vangt renderfouten van een Inertia-pagina op, zodat er nooit een lege pagina overblijft: in plaats daarvan een
 * duidelijke melding met een knop om opnieuw te laden. De fout wordt in de console gelogd (met componentstack).
 * resetKey: bij een andere pagina/URL (Inertia-navigatie) begint de boundary opnieuw.
 */
export class PageErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, resetKey: props.resetKey };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.resetKey !== state.resetKey) {
            return { error: null, resetKey: props.resetKey };
        }
        return null;
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[Kivii] Fout bij het renderen van de pagina:', error, info?.componentStack || '');
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div role="alert" className="mx-auto my-10 max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                <h1 className="text-lg font-semibold text-zinc-900">Er ging iets mis bij het laden van deze pagina</h1>
                <p className="mt-2 text-sm text-zinc-600">Probeer de pagina opnieuw te laden. Blijft dit gebeuren, meld het dan bij de beheerder.</p>
                <button
                    type="button"
                    className="btn btn-primary mt-5"
                    onClick={() => window.location.reload()}
                >
                    Opnieuw laden
                </button>
                <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">Technische details</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-rose-700" data-error-detail>
                        {[String(error?.message || error), error?.stack].filter(Boolean).join('\n')}
                    </pre>
                </details>
            </div>
        );
    }
}

export default PageErrorBoundary;
