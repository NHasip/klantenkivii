import React from 'react';
import { Button, Card, CardHeader, Field, cx, inputClasses } from '../../../../components/ui';
import StatusBadge from '../../../../components/StatusBadge';
import { Icon } from '../../../../components/icons';
import { FormActions, FormField, Notice, formatDate, toDateOnly } from './showUtils';
import PauseForm from './PauseForm';

function lifecycleSteps(company, status) {
    const requested = { key: 'demo_aangevraagd', label: 'Demo aangevraagd', date: company.demo_aangevraagd_op, dateLabel: 'Aangevraagd' };
    const demo = {
        key: 'proefperiode',
        label: 'Demo',
        date: company.proefperiode_start || company.demo_gepland_op,
        dateLabel: company.proefperiode_start ? 'Gestart' : 'Gepland',
        extra: company.demo_eind_effectief || company.demo_eind_op ? `Einde ${formatDate(company.demo_eind_effectief || company.demo_eind_op)}` : null,
    };
    const active = { key: 'actief', label: 'Actief', date: company.actief_vanaf, dateLabel: 'Sinds' };
    if (status === 'verloren') {
        return { steps: [requested, demo, { key: 'verloren', label: 'Verloren', date: company.verloren_op, dateLabel: 'Op', tone: 'neutral' }], current: 2 };
    }
    if (status === 'gepauzeerd') {
        const paused = {
            key: 'gepauzeerd',
            label: 'Gepauzeerd',
            date: company.gepauzeerd_op,
            dateLabel: 'Sinds',
            extra: company.gepauzeerd_tot ? `Tot ${formatDate(company.gepauzeerd_tot)}` : 'Geen einddatum',
            tone: 'paused',
        };
        return { steps: [requested, demo, active, paused], current: 3 };
    }
    if (status === 'opgezegd') {
        return { steps: [requested, demo, active, { key: 'opgezegd', label: 'Opgezegd', date: company.opgezegd_op, dateLabel: 'Op', tone: 'danger' }], current: 3 };
    }
    const index = { demo_aangevraagd: 0, proefperiode: 1, actief: 2 }[status] ?? 0;
    return { steps: [requested, demo, active], current: index };
}

const STEP_CURRENT = {
    brand: 'bg-indigo-600 text-white ring-4 ring-indigo-100',
    danger: 'bg-rose-600 text-white ring-4 ring-rose-100',
    neutral: 'bg-zinc-600 text-white ring-4 ring-zinc-200',
    paused: 'bg-violet-700 text-white ring-4 ring-violet-100',
};

function LifecycleStepper({ company, status }) {
    const { steps, current } = lifecycleSteps(company, status);
    return (
        <ol className="grid grid-cols-1 gap-0 sm:auto-cols-fr sm:grid-flow-col" aria-label="Klantfase">
            {steps.map((step, i) => {
                const done = i < current;
                const isCurrent = i === current;
                const tone = step.tone || 'brand';
                return (
                    <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0 sm:flex-col sm:gap-3 sm:pb-0 sm:pr-4" aria-current={isCurrent ? 'step' : undefined}>
                        {i < steps.length - 1 ? (
                            <span
                                className={cx(
                                    'absolute left-4 top-9 -bottom-0 w-0.5 -translate-x-1/2 sm:left-9 sm:right-0 sm:top-4 sm:h-0.5 sm:w-auto sm:translate-x-0',
                                    done ? 'bg-indigo-500' : 'bg-zinc-200'
                                )}
                                aria-hidden="true"
                            />
                        ) : null}
                        <span
                            className={cx(
                                'relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                                done && 'bg-indigo-500 text-white',
                                isCurrent && (STEP_CURRENT[tone] || STEP_CURRENT.brand),
                                !done && !isCurrent && 'bg-white text-zinc-500 ring-1 ring-inset ring-zinc-300'
                            )}
                            aria-hidden="true"
                        >
                            {done ? <Icon name="check" className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                        </span>
                        <div className="min-w-0 pt-1 sm:pt-0">
                            <p className={cx('text-sm font-semibold', isCurrent || done ? 'text-zinc-900' : 'text-zinc-500')}>
                                {step.label}
                                <span className="sr-only">{done ? ' (afgerond)' : isCurrent ? ' (huidige fase)' : ' (nog niet)'}</span>
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">{step.date ? `${step.dateLabel} ${formatDate(step.date)}` : isCurrent || done ? 'Geen datum' : 'Nog niet'}</p>
                            {step.extra && (isCurrent || done) ? <p className="text-xs tabular-nums text-zinc-500">{step.extra}</p> : null}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

export default function DemoStatusTab({
    company = {},
    status,
    statusLabels,
    statusLabel,
    statusOptions,
    statusForm,
    onSubmitStatus,
    onSetStatus,
    onActivate,
    pauseForm,
    onSubmitPause,
    showPauseForm = false,
    setShowPauseForm,
    onResume,
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
                <CardHeader icon="layers" title="Klantfase" description="Van demo-aanvraag tot actieve klant." />
                <LifecycleStepper company={company} status={status} />
            </Card>

            <Card>
                <CardHeader icon="refresh" title="Status" description="Elke statuswijziging wordt vastgelegd in de tijdlijn." />
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
                        {status === 'actief' && pauseForm && (
                            <div className="mt-4">
                                {!showPauseForm ? (
                                    <Button variant="secondary" size="sm" icon="clock" onClick={() => setShowPauseForm?.(true)} disabled={statusBusy}>
                                        Pauzeren
                                    </Button>
                                ) : (
                                    <PauseForm idBase="status-pause" form={pauseForm} onSubmit={onSubmitPause} onCancel={() => setShowPauseForm?.(false)} />
                                )}
                                <p className="mt-1.5 text-xs text-zinc-500">Tijdelijk gestopt: telt niet mee voor MRR en wordt niet meegenomen in de incasso.</p>
                            </div>
                        )}
                        {status === 'gepauzeerd' && (
                            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                                <p className="text-sm font-semibold text-violet-900">
                                    Gepauzeerd{company.gepauzeerd_tot ? ` tot ${formatDate(company.gepauzeerd_tot)}` : ', geen einddatum'}
                                </p>
                                {company.gepauzeerd_reden ? <p className="mt-0.5 text-sm text-violet-900">Reden: {company.gepauzeerd_reden}</p> : null}
                                {onResume ? (
                                    <Button size="sm" icon="check-circle" className="mt-2" onClick={onResume} loading={statusBusy}>
                                        Hervatten
                                    </Button>
                                ) : null}
                            </div>
                        )}
                        {!hasActiveMandate && (
                            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-800">
                                <Icon name="alert-triangle" className="h-3.5 w-3.5" />
                                Let op: er is nog geen actief SEPA mandaat gekoppeld.
                            </p>
                        )}
                    </div>

                    <form onSubmit={onSubmitStatus} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4" aria-labelledby="status-form-title">
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
                <div className="mb-5 flex items-start gap-3">
                    <span className="icon-tile h-8 w-8 rounded-lg bg-indigo-100/80 text-indigo-700" aria-hidden="true"><Icon name="calendar" className="h-4 w-4" /></span>
                    <div>
                        <h2 id="demo-dates-title" className="section-heading">Demo-datums</h2>
                        <p className="section-description">De einddatum volgt uit demo start (of aanvraagdatum) plus de duur.</p>
                    </div>
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
                    <div className="mb-5 flex items-start gap-3">
                        <span className="icon-tile h-8 w-8 rounded-lg bg-indigo-100/80 text-indigo-700" aria-hidden="true"><Icon name="clock" className="h-4 w-4" /></span>
                        <div>
                            <h2 id="demo-extend-title" className="section-heading">Demo verlengen</h2>
                            <p className="section-description">Verlengt vanaf de huidige einddatum en legt dit vast in de tijdlijn.</p>
                        </div>
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
