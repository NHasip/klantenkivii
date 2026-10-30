import React from 'react';
import { Button, Card, CardHeader, Field, cx, inputClasses } from '../../../../components/ui';
import StatusBadge from '../../../../components/StatusBadge';
import { FormActions, FormField, Notice, toDateOnly } from './showUtils';

export default function DemoStatusTab({
    status,
    statusLabels,
    statusLabel,
    statusOptions,
    statusForm,
    onSubmitStatus,
    onSetStatus,
    onActivate,
    statusBusy,
    hasActiveMandate,
    demoInfo,
    welcomeEmailSent,
    welcomeSentText,
    onResendWelcome,
    demoForm,
    onSubmitDates,
    demoEndPreview,
    extendForm,
    onSubmitExtend,
}) {
    const unchanged = statusForm.data.status === status;
    const quickActions = [
        { status: 'demo_aangevraagd', label: 'Naar demo aangevraagd', onClick: () => onSetStatus('demo_aangevraagd') },
        { status: 'proefperiode', label: 'Naar demo', onClick: () => onSetStatus('proefperiode') },
        { status: 'actief', label: 'Activeren', onClick: onActivate },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader title="Status" description="Elke statuswijziging wordt vastgelegd in de tijdlijn." />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium text-zinc-500">Huidige status</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <StatusBadge status={status} labels={statusLabels} className="px-2.5 py-1 text-sm" />
                            {demoInfo && <span className={cx('text-sm', demoInfo.expired ? 'font-semibold text-rose-700' : demoInfo.soon ? 'font-semibold text-amber-800' : 'text-zinc-600')}>{demoInfo.text}</span>}
                        </div>
                        <p className="mt-4 text-xs font-medium text-zinc-500">Snel wijzigen</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                            {quickActions.map((action) => (
                                <Button key={action.status} variant="secondary" size="sm" onClick={action.onClick} disabled={status === action.status || statusBusy}>
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                        {!hasActiveMandate && (
                            <p className="mt-3 text-xs font-medium text-amber-800">Let op: er is nog geen actief SEPA mandaat gekoppeld.</p>
                        )}
                    </div>

                    <form onSubmit={onSubmitStatus} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4" aria-labelledby="status-form-title">
                        <h3 id="status-form-title" className="mb-3 text-sm font-semibold text-zinc-900">Andere status kiezen</h3>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <FormField form={statusForm} name="status" id="statusForm-status" label="Nieuwe status" as="select" className="flex-1">
                                {(statusOptions || []).map((option) => (
                                    <option key={option} value={option}>
                                        {statusLabel(option)}
                                    </option>
                                ))}
                            </FormField>
                            <Button type="submit" loading={statusForm.processing} disabled={unchanged || statusBusy}>
                                {statusForm.processing ? 'Opslaan...' : 'Status opslaan'}
                            </Button>
                        </div>
                        {['opgezegd', 'verloren'].includes(statusForm.data.status) && !unchanged && (
                            <p className="mt-2 text-xs text-zinc-600">Je vult de reden daarna in bij Klantgegevens op tab Overzicht.</p>
                        )}
                    </form>
                </div>
            </Card>

            {welcomeEmailSent && (
                <Notice
                    tone="success"
                    title="Welkomstmail"
                    action={
                        <Button variant="secondary" size="sm" onClick={onResendWelcome}>
                            Opnieuw versturen
                        </Button>
                    }
                >
                    {welcomeSentText}.
                </Notice>
            )}

            <Card as="form" onSubmit={onSubmitDates} noValidate aria-labelledby="demo-dates-title">
                <div className="mb-4">
                    <h2 id="demo-dates-title" className="text-base font-semibold text-zinc-900">Demo-datums</h2>
                    <p className="mt-0.5 text-sm text-zinc-500">De einddatum volgt uit demo start (of aanvraagdatum) plus de duur.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField form={demoForm} name="demo_aangevraagd_op" id="demoForm-demo-aangevraagd-op" label="Demo aangevraagd op" type="datetime-local" />
                    <FormField form={demoForm} name="demo_gepland_op" id="demoForm-demo-gepland-op" label="Demo gepland op" type="datetime-local" />
                    <FormField form={demoForm} name="proefperiode_start" id="demoForm-proefperiode-start" label="Demo start" type="date" />
                    <FormField form={demoForm} name="demo_duur_dagen" id="demoForm-demo-duur-dagen" label="Demo duur (dagen)" type="number" min="1" inputMode="numeric" hint="Leeg laten: 14 dagen." />
                    <Field id="demo-eind-op" label="Demo einddatum" hint="Wordt automatisch berekend.">
                        <input id="demo-eind-op" type="date" className={cx(inputClasses, 'bg-zinc-50')} value={toDateOnly(demoEndPreview)} readOnly aria-readonly="true" tabIndex={-1} />
                    </Field>
                    <FormField form={demoForm} name="actief_vanaf" id="demoForm-actief-vanaf" label="Actief vanaf" type="date" />
                </div>
                <div className="mt-5">
                    <FormActions form={demoForm}>
                        <Button type="submit" loading={demoForm.processing}>
                            {demoForm.processing ? 'Opslaan...' : 'Datums opslaan'}
                        </Button>
                    </FormActions>
                </div>
            </Card>

            {status === 'proefperiode' && (
                <Card as="form" onSubmit={onSubmitExtend} noValidate aria-labelledby="demo-extend-title">
                    <div className="mb-4">
                        <h2 id="demo-extend-title" className="text-base font-semibold text-zinc-900">Demo verlengen</h2>
                        <p className="mt-0.5 text-sm text-zinc-500">Verlengt vanaf de huidige einddatum en legt dit vast in de tijdlijn.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_1fr]">
                        <FormField form={extendForm} name="demo_verleng_dagen" id="extendForm-demo-verleng-dagen" label="Verleng met (dagen)" type="number" min="1" inputMode="numeric" required />
                        <FormField form={extendForm} name="demo_verleng_notitie" id="extendForm-demo-verleng-notitie" label="Notitie (optioneel)" />
                    </div>
                    <div className="mt-5">
                        <FormActions form={extendForm}>
                            <Button type="submit" loading={extendForm.processing}>
                                {extendForm.processing ? 'Bezig...' : 'Demo verlengen'}
                            </Button>
                        </FormActions>
                    </div>
                </Card>
            )}
        </div>
    );
}
