import React from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, FilePicker, IconTile, KeyValue, Stat, cx, inputClasses } from '../../../../components/ui';
import CopyButton, { formatIban } from './CopyButton';
import { MandateRequestsCard } from './MandateRequests';
import {
    CheckboxField,
    FormActions,
    FormField,
    MANDATE_STATUSES,
    MANDATE_STATUS_LABELS,
    MANDATE_STATUS_TONES,
    Notice,
    formatDate,
    formatDateTime,
    formatEuro,
    normalizeIban,
    numberValue,
} from './showUtils';

const MODULE_GRID = 'sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_5.5rem_7rem]';
const SMALL_INPUT = cx(inputClasses, 'tabular-nums');

function ModulesSection({ form, totals, extraUsersHint, onToggle, onUpdateRow, onSubmit, changeTab }) {
    const rows = form.data.rows || [];
    return (
        <section id="sectie-modules" className="scroll-mt-48">
            <Card padded={false}>
                <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                    <CardHeader
                        icon="package"
                        title="Modules & prijzen"
                        description="Vink modules aan of uit en pas aantal, prijs en btw per module aan."
                        actions={form.isDirty ? <Badge tone="warning">Niet opgeslagen wijzigingen</Badge> : null}
                    />
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Actieve modules" value={`${totals.actieveModules} / ${totals.totaleModules}`} icon="layers" tone="brand" />
                        <Stat label="Totaal excl. btw" value={formatEuro(totals.totaalExcl)} icon="euro" />
                        <Stat label="Btw" value={formatEuro(totals.btw)} icon="file-text" />
                        <Stat label="Totaal incl. btw" value={formatEuro(totals.totaalIncl)} icon="credit-card" tone="success" sub="Per maand" />
                    </div>
                    {extraUsersHint && (
                        <Notice tone={extraUsersHint.matches ? 'neutral' : 'warning'} className="mt-4">
                            <span className="font-semibold">{extraUsersHint.name}:</span> {extraUsersHint.quantity} ingesteld, {extraUsersHint.activeSeats} actieve{' '}
                            {extraUsersHint.activeSeats === 1 ? 'gebruiker' : 'gebruikers'}.
                            {!extraUsersHint.matches && ' Controleer of het aantal klopt. Er wordt niets automatisch aangepast.'}{' '}
                            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => changeTab('contact', 'sectie-gebruikers')}>
                                Naar gebruikers
                            </button>
                        </Notice>
                    )}
                </div>

                {rows.length === 0 ? (
                    <div className="px-5 py-6 sm:px-6">
                        <EmptyState illustration="inbox" title="Geen modules beschikbaar" description="Er zijn nog geen modules aangemaakt in Kivii." />
                    </div>
                ) : (
                    <div className="mt-5">
                        <div className={cx('hidden gap-3 border-y border-zinc-200 bg-zinc-50 px-6 py-2 text-xs font-medium text-zinc-500 sm:grid', MODULE_GRID)} aria-hidden="true">
                            <span>Module</span>
                            <span>Aantal</span>
                            <span>Prijs excl.</span>
                            <span>Btw %</span>
                            <span className="text-right">Subtotaal</span>
                        </div>
                        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 sm:border-t-0">
                            {rows.map((row, index) => {
                                const effectiveAantal = Math.max(1, Number(row.aantal || 1));
                                const subtotal = numberValue(row.prijs_maand_excl) * effectiveAantal;
                                const base = `module-${row.module_id}`;
                                const errors = {
                                    aantal: form.errors[`rows.${index}.aantal`],
                                    prijs: form.errors[`rows.${index}.prijs_maand_excl`],
                                    btw: form.errors[`rows.${index}.btw_percentage`],
                                };
                                return (
                                    <li key={row.module_id} className={cx('grid grid-cols-3 gap-3 px-5 py-3 sm:items-start sm:px-6', MODULE_GRID, row.actief ? 'bg-white' : 'bg-zinc-50/70')}>
                                        <div className="col-span-3 pt-1.5 sm:col-span-1">
                                            <CheckboxField
                                                id={`${base}-actief`}
                                                label={row.naam}
                                                description={row.actief ? null : 'Niet actief'}
                                                checked={row.actief}
                                                onChange={() => onToggle(index)}
                                                className={row.actief ? '' : 'text-zinc-500'}
                                            />
                                        </div>
                                        <Field id={`${base}-aantal`} error={errors.aantal}>
                                            <label htmlFor={`${base}-aantal`} className="mb-1 block truncate whitespace-nowrap text-xs font-medium text-zinc-600 sm:sr-only">Aantal</label>
                                            <input
                                                id={`${base}-aantal`}
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                className={cx(SMALL_INPUT, errors.aantal && 'border-rose-400')}
                                                value={row.aantal ?? ''}
                                                onChange={(e) => onUpdateRow(index, 'aantal', e.target.value)}
                                                aria-invalid={errors.aantal ? true : undefined}
                                            />
                                        </Field>
                                        <Field id={`${base}-prijs`} error={errors.prijs}>
                                            <label htmlFor={`${base}-prijs`} className="mb-1 block truncate whitespace-nowrap text-xs font-medium text-zinc-600 sm:sr-only">Prijs p/m<span className="sr-only"> excl. btw</span></label>
                                            <input
                                                id={`${base}-prijs`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                className={cx(SMALL_INPUT, errors.prijs && 'border-rose-400')}
                                                value={row.prijs_maand_excl ?? ''}
                                                onChange={(e) => onUpdateRow(index, 'prijs_maand_excl', e.target.value)}
                                                aria-invalid={errors.prijs ? true : undefined}
                                            />
                                        </Field>
                                        <Field id={`${base}-btw`} error={errors.btw}>
                                            <label htmlFor={`${base}-btw`} className="mb-1 block truncate whitespace-nowrap text-xs font-medium text-zinc-600 sm:sr-only">Btw<span className="sr-only"> percentage</span><span aria-hidden="true"> %</span></label>
                                            <input
                                                id={`${base}-btw`}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                inputMode="decimal"
                                                className={cx(SMALL_INPUT, errors.btw && 'border-rose-400')}
                                                value={row.btw_percentage ?? ''}
                                                onChange={(e) => onUpdateRow(index, 'btw_percentage', e.target.value)}
                                                aria-invalid={errors.btw ? true : undefined}
                                            />
                                        </Field>
                                        <div className="col-span-3 flex items-center justify-between text-sm sm:col-span-1 sm:block sm:pt-2 sm:text-right">
                                            <span className="text-xs text-zinc-500 sm:sr-only">Subtotaal</span>
                                            <span className={cx('tabular-nums', row.actief ? 'font-semibold text-zinc-900' : 'text-zinc-400')}>{row.actief ? formatEuro(subtotal) : '-'}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {rows.length > 0 && (
                    <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-zinc-200 bg-zinc-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                        <p className="text-sm text-zinc-600 sm:mr-auto">
                            Totaal per maand: <span className="font-semibold tabular-nums text-zinc-900">{formatEuro(totals.totaalIncl)}</span> incl. btw
                        </p>
                        {form.hasErrors && !form.processing && (
                            <p role="alert" className="text-sm font-medium text-rose-700">Controleer de gemarkeerde velden.</p>
                        )}
                        <Button variant="secondary" onClick={() => form.reset()} disabled={!form.isDirty || form.processing}>
                            Wijzigingen ongedaan maken
                        </Button>
                        <Button onClick={onSubmit} loading={form.processing} disabled={!form.isDirty}>
                            {form.processing ? 'Opslaan...' : 'Modules opslaan'}
                        </Button>
                    </div>
                )}
            </Card>
        </section>
    );
}

function MandateForm({ form, editing, incasso, onSubmit, onCancel }) {
    return (
        <form id="mandate-form" onSubmit={onSubmit} noValidate className="scroll-mt-48 border-y border-zinc-200 bg-zinc-50/70 px-5 py-5 sm:px-6" aria-labelledby="mandate-form-title">
            <h3 id="mandate-form-title" className="mb-4 text-sm font-semibold text-zinc-900">{editing ? 'Mandaat bewerken' : 'Nieuw mandaat'}</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField form={form} name="bedrijfsnaam" id="mandateForm-bedrijfsnaam" label="Bedrijfsnaam" required className="sm:col-span-2" />
                    <FormField form={form} name="voor_en_achternaam" id="mandateForm-voor-en-achternaam" label="Volledige naam" required className="sm:col-span-2" />
                    <FormField form={form} name="straatnaam_en_nummer" id="mandateForm-straatnaam-en-nummer" label="Straat en huisnummer" required className="sm:col-span-2" />
                    <FormField form={form} name="postcode" id="mandateForm-postcode" label="Postcode" required />
                    <FormField form={form} name="plaats" id="mandateForm-plaats" label="Plaats" required />
                    <FormField form={form} name="land" id="mandateForm-land" label="Land" required />
                    <FormField form={form} name="iban" id="mandateForm-iban" label="IBAN" required inputClassName="font-mono uppercase" autoComplete="off" spellCheck={false} />
                    <FormField form={form} name="bic" id="mandateForm-bic" label="BIC" inputClassName="font-mono uppercase" autoComplete="off" spellCheck={false} />
                    <FormField form={form} name="email" id="mandateForm-email" label="E-mail" type="email" required />
                    <FormField form={form} name="telefoonnummer" id="mandateForm-telefoonnummer" label="Telefoon" type="tel" required />
                    <FormField form={form} name="plaats_van_tekenen" id="mandateForm-plaats-van-tekenen" label="Plaats van tekenen" required />
                    <FormField form={form} name="datum_van_tekenen" id="mandateForm-datum-van-tekenen" label="Datum van tekenen" type="date" required />
                </div>

                <fieldset className="min-w-0">
                    <legend className="mb-3 text-sm font-semibold text-zinc-900">Ondertekening en status</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField form={form} name="ondertekenaar_naam" id="mandateForm-ondertekenaar-naam" label="Naam ondertekenaar" hint="Getypte naam van degene die tekende." />
                        <CheckboxField
                            id="mandateForm-akkoord"
                            label="Akkoord gegeven"
                            checked={form.data.akkoord_checkbox}
                            onChange={(value) => form.setData('akkoord_checkbox', value)}
                            className="sm:pt-7"
                        />
                        <FormField form={form} name="akkoord_op" id="mandateForm-akkoord-op" label="Akkoord op" type="datetime-local" />
                        <FormField form={form} name="ontvangen_op" id="mandateForm-ontvangen-op" label="Ontvangen op" type="datetime-local" />
                        <FormField
                            form={form}
                            name="status"
                            id="mandateForm-status"
                            label="Status"
                            as="select"
                            hint={form.data.status === 'actief' ? 'Een ander actief mandaat wordt dan ingetrokken.' : undefined}
                        >
                            {MANDATE_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                    {MANDATE_STATUS_LABELS[value] || value}
                                </option>
                            ))}
                        </FormField>
                    </div>
                </fieldset>

                <fieldset className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4">
                    <legend className="px-1 text-sm font-semibold text-zinc-900">Incasso-instellingen</legend>
                    <div className="grid grid-cols-1 gap-4">
                        <FormField
                            form={form}
                            name="incasso_kenmerk_machtiging"
                            id="mandateForm-incasso-kenmerk-machtiging"
                            label="Kenmerk machtiging"
                            required
                            hint="Vul je handmatig in en blijft bewaard. Nodig voor de incasso-export."
                        />
                        <Field
                            id="mandate-incasso-formulier"
                            label="Getekend incassoformulier"
                            error={form.errors.incasso_formulier}
                            hint="PDF, JPG of PNG, maximaal 10 MB. Een nieuwe upload vervangt het huidige bestand."
                        >
                            {incasso?.formulier_url && (
                                <p className="mb-2 text-sm text-zinc-600">
                                    Huidig:{' '}
                                    <a href={incasso.formulier_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline">
                                        {incasso.formulier_naam || 'Bekijk formulier'}
                                    </a>
                                    {incasso.formulier_uploaded_at ? ` (${formatDate(incasso.formulier_uploaded_at)})` : ''}
                                </p>
                            )}
                            <FilePicker
                                id="mandate-incasso-formulier"
                                accept=".pdf,.jpg,.jpeg,.png"
                                files={form.data.incasso_formulier}
                                onChange={(e) => form.setData('incasso_formulier', e.target.files?.[0] || null)}
                            />
                        </Field>
                    </div>
                </fieldset>

                <FormActions form={form}>
                    <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                        Annuleren
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {form.processing ? 'Opslaan...' : 'Mandaat opslaan'}
                    </Button>
                </FormActions>
            </div>
        </form>
    );
}

function IncassoSection({
    company,
    incasso,
    activeMandate,
    mandates,
    omschrijving,
    mandateForm,
    showMandateForm,
    editingMandateId,
    onNewMandate,
    onEditMandate,
    onCancelMandate,
    onSubmitMandate,
    onChangeMandateStatus,
    mandateBusyId,
}) {
    const activeIban = normalizeIban(activeMandate?.iban);
    const overview = [
        ['Naam debiteur', company.bedrijfsnaam || '-'],
        [
            'IBAN debiteur',
            activeIban ? (
                <span className="inline-flex items-center font-mono">
                    {formatIban(activeIban)}
                    <CopyButton value={activeIban} label="IBAN kopiëren" />
                </span>
            ) : (
                '-'
            ),
        ],
        [
            'Kenmerk machtiging',
            incasso?.kenmerk_machtiging ? (
                <span className="inline-flex items-center">
                    {incasso.kenmerk_machtiging}
                    <CopyButton value={incasso.kenmerk_machtiging} label="Mandaatkenmerk kopiëren" />
                </span>
            ) : (
                '-'
            ),
        ],
        ['Bedrag per maand', formatEuro(company.active_mrr_incl || 0)],
        ['Omschrijving', omschrijving],
        ['Machtigingsdatum', activeMandate?.datum_van_tekenen ? formatDate(activeMandate.datum_van_tekenen) : '-'],
    ];

    return (
        <section id="sectie-incasso" className="scroll-mt-48">
            <Card padded={false}>
                <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                    <CardHeader
                        icon="credit-card"
                        title="Incasso en SEPA-mandaten"
                        description="Maximaal 1 actief mandaat per klant. Eerdere mandaten blijven bewaard."
                        actions={
                            !showMandateForm || editingMandateId ? (
                                <Button size="sm" icon="plus" onClick={onNewMandate}>
                                    Nieuw mandaat
                                </Button>
                            ) : null
                        }
                    />

                    <div className={cx('overflow-hidden rounded-2xl border', incasso?.is_complete ? 'border-emerald-200' : 'border-amber-200')}>
                        <div className={cx('flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between', incasso?.is_complete ? 'bg-emerald-50/60' : 'bg-amber-50/60')}>
                            <div className="flex min-w-0 items-center gap-3">
                                <IconTile icon={incasso?.is_complete ? 'check-circle' : 'alert-triangle'} tone={incasso?.is_complete ? 'success' : 'warning'} size="md" className="bg-white" />
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-zinc-900">{incasso?.is_complete ? 'Klaar voor incasso' : 'Incasso nog niet compleet'}</h3>
                                    <p className="text-sm text-zinc-600">
                                        {activeMandate ? `Actief mandaat ${activeMandate.mandaat_id}` : 'Er is nog geen actief mandaat.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={activeMandate ? 'success' : 'warning'} dot>{activeMandate ? 'Mandaat actief' : 'Geen actief mandaat'}</Badge>
                                {incasso?.is_complete ? <Badge tone="success">Compleet</Badge> : <Badge tone="warning">Onvolledig</Badge>}
                            </div>
                        </div>
                        <div className="border-t border-zinc-100 bg-white p-4">
                            <h4 className="sr-only">Gegevens voor de incasso</h4>
                            <KeyValue items={overview.map(([label, value]) => ({ label, value: value === '-' ? null : value }))} columns={3} />
                            {!incasso?.is_complete && (incasso?.missing_fields || []).length > 0 && (
                                <Notice tone="warning" className="mt-4">
                                    Nog nodig: {(incasso?.missing_fields || []).join(', ')}.
                                </Notice>
                            )}
                            {incasso?.kenmerk_available === false && (
                                <Notice tone="danger" className="mt-3">
                                    Kenmerk machtiging kan nog niet opgeslagen worden: database migratie ontbreekt.
                                </Notice>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-5">
                    {showMandateForm && (
                        <MandateForm form={mandateForm} editing={Boolean(editingMandateId)} incasso={incasso} onSubmit={onSubmitMandate} onCancel={onCancelMandate} />
                    )}

                    {mandates.length === 0 ? (
                        !showMandateForm && (
                            <div className="px-5 pb-6 sm:px-6">
                                <EmptyState
                                    icon="credit-card"
                                    title="Nog geen mandaten"
                                    description="Leg het getekende SEPA-mandaat vast om te kunnen incasseren."
                                    action={<Button size="sm" onClick={onNewMandate}>Nieuw mandaat</Button>}
                                />
                            </div>
                        )
                    ) : (
                        <ul className="divide-y divide-zinc-100 border-t border-zinc-100" aria-label="SEPA-mandaten">
                            {mandates.map((mandate) => {
                                const iban = normalizeIban(mandate.iban);
                                const busy = mandateBusyId === mandate.id;
                                return (
                                    <li
                                        key={mandate.id}
                                        className={cx(
                                            'flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6',
                                            editingMandateId === mandate.id && showMandateForm && 'bg-indigo-50/50'
                                        )}
                                    >
                                        <div className="flex min-w-0 items-start gap-3 sm:w-1/3">
                                            <IconTile icon="file-text" tone={MANDATE_STATUS_TONES[mandate.status] || 'neutral'} size="sm" />
                                            <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center break-all font-semibold text-zinc-900">
                                                    {mandate.mandaat_id}
                                                    <CopyButton value={mandate.mandaat_id || ''} label="Mandaatkenmerk kopiëren" />
                                                </span>
                                                <Badge tone={MANDATE_STATUS_TONES[mandate.status] || 'neutral'} dot>{MANDATE_STATUS_LABELS[mandate.status] || mandate.status}</Badge>
                                            </div>
                                            <p className="text-xs text-zinc-500">{mandate.bedrijfsnaam}</p>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="inline-flex items-center whitespace-nowrap font-mono text-zinc-800">
                                                {iban ? formatIban(iban) : '-'}
                                                <CopyButton value={iban} label="IBAN kopiëren" />
                                            </p>
                                            <p className="text-xs text-zinc-500">Ontvangen {mandate.ontvangen_op ? formatDateTime(mandate.ontvangen_op) : 'onbekend'}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <label className="sr-only" htmlFor={`mandate-status-${mandate.id}`}>Status mandaat {mandate.mandaat_id}</label>
                                            <select
                                                id={`mandate-status-${mandate.id}`}
                                                className={cx(inputClasses, 'h-8 w-auto py-0 pr-8 text-sm')}
                                                value={mandate.status}
                                                disabled={busy}
                                                onChange={(e) => onChangeMandateStatus(mandate, e.target.value)}
                                            >
                                                {MANDATE_STATUSES.map((value) => (
                                                    <option key={value} value={value}>
                                                        {MANDATE_STATUS_LABELS[value] || value}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button variant="ghost" size="sm" icon="edit" onClick={() => onEditMandate(mandate)} aria-label={`Mandaat ${mandate.mandaat_id} bewerken`}>
                                                Bewerken
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </Card>
        </section>
    );
}

function ExportCard({ form, maandOpties, jaarOpties, onExport }) {
    return (
        <Card>
            <CardHeader icon="download" tone="neutral" title="ING incasso-export" description="Downloadt de incassobatch van alle klanten met een actief mandaat voor de gekozen maand." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                <FormField form={form} name="maand" id="exportForm-maand" label="Maand" as="select">
                    {maandOpties.map((optie) => (
                        <option key={optie.value} value={optie.value}>
                            {optie.label}
                        </option>
                    ))}
                </FormField>
                <FormField form={form} name="jaar" id="exportForm-jaar" label="Jaar" as="select">
                    {jaarOpties.map((jaar) => (
                        <option key={jaar} value={jaar}>
                            {jaar}
                        </option>
                    ))}
                </FormField>
                <FormField form={form} name="uitvoerdatum" id="exportForm-uitvoerdatum" label="Uitvoerdatum" type="date" />
                <Button variant="secondary" icon="download" onClick={onExport} disabled={!form.data.uitvoerdatum}>
                    Exporteer ING incasso
                </Button>
            </div>
        </Card>
    );
}

export default function SubscriptionTab({ moduleProps, incassoProps, exportProps, mandateRequestProps }) {
    return (
        <div className="space-y-6">
            <ModulesSection {...moduleProps} />
            <IncassoSection {...incassoProps} />
            {mandateRequestProps ? <MandateRequestsCard {...mandateRequestProps} /> : null}
            <ExportCard {...exportProps} />
        </div>
    );
}
