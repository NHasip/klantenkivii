import React from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, cx } from '../../../../components/ui';
import { CheckboxField, FormActions, FormField, formatDate, roleLabel } from './showUtils';

const LINK = 'text-indigo-700 underline-offset-2 hover:underline';

function SectionCard({ id, title, description, action, children }) {
    return (
        <section id={id} className="scroll-mt-48">
            <Card padded={false}>
                <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                    <CardHeader title={title} description={description} actions={action} />
                </div>
                {children}
            </Card>
        </section>
    );
}

function InlineForm({ id, title, onSubmit, children }) {
    return (
        <form id={id} onSubmit={onSubmit} noValidate className="scroll-mt-48 border-y border-zinc-200 bg-zinc-50/70 px-4 py-5 sm:px-5" aria-labelledby={`${id}-title`}>
            <h3 id={`${id}-title`} className="mb-4 text-sm font-semibold text-zinc-900">{title}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
        </form>
    );
}

function PersonsSection({ persons, form, showForm, editingId, onCreate, onEdit, onCancel, onSubmit, onDelete }) {
    return (
        <SectionCard
            id="sectie-contactpersonen"
            title="Contactpersonen"
            description="Wie je spreekt bij deze garage. De hoofdcontact staat ook bij Klantgegevens."
            action={
                !showForm || editingId ? (
                    <Button size="sm" onClick={onCreate}>
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
                    <div className="px-4 pb-5 sm:px-5">
                        <EmptyState
                            title="Nog geen contactpersonen"
                            description="Voeg de eigenaar of een vaste contactpersoon toe."
                            action={<Button size="sm" onClick={onCreate}>Contactpersoon toevoegen</Button>}
                        />
                    </div>
                )
            ) : (
                <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
                    {persons.map((person) => {
                        const name = `${person.voornaam || ''} ${person.achternaam || ''}`.trim() || 'Naamloos';
                        return (
                            <li
                                key={person.id}
                                className={cx(
                                    'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5',
                                    editingId === person.id && 'bg-indigo-50/50'
                                )}
                            >
                                <div className="min-w-0 sm:w-1/3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-zinc-900">{name}</p>
                                        {person.is_primary && <Badge tone="brand">Hoofdcontact</Badge>}
                                        {!person.active && <Badge>Inactief</Badge>}
                                    </div>
                                    <p className="text-xs text-zinc-500">{roleLabel(person.rol)}</p>
                                </div>
                                <div className="min-w-0 flex-1 text-sm">
                                    {person.email ? (
                                        <a href={`mailto:${person.email}`} className={cx(LINK, 'block truncate')}>{person.email}</a>
                                    ) : (
                                        <span className="text-zinc-400">Geen e-mail</span>
                                    )}
                                    {person.telefoon ? (
                                        <a href={`tel:${String(person.telefoon).replace(/[^\d+]/g, '')}`} className="block text-xs text-zinc-600 hover:underline">{person.telefoon}</a>
                                    ) : (
                                        <span className="block text-xs text-zinc-400">Geen telefoon</span>
                                    )}
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => onEdit(person)} aria-label={`${name} bewerken`}>
                                        Bewerken
                                    </Button>
                                    <Button variant="danger-ghost" size="sm" onClick={() => onDelete(person.id)} aria-label={`${name} verwijderen`}>
                                        Verwijderen
                                    </Button>
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
            title="Gebruikers"
            description={`Accounts binnen deze garage. ${activeCount} actief van ${seats.length}.`}
            action={
                !showForm || editingId ? (
                    <Button size="sm" onClick={onCreate}>
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
                    <div className="px-4 pb-5 sm:px-5">
                        <EmptyState
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
                                'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5',
                                editingId === seat.id && 'bg-indigo-50/50'
                            )}
                        >
                            <div className="min-w-0 sm:w-1/3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-zinc-900">{seat.naam}</p>
                                    {seat.actief ? <Badge tone="success">Actief</Badge> : <Badge>Inactief</Badge>}
                                </div>
                                <p className="text-xs text-zinc-500">{seat.rol_in_kivii ? roleLabel(seat.rol_in_kivii) : 'Geen rol'}</p>
                            </div>
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="truncate text-zinc-700">{seat.email}</p>
                                <p className="text-xs text-zinc-500">Aangemaakt {seat.aangemaakt_op ? formatDate(seat.aangemaakt_op) : 'onbekend'}</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Button variant="secondary" size="sm" onClick={() => onEdit(seat)} aria-label={`${seat.naam} bewerken`}>
                                    Bewerken
                                </Button>
                                <Button variant="danger-ghost" size="sm" onClick={() => onDelete(seat.id)} aria-label={`${seat.naam} verwijderen`}>
                                    Verwijderen
                                </Button>
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
