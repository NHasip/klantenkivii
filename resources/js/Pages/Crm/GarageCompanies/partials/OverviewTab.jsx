import React from 'react';
import { Button, Card, CardHeader, Stat, cx } from '../../../../components/ui';
import {
    DetailList,
    FieldGroup,
    FormActions,
    FormField,
    Notice,
    SOURCE_LABELS,
    formatDate,
    formatDateTime,
    formatEuro,
    isOverdue,
} from './showUtils';

const LINK = 'font-medium text-indigo-700 underline-offset-2 hover:underline';

function telHref(value) {
    return `tel:${String(value).replace(/[^\d+]/g, '')}`;
}

function OverviewReadOnly({ company, status, onEdit }) {
    const primaryName = company.primary_person
        ? `${company.primary_person.voornaam || ''} ${company.primary_person.achternaam || ''}`.trim()
        : '';
    const addressText = [company.adres_straat_nummer, [company.postcode, company.plaats].filter(Boolean).join(' '), company.land]
        .filter(Boolean)
        .join(', ');
    const websiteHref = company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : null;

    const items = [
        ['Contactpersoon', primaryName],
        ['Hoofd e-mail', company.hoofd_email ? <a href={`mailto:${company.hoofd_email}`} className={LINK}>{company.hoofd_email}</a> : null],
        ['Hoofd telefoon', company.hoofd_telefoon ? <a href={telHref(company.hoofd_telefoon)} className={LINK}>{company.hoofd_telefoon}</a> : null],
        ['Login e-mail', company.login_email],
        ['Adres', addressText],
        ['Website', websiteHref ? <a href={websiteHref} target="_blank" rel="noreferrer" className={LINK}>{company.website}</a> : null],
        ['KVK nummer', company.kvk_nummer],
        ['BTW nummer', company.btw_nummer],
        ['Bron', SOURCE_LABELS[company.bron] || company.bron],
        ['Tags', company.tags],
    ];
    if (status === 'opgezegd') {
        items.push(['Opgezegd op', company.opgezegd_op ? formatDate(company.opgezegd_op) : null]);
        items.push(['Opzegreden', company.opzegreden]);
    }
    if (status === 'verloren') {
        items.push(['Verloren op', company.verloren_op ? formatDate(company.verloren_op) : null]);
        items.push(['Verloren reden', company.verloren_reden]);
    }

    return (
        <Card>
            <CardHeader
                title="Klantgegevens"
                description="Bedrijfs- en contactgegevens van deze garage."
                actions={
                    <Button variant="secondary" size="sm" onClick={onEdit}>
                        Bewerken
                    </Button>
                }
            />
            <DetailList items={items} />
        </Card>
    );
}

function OverviewForm({ form, status, sourceOptions, showPasswordField, setShowPasswordField, onSubmit, onCancel }) {
    return (
        <Card as="form" onSubmit={onSubmit} noValidate aria-labelledby="overview-form-title">
            <div className="mb-5">
                <h2 id="overview-form-title" className="text-base font-semibold text-zinc-900">Klantgegevens bewerken</h2>
                <p className="mt-0.5 text-sm text-zinc-500">Velden met * zijn verplicht. Status en demo-datums wijzig je in tab Demo & status.</p>
            </div>

            <div className="space-y-6">
                <FieldGroup title="Bedrijf">
                    <FormField form={form} name="bedrijfsnaam" id="overviewForm-bedrijfsnaam" label="Bedrijfsnaam" required className="sm:col-span-2" autoComplete="organization" />
                    <FormField form={form} name="kvk_nummer" id="overviewForm-kvk-nummer" label="KVK nummer" inputMode="numeric" />
                    <FormField form={form} name="btw_nummer" id="overviewForm-btw-nummer" label="BTW nummer" />
                    <FormField form={form} name="website" id="overviewForm-website" label="Website" inputMode="url" placeholder="www.voorbeeld.nl" />
                    <FormField form={form} name="bron" id="overviewForm-bron" label="Bron" as="select">
                        {(sourceOptions || []).map((source) => (
                            <option key={source} value={source}>
                                {SOURCE_LABELS[source] || source}
                            </option>
                        ))}
                    </FormField>
                </FieldGroup>

                <FieldGroup title="Hoofdcontact">
                    <FormField form={form} name="primary_voornaam" id="overviewForm-primary-voornaam" label="Voornaam" required autoComplete="given-name" />
                    <FormField form={form} name="primary_achternaam" id="overviewForm-primary-achternaam" label="Achternaam" required autoComplete="family-name" />
                    <FormField form={form} name="hoofd_email" id="overviewForm-hoofd-email" label="Hoofd e-mail" type="email" required autoComplete="email" />
                    <FormField form={form} name="hoofd_telefoon" id="overviewForm-hoofd-telefoon" label="Hoofd telefoon" type="tel" required autoComplete="tel" />
                </FieldGroup>

                <FieldGroup title="Adres">
                    <FormField form={form} name="adres_straat_nummer" id="overviewForm-adres-straat-nummer" label="Straat en huisnummer" className="sm:col-span-2" autoComplete="street-address" />
                    <FormField form={form} name="postcode" id="overviewForm-postcode" label="Postcode" autoComplete="postal-code" />
                    <FormField form={form} name="plaats" id="overviewForm-plaats" label="Plaats" required autoComplete="address-level2" />
                    <FormField form={form} name="land" id="overviewForm-land" label="Land" required autoComplete="country-name" />
                </FieldGroup>

                <FieldGroup title="Kivii login">
                    <FormField form={form} name="login_email" id="overviewForm-login-email" label="Login e-mail" type="email" autoComplete="off" />
                    {showPasswordField ? (
                        <div>
                            <FormField
                                form={form}
                                name="login_password"
                                id="overviewForm-login-password"
                                label="Nieuw login wachtwoord"
                                type="password"
                                autoComplete="new-password"
                                hint="Minimaal 8 tekens. Het huidige wachtwoord wordt nooit getoond."
                            />
                            <button
                                type="button"
                                className="mt-1 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
                                onClick={() => {
                                    form.setData('login_password', '');
                                    setShowPasswordField(false);
                                }}
                            >
                                Wachtwoord niet wijzigen
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="mb-1 block text-sm font-medium text-zinc-800">Login wachtwoord</p>
                            <Button variant="secondary" onClick={() => setShowPasswordField(true)}>
                                Wachtwoord wijzigen
                            </Button>
                            {form.errors.login_password && <p className="mt-1 text-xs font-medium text-rose-700" role="alert">{form.errors.login_password}</p>}
                        </div>
                    )}
                </FieldGroup>

                {status === 'opgezegd' && (
                    <FieldGroup title="Opzegging">
                        <FormField form={form} name="opgezegd_op" id="overviewForm-opgezegd-op" label="Opgezegd op" type="date" />
                        <FormField form={form} name="opzegreden" id="overviewForm-opzegreden" label="Opzegreden" as="textarea" rows={2} className="sm:col-span-2" />
                    </FieldGroup>
                )}
                {status === 'verloren' && (
                    <FieldGroup title="Verloren">
                        <FormField form={form} name="verloren_op" id="overviewForm-verloren-op" label="Verloren op" type="date" />
                        <FormField form={form} name="verloren_reden" id="overviewForm-verloren-reden" label="Verloren reden" as="textarea" rows={2} className="sm:col-span-2" />
                    </FieldGroup>
                )}

                <FieldGroup title="Overig">
                    <FormField form={form} name="tags" id="overviewForm-tags" label="Tags" as="textarea" rows={2} className="sm:col-span-2" hint="Bijvoorbeeld: groot, belt liever, Almere" />
                </FieldGroup>

                <FormActions form={form}>
                    <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                        Annuleren
                    </Button>
                    <Button type="submit" loading={form.processing}>
                        {form.processing ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                </FormActions>
            </div>
        </Card>
    );
}

export default function OverviewTab({
    company,
    status,
    statusErrors,
    hasActiveMandate,
    sourceOptions,
    recentNotes,
    openItems,
    overviewForm,
    editingOverview,
    showPasswordField,
    setShowPasswordField,
    onStartEdit,
    onCancelEdit,
    onSubmit,
    onAddNote,
    changeTab,
    onDeleteCompany,
}) {
    const notes = recentNotes || [];

    return (
        <div className="space-y-6">
            {statusErrors && statusErrors.length > 0 && (
                <Notice tone="warning" title="Let op">
                    <ul className="list-disc space-y-0.5 pl-5">
                        {statusErrors.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </Notice>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                    {editingOverview ? (
                        <OverviewForm
                            form={overviewForm}
                            status={status}
                            sourceOptions={sourceOptions}
                            showPasswordField={showPasswordField}
                            setShowPasswordField={setShowPasswordField}
                            onSubmit={onSubmit}
                            onCancel={onCancelEdit}
                        />
                    ) : (
                        <OverviewReadOnly company={company} status={status} onEdit={onStartEdit} />
                    )}
                </div>

                <div className="min-w-0 space-y-6">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                            <Stat label="MRR excl. btw" value={formatEuro(company.active_mrr_excl)} sub="Actieve modules vandaag" tone="brand" />
                            <Stat label="MRR incl. btw" value={formatEuro(company.active_mrr_incl)} sub="Btw instelbaar per module" />
                            <Stat
                                label="SEPA mandaat"
                                value={hasActiveMandate ? 'Actief' : 'Niet actief'}
                                sub={hasActiveMandate ? 'Incasso mogelijk' : 'Nog geen actief mandaat'}
                                tone={hasActiveMandate ? 'success' : 'warning'}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => changeTab('abonnement', 'sectie-modules')}>
                                Modules & prijzen
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={() => changeTab('abonnement', 'sectie-incasso')}>
                                Incasso
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader
                            title="Open klantafspraken"
                            actions={
                                <Button variant="ghost" size="xs" onClick={() => changeTab('activiteit', 'sectie-klantafspraken')}>
                                    Alles bekijken
                                </Button>
                            }
                            className="mb-3"
                        />
                        {openItems.length === 0 ? (
                            <p className="text-sm text-zinc-500">Geen open taken of afspraken.</p>
                        ) : (
                            <ul className="space-y-3">
                                {openItems.slice(0, 5).map((item) => {
                                    const overdue = isOverdue(item.due_at);
                                    return (
                                        <li key={item.id} className="min-w-0 text-sm">
                                            <p className="truncate font-medium text-zinc-900">{item.titel}</p>
                                            <p className={cx('text-xs', overdue ? 'font-semibold text-rose-700' : 'text-zinc-500')}>
                                                {item.kind}
                                                {item.due_at ? ` · ${formatDateTime(item.due_at)}` : ''}
                                                {overdue ? ' · te laat' : ''}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {openItems.length > 5 && <p className="mt-3 text-xs text-zinc-500">En nog {openItems.length - 5} meer.</p>}
                    </Card>

                    <Card>
                        <CardHeader
                            title="Laatste notities"
                            actions={
                                <Button variant="ghost" size="xs" onClick={onAddNote}>
                                    Notitie toevoegen
                                </Button>
                            }
                            className="mb-3"
                        />
                        {notes.length === 0 ? (
                            <p className="text-sm text-zinc-500">Nog geen notities.</p>
                        ) : (
                            <ul className="space-y-3">
                                {notes.map((note) => (
                                    <li key={note.id} className="border-l-2 border-zinc-200 pl-3">
                                        <p className="text-sm font-semibold text-zinc-900">{note.titel}</p>
                                        {note.inhoud && <p className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm text-zinc-700">{note.inhoud}</p>}
                                        <p className="mt-0.5 text-xs text-zinc-500">
                                            {formatDateTime(note.created_at)}
                                            {note.creator ? ` · ${note.creator}` : ''}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <button
                            type="button"
                            className="mt-3 text-xs font-semibold text-zinc-600 underline-offset-2 hover:underline"
                            onClick={() => changeTab('activiteit', 'sectie-tijdlijn')}
                        >
                            Volledige tijdlijn
                        </button>
                    </Card>
                </div>
            </div>

            <Card className="border-rose-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900">Klant verwijderen</h2>
                        <p className="mt-0.5 text-sm text-zinc-500">Verplaatst deze klant naar de prullenbak. Herstellen kan daarna nog.</p>
                    </div>
                    <Button variant="danger-ghost" className="ring-1 ring-inset ring-rose-200" onClick={onDeleteCompany}>
                        Naar prullenbak
                    </Button>
                </div>
            </Card>
        </div>
    );
}
