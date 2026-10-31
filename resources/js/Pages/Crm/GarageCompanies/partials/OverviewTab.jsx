import React from 'react';
import { Link } from '@inertiajs/react';
import { isNoopStatusChange, translateStatusText } from '../../../../components/StatusBadge';
import { Icon } from '../../../../components/icons';
import { ActivityItem, ActivityList, Avatar, Badge, Button, Card, CardHeader, EmptyState, IconTile, KeyValue, StatusDot, cx } from '../../../../components/ui';
import {
    CRM_TASK_PRIORITY,
    CRM_TASK_STATUS,
    FieldGroup,
    FormActions,
    FormField,
    MANDATE_STATUS_LABELS,
    MANDATE_STATUS_TONES,
    Notice,
    SOURCE_LABELS,
    WELCOME_STATUS_LABELS,
    WELCOME_STATUS_TONES,
    activityTypeLabel,
    activityVisual,
    formatDate,
    formatDateTime,
    formatShortDate,
    isOverdue,
    personName,
    roleLabel,
    telHref,
} from './showUtils';

const LINK = 'link';
const SMALL_LINK = 'tap-link inline-flex items-center gap-1 rounded text-xs font-semibold text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline focus-ring';

function OverviewReadOnly({ company, status, onEdit }) {
    const primaryName = personName(company.primary_person);
    const addressText = [company.adres_straat_nummer, [company.postcode, company.plaats].filter(Boolean).join(' '), company.land]
        .filter(Boolean)
        .join(', ');
    const websiteHref = company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : null;
    const tags = String(company.tags || '')
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean);

    const items = [
        { label: 'Contactpersoon', value: primaryName },
        { label: 'Hoofd e-mail', value: company.hoofd_email ? <a href={`mailto:${company.hoofd_email}`} className={LINK}>{company.hoofd_email}</a> : null },
        { label: 'Hoofd telefoon', value: company.hoofd_telefoon ? <a href={telHref(company.hoofd_telefoon)} className={LINK}>{company.hoofd_telefoon}</a> : null },
        { label: 'Login e-mail', value: company.login_email },
        { label: 'Adres', value: addressText },
        { label: 'Website', value: websiteHref ? <a href={websiteHref} target="_blank" rel="noreferrer" className={LINK}>{company.website}</a> : null },
        { label: 'KVK nummer', value: company.kvk_nummer },
        { label: 'BTW nummer', value: company.btw_nummer },
        { label: 'Bron', value: SOURCE_LABELS[company.bron] || company.bron },
        {
            label: 'Tags',
            value: tags.length ? (
                <span className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                        <Badge key={tag} icon="tag">{tag}</Badge>
                    ))}
                </span>
            ) : null,
        },
    ];
    if (status === 'gepauzeerd') {
        items.push({ label: 'Gepauzeerd sinds', value: company.gepauzeerd_op ? formatDate(company.gepauzeerd_op) : null });
        items.push({ label: 'Gepauzeerd tot', value: company.gepauzeerd_tot ? formatDate(company.gepauzeerd_tot) : 'Geen einddatum' });
        items.push({ label: 'Reden pauze', value: company.gepauzeerd_reden });
    }
    if (status === 'opgezegd') {
        items.push({ label: 'Opgezegd op', value: company.opgezegd_op ? formatDate(company.opgezegd_op) : null });
        items.push({ label: 'Opzegreden', value: company.opzegreden });
    }
    if (status === 'verloren') {
        items.push({ label: 'Verloren op', value: company.verloren_op ? formatDate(company.verloren_op) : null });
        items.push({ label: 'Verloren reden', value: company.verloren_reden });
    }

    return (
        <Card>
            <CardHeader
                icon="building"
                title="Klantgegevens"
                description="Bedrijfs- en contactgegevens van deze garage."
                actions={
                    <Button variant="secondary" size="sm" icon="edit" onClick={onEdit}>
                        Bewerken
                    </Button>
                }
            />
            <KeyValue items={items} columns={2} />
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

function RelatedGroup({ icon, tone = 'neutral', title, count, action, children }) {
    return (
        <div className="px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-zinc-900">
                    <IconTile icon={icon} tone={tone} size="sm" />
                    <span className="truncate">{title}</span>
                    {count !== undefined && count !== null ? (
                        <span className="rounded-full bg-zinc-100 px-1.5 text-2xs font-semibold tabular-nums text-zinc-600">{count}</span>
                    ) : null}
                </h3>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </div>
    );
}

function TabLink({ onClick, children }) {
    return (
        <button type="button" onClick={onClick} className={SMALL_LINK}>
            {children}
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </button>
    );
}

function CrmTaskRow({ task, href }) {
    const overdue = isOverdue(task.deadline);
    const status = CRM_TASK_STATUS[task.status] || { label: task.status || 'Open', tone: 'neutral' };
    const urgent = task.prioriteit === 'hoog' || task.prioriteit === 'kritiek';
    return (
        <li>
            <Link href={href} className="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-50 focus-ring">
                <StatusDot tone={status.tone} className="mt-1.5" label={status.label} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900 group-hover:underline group-hover:underline-offset-2">{task.titel}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                        <span>{status.label}</span>
                        {task.deadline ? (
                            <span className={cx('inline-flex items-center gap-1', overdue && 'font-semibold text-rose-700')}>
                                <Icon name="calendar" className="h-3 w-3" />
                                {formatShortDate(task.deadline)}
                                {overdue ? ', te laat' : ''}
                            </span>
                        ) : null}
                        {task.project ? <span className="truncate">{task.project}</span> : null}
                    </span>
                </span>
                {urgent ? <Badge tone={task.prioriteit === 'kritiek' ? 'danger' : 'warning'}>{CRM_TASK_PRIORITY[task.prioriteit]}</Badge> : null}
            </Link>
        </li>
    );
}

function RelatedPanel({ crmTasks, tasksUrl, companyId, openItems, activeMandate, mandates, activeModules, welcome, changeTab }) {
    const customerTasksUrl = tasksUrl ? `${tasksUrl}?klant=${companyId}` : null;
    const latestMandate = activeMandate || mandates[0] || null;
    const mandateTone = latestMandate ? MANDATE_STATUS_TONES[latestMandate.status] || 'neutral' : 'warning';

    return (
        <Card padded={false} as="aside" aria-labelledby="gerelateerd-titel">
            <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                <h2 id="gerelateerd-titel" className="section-heading">Gerelateerd</h2>
                <p className="section-description">Alles wat bij deze klant hoort, op een plek.</p>
            </div>
            <div className="divide-y divide-zinc-100">
                <RelatedGroup
                    icon="check-square"
                    tone="brand"
                    title="Taken"
                    count={crmTasks.length}
                    action={customerTasksUrl ? <Link href={customerTasksUrl} className={SMALL_LINK}>Alle taken<Icon name="chevron-right" className="h-3.5 w-3.5" /></Link> : null}
                >
                    {crmTasks.length === 0 ? (
                        <p className="text-sm text-zinc-500">Geen open taken voor deze klant.</p>
                    ) : (
                        <ul className="space-y-0.5">
                            {crmTasks.slice(0, 5).map((task) => (
                                <CrmTaskRow key={task.id} task={task} href={`${tasksUrl}?taak=${task.id}`} />
                            ))}
                        </ul>
                    )}
                    {customerTasksUrl ? (
                        <Link href={`${customerTasksUrl}&nieuw=1`} className={cx('mt-3 w-full justify-center', 'btn btn-secondary btn-sm')}>
                            <Icon name="plus" className="h-4 w-4 text-zinc-500" />
                            Nieuwe taak voor deze klant
                        </Link>
                    ) : null}
                </RelatedGroup>

                <RelatedGroup
                    icon="calendar"
                    tone="info"
                    title="Klantafspraken"
                    count={openItems.length}
                    action={<TabLink onClick={() => changeTab('activiteit', 'sectie-klantafspraken')}>Bekijken</TabLink>}
                >
                    {openItems.length === 0 ? (
                        <p className="text-sm text-zinc-500">Geen open taken of afspraken.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {openItems.slice(0, 4).map((item) => {
                                const overdue = isOverdue(item.due_at);
                                return (
                                    <li key={`${item.kind}-${item.id}`} className="flex min-w-0 items-start gap-2.5 text-sm">
                                        <Icon name={item.kind === 'Afspraak' ? 'calendar' : 'check-square'} className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium text-zinc-900">{item.titel}</span>
                                            <span className={cx('block text-xs', overdue ? 'font-semibold text-rose-700' : 'text-zinc-500')}>
                                                {item.kind}
                                                {item.due_at ? `, ${formatDateTime(item.due_at)}` : ''}
                                                {overdue ? ', te laat' : ''}
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {openItems.length > 4 && <p className="mt-2 text-xs text-zinc-500">En nog {openItems.length - 4} meer.</p>}
                </RelatedGroup>

                <RelatedGroup
                    icon="credit-card"
                    tone={activeMandate ? 'success' : 'warning'}
                    title="Incasso"
                    action={<TabLink onClick={() => changeTab('abonnement', 'sectie-incasso')}>Abonnement</TabLink>}
                >
                    <button
                        type="button"
                        onClick={() => changeTab('abonnement', 'sectie-incasso')}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-left hover:border-zinc-300 hover:bg-zinc-50 focus-ring"
                    >
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900">SEPA mandaat</span>
                            <span className="block truncate text-xs text-zinc-500">
                                {latestMandate ? latestMandate.mandaat_id : 'Nog geen mandaat vastgelegd'}
                            </span>
                        </span>
                        <Badge tone={mandateTone} dot>
                            {latestMandate ? MANDATE_STATUS_LABELS[latestMandate.status] || latestMandate.status : 'Ontbreekt'}
                        </Badge>
                    </button>
                </RelatedGroup>

                <RelatedGroup
                    icon="package"
                    tone="neutral"
                    title="Actieve modules"
                    count={activeModules.length}
                    action={<TabLink onClick={() => changeTab('abonnement', 'sectie-modules')}>Wijzigen</TabLink>}
                >
                    {activeModules.length === 0 ? (
                        <p className="text-sm text-zinc-500">Nog geen modules actief.</p>
                    ) : (
                        <ul className="flex flex-wrap gap-1.5">
                            {activeModules.map((row) => (
                                <li key={row.module_id}>
                                    <Badge tone="brand">
                                        {row.naam}
                                        {Number(row.aantal) > 1 ? <span className="tabular-nums opacity-80">x{row.aantal}</span> : null}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </RelatedGroup>

                <RelatedGroup
                    icon="mail"
                    tone={welcome.sent ? 'success' : 'warning'}
                    title="Welkomstmail"
                    action={<TabLink onClick={welcome.onOpen}>{welcome.sent ? 'Bekijken' : 'Versturen'}</TabLink>}
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-sm text-zinc-600">{welcome.sent ? welcome.text : 'Nog niet verstuurd.'}</p>
                        <Badge tone={welcome.sent ? 'success' : WELCOME_STATUS_TONES[welcome.status] || 'warning'} dot>
                            {welcome.sent ? 'Verstuurd' : WELCOME_STATUS_LABELS[welcome.status] || 'Concept'}
                        </Badge>
                    </div>
                </RelatedGroup>
            </div>
        </Card>
    );
}

function PeopleCard({ persons, seats, changeTab }) {
    const shown = persons.slice(0, 4);
    const activeSeats = seats.filter((seat) => seat.actief).length;
    return (
        <Card>
            <CardHeader
                icon="users"
                title="Contactpersonen"
                description={`${persons.length} ${persons.length === 1 ? 'persoon' : 'personen'}, ${activeSeats} actieve ${activeSeats === 1 ? 'gebruiker' : 'gebruikers'}`}
                actions={<TabLink onClick={() => changeTab('contact', 'sectie-contactpersonen')}>Alles</TabLink>}
                className="mb-4"
            />
            {shown.length === 0 ? (
                <EmptyState
                    compact
                    illustration="people"
                    title="Nog geen contactpersonen"
                    description="Voeg de eigenaar of een vaste contactpersoon toe."
                    action={
                        <Button size="sm" variant="secondary" icon="plus" onClick={() => changeTab('contact', 'sectie-contactpersonen')}>
                            Contactpersoon toevoegen
                        </Button>
                    }
                />
            ) : (
                <ul className="space-y-3">
                    {shown.map((person) => {
                        const name = personName(person) || 'Naamloos';
                        return (
                            <li key={person.id} className="flex min-w-0 items-center gap-3">
                                <Avatar name={name} size="md" />
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-900">
                                        <span className="truncate">{name}</span>
                                        {person.is_primary ? <Badge tone="brand">Hoofdcontact</Badge> : null}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">{person.rol ? roleLabel(person.rol) : person.email || 'Geen rol'}</p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    {person.telefoon ? (
                                        <a href={telHref(person.telefoon)} className="btn btn-ghost btn-sm btn-icon" aria-label={`${name} bellen`} title={person.telefoon}>
                                            <Icon name="phone" className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                    {person.email ? (
                                        <a href={`mailto:${person.email}`} className="btn btn-ghost btn-sm btn-icon" aria-label={`${name} mailen`} title={person.email}>
                                            <Icon name="mail" className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            {persons.length > shown.length && <p className="mt-3 text-xs text-zinc-500">En nog {persons.length - shown.length} meer.</p>}
        </Card>
    );
}

function NotesCard({ notes, onAddNote, changeTab }) {
    return (
        <Card>
            <CardHeader
                icon="message-square"
                title="Laatste notities"
                actions={
                    <Button variant="ghost" size="xs" icon="plus" onClick={onAddNote}>
                        Notitie
                    </Button>
                }
                className="mb-4"
            />
            {notes.length === 0 ? (
                <p className="text-sm text-zinc-500">Nog geen notities. Leg vast wat je met de klant bespreekt.</p>
            ) : (
                <ul className="space-y-4">
                    {notes.map((note) => (
                        <li key={note.id} className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900">{note.titel}</p>
                            {note.inhoud && <p className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm text-zinc-600">{note.inhoud}</p>}
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                                {note.creator ? <Avatar name={note.creator} size="xs" /> : null}
                                {note.creator ? `${note.creator}, ` : ''}
                                {formatDateTime(note.created_at)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-4">
                <TabLink onClick={() => changeTab('activiteit', 'sectie-tijdlijn')}>Volledige tijdlijn</TabLink>
            </div>
        </Card>
    );
}

function RecentActivityCard({ items, statusLabels, changeTab }) {
    return (
        <Card>
            <CardHeader
                icon="activity"
                title="Laatste activiteit"
                description="De meest recente gebeurtenissen in de tijdlijn."
                actions={<TabLink onClick={() => changeTab('activiteit', 'sectie-tijdlijn')}>Tijdlijn</TabLink>}
            />
            {items.length === 0 ? (
                <EmptyState compact bare illustration="inbox" title="Nog geen activiteit" description="Notities, statuswijzigingen en verstuurde mails verschijnen hier." />
            ) : (
                <ActivityList>
                    {items.map((activity) => {
                        const visual = activityVisual(activity);
                        const title = activity.type === 'status_wijziging' ? translateStatusText(activity.titel, statusLabels) : activity.titel;
                        return (
                            <ActivityItem
                                key={activity.id}
                                icon={visual.icon}
                                tone={visual.tone}
                                title={<span className="font-medium text-zinc-900">{title}</span>}
                                meta={`${activityTypeLabel(activity)}${activity.creator?.name ? `, ${activity.creator.name}` : ''}`}
                                time={formatShortDate(activity.created_at)}
                            />
                        );
                    })}
                </ActivityList>
            )}
        </Card>
    );
}

export default function OverviewTab({
    company,
    status,
    statusErrors,
    sourceOptions,
    recentNotes,
    openItems,
    crmTasks = [],
    tasksUrl,
    persons = [],
    seats = [],
    mandates = [],
    activeMandate,
    activeModules = [],
    activities,
    statusLabels,
    welcome,
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
    const recent = (activities?.data || []).filter((activity) => !isNoopStatusChange(activity, statusLabels)).slice(0, 5);

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

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="min-w-0 space-y-6 xl:col-span-2">
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

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <PeopleCard persons={persons} seats={seats} changeTab={changeTab} />
                        <NotesCard notes={notes} onAddNote={onAddNote} changeTab={changeTab} />
                    </div>

                    <RecentActivityCard items={recent} statusLabels={statusLabels} changeTab={changeTab} />
                </div>

                <div className="min-w-0">
                    <RelatedPanel
                        crmTasks={crmTasks}
                        tasksUrl={tasksUrl}
                        companyId={company.id}
                        openItems={openItems}
                        activeMandate={activeMandate}
                        mandates={mandates}
                        activeModules={activeModules}
                        welcome={welcome}
                        changeTab={changeTab}
                    />
                </div>
            </div>

            <Card className="border-rose-200/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <IconTile icon="trash" tone="danger" size="sm" />
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900">Klant verwijderen</h2>
                            <p className="mt-0.5 text-sm text-zinc-500">Verplaatst deze klant naar de prullenbak. Herstellen kan daarna nog.</p>
                        </div>
                    </div>
                    <Button variant="danger-ghost" className="ring-1 ring-inset ring-rose-200" onClick={onDeleteCompany}>
                        Naar prullenbak
                    </Button>
                </div>
            </Card>
        </div>
    );
}
