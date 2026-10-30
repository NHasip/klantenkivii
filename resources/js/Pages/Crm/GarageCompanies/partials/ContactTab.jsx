import React from 'react';
import { Icon } from '../../../../components/icons';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, cx } from '../../../../components/ui';
import { CheckboxField, FormActions, FormField, formatDate, roleLabel, telHref } from './showUtils';

const LINK = 'text-indigo-700 underline-offset-2 hover:underline';

function SectionCard({ id, icon, title, description, action, children }) {
    return (
        <section id={id} className="scroll-mt-48">
            <Card padded={false}>
                <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                    <CardHeader icon={icon} title={title} description={description} actions={action} />
                </div>
                {children}
            </Card>
        </section>
    );
}

function InlineForm({ id, title, onSubmit, children }) {
    return (
        <form id={id} onSubmit={onSubmit} noValidate className="scroll-mt-48 border-y border-zinc-200 bg-zinc-50/70 px-5 py-5 sm:px-6" aria-labelledby={`${id}-title`}>
            <h3 id={`${id}-title`} className="mb-4 text-sm font-semibold text-zinc-900">{title}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
        </form>
    );
}

function PersonsSection({ persons, form, showForm, editingId, onCreate, onEdit, onCancel, onSubmit, onDelete }) {
    return (
        <SectionCard
            id="sectie-contactpersonen"
            icon="users"
            title="Contactpersonen"
            description="Wie je spreekt bij deze garage. De hoofdcontact staat ook bij Klantgegevens."
            action={
                !showForm || editingId ? (
                    <Button size="sm" icon="plus" onClick={onCreate}>
                        Contactpersoon toevoegen
                    </Button>
                ) : null
            }
        >
            {showForm && (
                <InlineForm id="person-form" title={editingId ? 'Contactpersoon bewerken' : 'Nieuwe contactpersoon'} onSubmit={onSubmit}>
                    <FormField form={form} name="voornaam" id="personForm-voornaam" label="Voornaam" required autoComplete="off" />
                    <FormField form={form} name="achternaam" id="personForm-achternaam" label="Achternaam" required autoComplete="off" />
                    <FormField form={form} name="email" id="personForm-email" label="E-mail" type="email" required autoComplete="off" />
                    <FormField form={form} name="telefoon" id="personForm-telefoon" label="Telefoon" type="tel" autoComplete="off" />
                    <FormField form={form} name="rol" id="personForm-rol" label="Rol" className="sm:col-span-2" placeholder="Bijvoorbeeld eigenaar, administratie, monteur" />
                    <div className="flex flex-col gap-1 sm:col-span-2 sm:flex-row sm:gap-6">
                        <CheckboxField
                            id="personForm-is-primary"
                            label="Hoofdcontact"
                            description="Vervangt de huidige hoofdcontact."
                            checked={form.data.is_primary}
                            onChange={(value) => form.setData('is_primary', value)}
                        />
                        <CheckboxField id="personForm-active" label="Actief" checked={form.data.active} onChange={(value) => form.setData('active', value)} />
                    </div>
                    <div className="sm:col-span-2">
                        <FormActions form={form}>
                            <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                                Annuleren
                            </Button>
                            <Button type="submit" loading={form.processing}>
                                {form.processing ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                        </FormActions>
                    </div>
                </InlineForm>
            )}

            {persons.length === 0 ? (
                !showForm && (
                    <div className="px-5 pb-6 sm:px-6">
                        <EmptyState
                            illustration="people"
                            title="Nog geen contactpersonen"
                            description="Voeg de eigenaar of een vaste contactpersoon toe."
                            action={<Button size="sm" onClick={onCreate}>Contactpersoon toevoegen</Button>}
                        />
                    </div>
                )
            ) : (
                <ul className={cx('grid grid-cols-1 gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-6 xl:grid-cols-3', showForm && 'pt-5')}>
                    {persons.map((person) => {
                        const name = `${person.voornaam || ''} ${person.achternaam || ''}`.trim() || 'Naamloos';
                        return (
                            <li
                                key={person.id}
                                className={cx(
                                    'flex min-w-0 flex-col rounded-2xl border bg-white p-4 transition-colors',
                                    editingId === person.id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-zinc-200',
                                    !person.active && 'bg-zinc-50/70'
                                )}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <Avatar name={name} size="lg" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-zinc-900">{name}</p>
                                        <p className="truncate text-sm text-zinc-500">{person.rol ? roleLabel(person.rol) : 'Geen rol'}</p>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {person.is_primary && <Badge tone="brand" icon="check">Hoofdcontact</Badge>}
                                            {!person.active && <Badge>Inactief</Badge>}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1.5 text-sm">
                                    {person.email ? (
                                        <a href={`mailto:${person.email}`} className="flex min-w-0 items-center gap-2 rounded text-zinc-700 hover:text-indigo-800 focus-ring">
                                            <Icon name="mail" className="h-4 w-4 shrink-0 text-zinc-400" />
                                            <span className="truncate">{person.email}</span>
                                        </a>
                                    ) : (
                                        <span className="flex items-center gap-2 text-zinc-400"><Icon name="mail" className="h-4 w-4" />Geen e-mail</span>
                                    )}
                                    {person.telefoon ? (
                                        <a href={telHref(person.telefoon)} className="flex items-center gap-2 rounded text-zinc-700 hover:text-indigo-800 focus-ring">
                                            <Icon name="phone" className="h-4 w-4 shrink-0 text-zinc-400" />
                                            {person.telefoon}
                                        </a>
                                    ) : (
                                        <span className="flex items-center gap-2 text-zinc-400"><Icon name="phone" className="h-4 w-4" />Geen telefoon</span>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center gap-1 border-t border-zinc-100 pt-3">
                                    {person.telefoon ? (
                                        <a href={telHref(person.telefoon)} className="btn btn-secondary btn-sm btn-icon" aria-label={`${name} bellen`} title="Bellen">
                                            <Icon name="phone" className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                    {person.email ? (
                                        <a href={`mailto:${person.email}`} className="btn btn-secondary btn-sm btn-icon" aria-label={`${name} mailen`} title="Mailen">
                                            <Icon name="mail" className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                    <span className="flex-1" />
                                    <Button variant="ghost" size="sm" icon="edit" onClick={() => onEdit(person)} aria-label={`${name} bewerken`}>
                                        Bewerken
                                    </Button>
                                    <Button variant="danger-ghost" size="sm" iconOnly icon="trash" onClick={() => onDelete(person.id)} aria-label={`${name} verwijderen`} title="Verwijderen" />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

function SeatsSection({ seats, form, showForm, editingId, onCreate, onEdit, onCancel, onSubmit, onDelete }) {
    const activeCount = seats.filter((seat) => seat.actief).length;
    return (
        <SectionCard
            id="sectie-gebruikers"
            icon="key"
            title="Gebruikers"
            description={`Accounts binnen deze garage. ${activeCount} actief van ${seats.length}.`}
            action={
                !showForm || editingId ? (
                    <Button size="sm" icon="plus" onClick={onCreate}>
                        Gebruiker toevoegen
                    </Button>
                ) : null
            }
        >
            {showForm && (
                <InlineForm id="seat-form" title={editingId ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'} onSubmit={onSubmit}>
                    <FormField form={form} name="naam" id="seatForm-naam" label="Naam" required autoComplete="off" />
                    <FormField form={form} name="email" id="seatForm-email" label="E-mail" type="email" required autoComplete="off" />
                    <FormField form={form} name="rol_in_kivii" id="seatForm-rol-in-kivii" label="Rol in Kivii" placeholder="Bijvoorbeeld eigenaar, monteur" />
                    <FormField form={form} name="aangemaakt_op" id="seatForm-aangemaakt-op" label="Aangemaakt op" type="date" />
                    <CheckboxField id="seatForm-actief" label="Actief" description="Telt mee als actieve gebruiker." checked={form.data.actief} onChange={(value) => form.setData('actief', value)} className="sm:col-span-2" />
                    <div className="sm:col-span-2">
                        <FormActions form={form}>
                            <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                                Annuleren
                            </Button>
                            <Button type="submit" loading={form.processing}>
                                {form.processing ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                        </FormActions>
                    </div>
                </InlineForm>
            )}

            {seats.length === 0 ? (
                !showForm && (
                    <div className="px-5 pb-6 sm:px-6">
                        <EmptyState
                            illustration="people"
                            title="Nog geen gebruikers"
                            description="Voeg de accounts toe die deze garage in Kivii gebruikt."
                            action={<Button size="sm" onClick={onCreate}>Gebruiker toevoegen</Button>}
                        />
                    </div>
                )
            ) : (
                <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                    {seats.map((seat) => (
                        <li
                            key={seat.id}
                            className={cx(
                                'flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6',
                                editingId === seat.id && 'bg-indigo-50/50'
                            )}
                        >
                            <div className="flex min-w-0 items-center gap-3 sm:w-1/3">
                                <Avatar name={seat.naam} size="md" className={seat.actief ? '' : 'opacity-60'} />
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-zinc-900">{seat.naam}</p>
                                        {seat.actief ? <Badge tone="success" dot>Actief</Badge> : <Badge>Inactief</Badge>}
                                    </div>
                                    <p className="text-xs text-zinc-500">{seat.rol_in_kivii ? roleLabel(seat.rol_in_kivii) : 'Geen rol'}</p>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="flex min-w-0 items-center gap-2 text-zinc-700"><Icon name="mail" className="h-4 w-4 shrink-0 text-zinc-400" /><span className="truncate">{seat.email}</span></p>
                                <p className="text-xs text-zinc-500">Aangemaakt {seat.aangemaakt_op ? formatDate(seat.aangemaakt_op) : 'onbekend'}</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Button variant="ghost" size="sm" icon="edit" onClick={() => onEdit(seat)} aria-label={`${seat.naam} bewerken`}>
                                    Bewerken
                                </Button>
                                <Button variant="danger-ghost" size="sm" iconOnly icon="trash" onClick={() => onDelete(seat.id)} aria-label={`${seat.naam} verwijderen`} title="Verwijderen" />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

export default function ContactTab({ persons, seats, personProps, seatProps }) {
    return (
        <div className="space-y-6">
            <PersonsSection persons={persons} {...personProps} />
            <SeatsSection seats={seats} {...seatProps} />
        </div>
    );
}
