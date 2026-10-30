import React from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, cx } from '../../../../components/ui';
import { isNoopStatusChange, translateStatusText } from '../../../../components/StatusBadge';
import {
    ACTIVITY_TYPE_LABELS,
    CHANNEL_LABELS,
    CheckboxField,
    FormActions,
    FormField,
    Pagination,
    TIMELINE_FILTERS,
    dateShortcut,
    formatDateTime,
    isOverdue,
    matchesTimelineFilter,
} from './showUtils';

const SHORTCUTS = [
    ['vandaag', 'Vandaag'],
    ['morgen', 'Morgen'],
    ['volgende_week', 'Volgende week'],
];

function TaskForm({ form, onSubmit, reminderChannels }) {
    return (
        <Card as="form" onSubmit={onSubmit} noValidate aria-labelledby="task-form-title">
            <h2 id="task-form-title" className="mb-4 text-base font-semibold text-zinc-900">Nieuwe taak of afspraak</h2>
            <div className="space-y-4">
                <FormField
                    form={form}
                    name="type"
                    id="taskForm-type"
                    label="Type"
                    as="select"
                    onChange={(e) => {
                        const type = e.target.value;
                        // Taken krijgen standaard een herinnering; bij afspraken kies je zelf.
                        form.setData((data) => ({ ...data, type, createReminder: type === 'taak' ? true : data.createReminder }));
                    }}
                >
                    <option value="taak">Taak</option>
                    <option value="afspraak">Afspraak</option>
                </FormField>
                <FormField form={form} name="titel" id="taskForm-titel" label="Titel" required placeholder={form.data.type === 'afspraak' ? 'Bijvoorbeeld demo op locatie' : 'Bijvoorbeeld terugbellen over offerte'} />
                <FormField form={form} name="inhoud" id="taskForm-inhoud" label="Omschrijving" as="textarea" rows={3} />
                <div>
                    <FormField form={form} name="due_at" id="taskForm-due-at" label="Planning" type="datetime-local" />
                    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Snelkeuze planning">
                        {SHORTCUTS.map(([kind, label]) => (
                            <Button key={kind} variant="secondary" size="xs" onClick={() => form.setData('due_at', dateShortcut(kind))}>
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
                <CheckboxField id="taskForm-create-reminder" label="Herinnering instellen" checked={form.data.createReminder} onChange={(value) => form.setData('createReminder', value)} />
                {form.data.createReminder && (
                    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
                        <FormField
                            form={form}
                            name="remind_at"
                            id="taskForm-remind-at"
                            label="Tijdstip herinnering"
                            type="datetime-local"
                            hint="Leeg laten: herinnering op het tijdstip van de planning, of over een uur."
                        />
                        <FormField form={form} name="channel" id="taskForm-channel" label="Kanaal" as="select">
                            {(reminderChannels || []).map((channel) => (
                                <option key={channel} value={channel}>
                                    {CHANNEL_LABELS[channel] || channel}
                                </option>
                            ))}
                        </FormField>
                    </div>
                )}
                <FormActions form={form}>
                    <Button type="submit" loading={form.processing}>
                        {form.processing ? 'Opslaan...' : form.data.type === 'afspraak' ? 'Afspraak toevoegen' : 'Taak toevoegen'}
                    </Button>
                </FormActions>
            </div>
        </Card>
    );
}

function OpenList({ title, items, emptyText, onDone, busyId }) {
    return (
        <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                {title} <Badge>{items.length}</Badge>
            </h3>
            {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500">{emptyText}</p>
            ) : (
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                    {items.map((item) => {
                        const overdue = isOverdue(item.due_at);
                        return (
                            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold text-zinc-900">{item.titel}</p>
                                    {item.inhoud && <p className="mt-0.5 whitespace-pre-line break-words text-sm text-zinc-600">{item.inhoud}</p>}
                                    <p className={cx('mt-1 flex flex-wrap items-center gap-2 text-xs', overdue ? 'text-rose-700' : 'text-zinc-500')}>
                                        {item.due_at ? `Planning: ${formatDateTime(item.due_at)}` : 'Geen planning'}
                                        {overdue && <Badge tone="danger">Te laat</Badge>}
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="shrink-0"
                                    loading={busyId === item.id}
                                    disabled={busyId !== null && busyId !== undefined}
                                    onClick={() => onDone(item.id)}
                                    aria-label={`${item.titel} afronden`}
                                >
                                    Afronden
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function NoteForm({ form, onSubmit }) {
    return (
        <Card as="form" onSubmit={onSubmit} noValidate aria-labelledby="note-form-title">
            <h2 id="note-form-title" className="mb-4 text-base font-semibold text-zinc-900">Nieuwe notitie</h2>
            <div className="space-y-4">
                <FormField form={form} name="titel" id="noteForm-titel" label="Titel" placeholder="Notitie" hint="Leeg laten wordt Notitie." />
                <FormField form={form} name="inhoud" id="noteForm-inhoud" label="Notitie" as="textarea" rows={4} required />
                <FormActions form={form}>
                    <Button type="submit" loading={form.processing}>
                        {form.processing ? 'Opslaan...' : 'Notitie toevoegen'}
                    </Button>
                </FormActions>
            </div>
        </Card>
    );
}

function Timeline({ activities, filter, setFilter, statusLabels }) {
    const all = (activities?.data || []).filter((activity) => !isNoopStatusChange(activity, statusLabels));
    const filtered = all.filter((activity) => matchesTimelineFilter(activity, filter));

    return (
        <Card>
            <CardHeader title="Tijdlijn" description="Alle activiteit rond deze klant, nieuwste eerst." />
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter tijdlijn">
                {TIMELINE_FILTERS.map((item) => {
                    const count = item.key === 'alles' ? all.length : all.filter((activity) => matchesTimelineFilter(activity, item.key)).length;
                    const active = filter === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setFilter(item.key)}
                            className={cx(
                                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
                                active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                            )}
                        >
                            {item.label}
                            <span className={cx('tabular-nums', active ? 'text-zinc-300' : 'text-zinc-500')}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    title={all.length === 0 ? 'Nog geen activiteiten' : 'Niets gevonden'}
                    description={all.length === 0 ? 'Notities, statuswijzigingen en verstuurde mails verschijnen hier.' : 'Geen activiteiten van dit type op deze pagina.'}
                />
            ) : (
                <ol className="relative space-y-4 border-l border-zinc-200 pl-5">
                    {filtered.map((activity) => (
                        <li key={activity.id} className="relative">
                            <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-zinc-400 ring-1 ring-zinc-200" aria-hidden="true" />
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                <p className="min-w-0 break-words text-sm font-semibold text-zinc-900">
                                    {activity.type === 'status_wijziging' ? translateStatusText(activity.titel, statusLabels) : activity.titel}
                                </p>
                                {activity.creator && <p className="text-xs font-medium text-zinc-500">{activity.creator.name}</p>}
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                {activity.type ? ACTIVITY_TYPE_LABELS[activity.type] || activity.type.replace(/_/g, ' ') : 'Activiteit'} · {formatDateTime(activity.created_at)}
                            </p>
                            {activity.inhoud && <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-700">{activity.inhoud}</p>}
                            {(activity.due_at || activity.done_at) && (
                                <p className="mt-2 text-xs text-zinc-500">
                                    {activity.due_at && `Gepland: ${formatDateTime(activity.due_at)}`}
                                    {activity.due_at && activity.done_at ? ' · ' : ''}
                                    {activity.done_at && `Afgerond: ${formatDateTime(activity.done_at)}`}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            <Pagination links={activities?.links} lastPage={activities?.last_page} tabKey="activiteit" />
        </Card>
    );
}

export default function ActivityTab({
    taskForm,
    onSubmitTask,
    reminderChannels,
    tasks,
    appointments,
    onMarkDone,
    doneBusyId,
    noteForm,
    onSubmitNote,
    activities,
    timelineFilter,
    setTimelineFilter,
    statusLabels,
}) {
    return (
        <div className="space-y-6">
            <section id="sectie-klantafspraken" className="scroll-mt-48">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="min-w-0 lg:col-span-1">
                        <TaskForm form={taskForm} onSubmit={onSubmitTask} reminderChannels={reminderChannels} />
                    </div>
                    <Card className="min-w-0 lg:col-span-2">
                        <CardHeader title="Open klantafspraken" description="Rond een taak of afspraak af zodra die gedaan is." />
                        <div className="space-y-6">
                            <OpenList title="Taken" items={tasks} emptyText="Geen open taken." onDone={onMarkDone} busyId={doneBusyId} />
                            <OpenList title="Afspraken" items={appointments} emptyText="Geen open afspraken." onDone={onMarkDone} busyId={doneBusyId} />
                        </div>
                    </Card>
                </div>
            </section>

            <section id="sectie-tijdlijn" className="scroll-mt-48">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="min-w-0 lg:col-span-1">
                        <NoteForm form={noteForm} onSubmit={onSubmitNote} />
                    </div>
                    <div className="min-w-0 lg:col-span-2">
                        <Timeline activities={activities} filter={timelineFilter} setFilter={setTimelineFilter} statusLabels={statusLabels} />
                    </div>
                </div>
            </section>
        </div>
    );
}
