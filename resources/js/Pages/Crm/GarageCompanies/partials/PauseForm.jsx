import React, { forwardRef } from 'react';
import { Button, cx, inputClasses } from '../../../../components/ui';

function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Formulier om een actieve klant tijdelijk te pauzeren (tot-datum en reden zijn optioneel).
const PauseForm = forwardRef(function PauseForm({ idBase, form, onSubmit, onCancel, className = '' }, ref) {
    return (
        <form
            id={`${idBase}-form`}
            ref={ref}
            onSubmit={onSubmit}
            noValidate
            aria-label="Klant pauzeren"
            className={cx('grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[11rem_1fr_auto] sm:items-start', className)}
        >
            <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700" htmlFor={`${idBase}-tot`}>Gepauzeerd tot (optioneel)</label>
                <input
                    id={`${idBase}-tot`}
                    type="date"
                    min={todayIso()}
                    className={inputClasses}
                    value={form.data.tot}
                    onChange={(e) => form.setData('tot', e.target.value)}
                    aria-invalid={form.errors.tot ? true : undefined}
                />
                {form.errors.tot && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{form.errors.tot}</p>}
            </div>
            <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700" htmlFor={`${idBase}-reden`}>Reden (optioneel)</label>
                <input
                    id={`${idBase}-reden`}
                    type="text"
                    maxLength={255}
                    className={inputClasses}
                    value={form.data.reden}
                    onChange={(e) => form.setData('reden', e.target.value)}
                    placeholder="Bijv. seizoenssluiting"
                    aria-invalid={form.errors.reden ? true : undefined}
                />
                {form.errors.reden && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{form.errors.reden}</p>}
            </div>
            <div className="flex gap-2 sm:pt-5">
                {onCancel ? (
                    <Button variant="secondary" size="sm" onClick={onCancel}>
                        Annuleren
                    </Button>
                ) : null}
                <Button type="submit" size="sm" loading={form.processing}>
                    {form.processing ? 'Bezig...' : 'Pauzeren'}
                </Button>
            </div>
        </form>
    );
});

export default PauseForm;
