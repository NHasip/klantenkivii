import React from 'react';
import { Icon } from '../../../../components/icons';
import { ActivityItem, ActivityList, Avatar, Badge, Button, Card, CardHeader, EmptyState, IconTile, cx } from '../../../../components/ui';
import { isNoopStatusChange, translateStatusText } from '../../../../components/StatusBadge';
import {
    ACTIVITY_TYPE_LABELS,
    CHANNEL_LABELS,
    CheckboxField,
    FormActions,
    FormField,
    Pagination,
    TIMELINE_FILTERS,
    activityTypeLabel,
    activityVisual,
    dateShortcut,
    dayLabel,
    formatDateTime,
    formatTime,
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

function OpenList({ title, icon, tone, items, emptyText, onDone, busyId }) {
    return (
        <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Icon name={icon} className="h-4 w-4 text-zinc-400" />
                {title}
                <span className="rounded-full bg-zinc-100 px-1.5 text-2xs font-semibold tabular-nums text-zinc-600">{items.length}</span>
            </h3>
            {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500">{emptyText}</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((item) => {
                        const overdue = isOverdue(item.due_at);
                        return (
                            <li
                                key={item.id}
                                className={cx(
                                    'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
                                    overdue ? 'border-rose-200 bg-rose-50/40' : 'border-zinc-200 bg-white'
                                )}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <IconTile icon={icon} tone={overdue ? 'danger' : tone} size="sm" />
                                    <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold text-zinc-900">{item.titel}</p>
                                        {item.inhoud && <p className="mt-0.5 whitespace-pre-line break-words text-sm text-zinc-600">{item.inhoud}</p>}
                                        <p className={cx('mt-1 flex flex-wrap items-center gap-2 text-xs', overdue ? 'text-rose-700' : 'text-zinc-500')}>
                                            <Icon name="clock" className="h-3.5 w-3.5" />
                                            {item.due_at ? `Planning: ${formatDateTime(item.due_at)}` : 'Geen planning'}
                                            {overdue && <Badge tone="danger">Te laat</Badge>}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon="check"
                                    className="shrink-0 self-start"
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

function groupByDay(items) {
    const groups = [];
    items.forEach((activity) => {
        const label = dayLabel(activity.created_at);
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.items.push(activity);
        else groups.push({ label, items: [activity] });
    });
    return groups;
}

function Timeline({ activities, filter, setFilter, statusLabels }) {
    const all = (activities?.data || []).filter((activity) => !isNoopStatusChange(activity, statusLabels));
    const filtered = all.filter((activity) => matchesTimelineFilter(activity, filter));
    const groups = groupByDay(filtered);

    return (
        <Card>
            <CardHeader icon="activity" title="Tijdlijn" description="Alle activiteit rond deze klant, nieuwste eerst." />
            <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter tijdlijn">
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
                                'tap-target inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors focus-ring',
                                active ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50'
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
                    compact
                    illustration={all.length === 0 ? 'inbox' : 'search'}
                    title={all.length === 0 ? 'Nog geen activiteiten' : 'Niets gevonden'}
                    description={all.length === 0 ? 'Notities, statuswijzigingen en verstuurde mails verschijnen hier.' : 'Geen activiteiten van dit type op deze pagina.'}
                />
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <section key={group.label} aria-label={group.label}>
                            <h3 className="mb-3 text-xs font-semibold text-zinc-500 first-letter:uppercase">{group.label}</h3>
                            <ActivityList>
                                {group.items.map((activity) => {
                                    const visual = activityVisual(activity);
                                    const title = activity.type === 'status_wijziging' ? translateStatusText(activity.titel, statusLabels) : activity.titel;
                                    const meta = (
                                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span>{activityTypeLabel(activity)}</span>
                                            {activity.creator ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Avatar name={activity.creator.name} size="xs" className="h-4 w-4 text-[8px]" />
                                                    {activity.creator.name}
                                                </span>
                                            ) : null}
                                            {activity.due_at ? <span>Gepland: {formatDateTime(activity.due_at)}</span> : null}
                                            {activity.done_at ? <span className="text-emerald-700">Afgerond: {formatDateTime(activity.done_at)}</span> : null}
                                        </span>
                                    );
                                    return (
                                        <ActivityItem
                                            key={activity.id}
                                            icon={visual.icon}
                                            tone={visual.tone}
                                            title={<span className="break-words font-semibold text-zinc-900">{title}</span>}
                                            meta={meta}
                                            time={<time dateTime={activity.created_at} title={formatDateTime(activity.created_at)}>{formatTime(activity.created_at)}</time>}
                                        >
                                            {activity.inhoud ? (
                                                <p className="whitespace-pre-line break-words rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{activity.inhoud}</p>
                                            ) : null}
                                        </ActivityItem>
                                    );
                                })}
                            </ActivityList>
                        </section>
                    ))}
                </div>
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
                        <CardHeader icon="check-square" title="Open klantafspraken" description="Rond een taak of afspraak af zodra die gedaan is." />
                        <div className="space-y-6">
                            <OpenList title="Taken" icon="check-square" tone="warning" items={tasks} emptyText="Geen open taken." onDone={onMarkDone} busyId={doneBusyId} />
                            <OpenList title="Afspraken" icon="calendar" tone="info" items={appointments} emptyText="Geen open afspraken." onDone={onMarkDone} busyId={doneBusyId} />
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
