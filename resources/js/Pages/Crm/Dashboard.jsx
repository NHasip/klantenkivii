import React from 'react';
import { Head } from '@inertiajs/react';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `EUR ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function formatInt(value) {
    try {
        return new Intl.NumberFormat('nl-NL').format(value ?? 0);
    } catch {
        return String(value ?? 0);
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';

    try {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(dateString));
    } catch {
        return String(dateString);
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '-';

    try {
        return new Intl.DateTimeFormat('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(isoString));
    } catch {
        return String(isoString);
    }
}

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

function Badge({ children, tone = 'neutral' }) {
    const toneClasses = {
        neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
        info: 'bg-sky-100 text-sky-800 ring-sky-200',
        danger: 'bg-rose-100 text-rose-700 ring-rose-200',
    };

    return (
        <span
            className={cx(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                toneClasses[tone] || toneClasses.neutral
            )}
        >
            {children}
        </span>
    );
}

function Panel({ title, subtitle, action, children }) {
    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            {(title || subtitle || action) && (
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        {title ? <h2 className="text-base font-semibold text-zinc-950">{title}</h2> : null}
                        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

function MetricCard({ label, value, sub, tone = 'default' }) {
    const toneClasses = {
        default: 'border-zinc-200 bg-white',
        info: 'border-sky-200 bg-sky-50',
        danger: 'border-rose-200 bg-rose-50',
    };

    return (
        <div className={cx('rounded-xl border p-4', toneClasses[tone] || toneClasses.default)}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{value}</div>
            {sub ? <div className="mt-1 text-sm text-zinc-600">{sub}</div> : null}
        </div>
    );
}

function QuickLink({ href, title, subtitle }) {
    return (
        <a
            href={href}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm"
        >
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <div className="mt-1 text-xs leading-5 text-zinc-600">{subtitle}</div>
        </a>
    );
}

function EmptyState({ text }) {
    return (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">
            {text}
        </div>
    );
}

function TaskRow({ task }) {
    const overdue = task.deadline ? new Date(task.deadline) < new Date() : false;

    return (
        <li className={cx('rounded-xl border bg-white p-4', overdue ? 'border-rose-300' : 'border-zinc-200')}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-950">{task.titel}</div>
                        {task.project?.naam ? <Badge tone="info">{task.project.naam}</Badge> : null}
                        {overdue ? <Badge tone="danger">Te laat</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                        <span>Deadline: {formatDateTime(task.deadline)}</span>
                        {task.prioriteit ? <span>Prioriteit: {task.prioriteit}</span> : null}
                    </div>
                </div>
                <div className="shrink-0 text-xs font-semibold text-zinc-400">#{task.id}</div>
            </div>
        </li>
    );
}

function AppointmentRow({ item }) {
    return (
        <li className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-950">{item.titel}</div>
                    <div className="mt-2 text-xs leading-5 text-zinc-600">
                        {formatDateTime(item.due_at)}
                        {item.garage_company?.bedrijfsnaam ? (
                            <>
                                {' | '}
                                <a href={item.garage_company.url} className="font-semibold text-zinc-900 hover:underline">
                                    {item.garage_company.bedrijfsnaam}
                                </a>
                            </>
                        ) : null}
                    </div>
                </div>
                <div className="shrink-0 text-xs font-semibold text-zinc-400">#{item.id}</div>
            </div>
        </li>
    );
}

function DurationRow({ item, typeLabel }) {
    return (
        <a
            href={item.url}
            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
        >
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-950">{item.bedrijfsnaam}</div>
                <div className="mt-1 text-xs text-zinc-600">
                    Sinds {formatDate(item.since_at)} | {typeLabel}
                </div>
            </div>
            <Badge tone="info">{formatInt(item.days)} dagen</Badge>
        </a>
    );
}

export default function Dashboard({ kpis, urls, meta, lists }) {
    const taskItems = lists?.tasks ?? [];
    const appointmentItems = lists?.appointments?.items ?? [];
    const appointmentsByCompany = lists?.appointments?.by_company ?? [];
    const demoDurationItems = lists?.status_duration?.demo ?? [];
    const activeDurationItems = lists?.status_duration?.active ?? [];

    const tasksTone = kpis.tasks_overdue > 0 ? 'danger' : kpis.tasks_open > 0 ? 'info' : 'default';
    const cancelledTone = kpis.cancelled_last_30 > 0 ? 'danger' : 'default';

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="h-1.5 w-full bg-sky-400" />
                    <div className="grid gap-6 p-6 xl:grid-cols-[1.3fr_0.7fr]">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                                Bijgewerkt om {meta.generated_at}
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Dashboard</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                                Helder overzicht van taken, afspraken, omzet en statusduur van je klanten.
                            </p>

                            <div className="mt-6 grid gap-3 md:grid-cols-3">
                                <QuickLink
                                    href={urls.customers}
                                    title="Klanten"
                                    subtitle="Beheer klanten, statussen en contactpersonen."
                                />
                                <QuickLink href={urls.tasks} title="Taken" subtitle="Open je takenlijst en werk direct door." />
                                <QuickLink href={urls.reports} title="Rapportages" subtitle="Bekijk omzet en trends over tijd." />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <MetricCard
                                label="Open taken"
                                value={formatInt(kpis.tasks_open)}
                                sub={`Te laat: ${formatInt(kpis.tasks_overdue)} | Binnen 7 dagen: ${formatInt(kpis.tasks_due_7)}`}
                                tone={tasksTone}
                            />
                            <MetricCard
                                label="MRR excl. btw"
                                value={formatEuro(kpis.mrr_excl)}
                                sub={`BTW ${formatEuro(kpis.mrr_btw)} | Incl. ${formatEuro(kpis.mrr_incl)}`}
                                tone="info"
                            />
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Klanten totaal" value={formatInt(kpis.companies_total)} sub={`Actief: ${formatInt(kpis.companies_active)}`} />
                    <MetricCard label="Demo klanten" value={formatInt(kpis.demo_customers)} sub={`Gem. ${formatInt(kpis.demo_avg_days)} dagen`} tone="info" />
                    <MetricCard label="Gem. actief duur" value={`${formatInt(kpis.active_avg_days)} dagen`} sub="Gemiddelde tijd in actief status" tone="info" />
                    <MetricCard
                        label="Opzeggingen (30d)"
                        value={formatInt(kpis.cancelled_last_30)}
                        sub={`Nieuw actief: ${formatInt(kpis.active_new_last_30)} | Demo aangevraagd: ${formatInt(kpis.demo_requested_last_30)}`}
                        tone={cancelledTone}
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Panel
                        title="Demo statusduur"
                        subtitle="Aantal dagen dat klanten in demo-status staan."
                        action={
                            <a
                                href={`${urls.customers}?status=proefperiode`}
                                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Bekijk demo klanten
                            </a>
                        }
                    >
                        {demoDurationItems.length === 0 ? (
                            <EmptyState text="Geen klanten met status Demo." />
                        ) : (
                            <div className="space-y-3">
                                {demoDurationItems.slice(0, 8).map((item) => (
                                    <DurationRow key={item.id} item={item} typeLabel="Demo" />
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Actief statusduur"
                        subtitle="Aantal dagen dat klanten actief zijn."
                        action={
                            <a
                                href={`${urls.customers}?status=actief`}
                                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Bekijk actieve klanten
                            </a>
                        }
                    >
                        {activeDurationItems.length === 0 ? (
                            <EmptyState text="Geen actieve klanten gevonden." />
                        ) : (
                            <div className="space-y-3">
                                {activeDurationItems.slice(0, 8).map((item) => (
                                    <DurationRow key={item.id} item={item} typeLabel="Actief" />
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <Panel
                        title="Urgente taken"
                        subtitle="Open taken gesorteerd op deadline."
                        action={
                            <a
                                href={urls.tasks}
                                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Naar taken
                            </a>
                        }
                    >
                        {taskItems.length === 0 ? (
                            <EmptyState text="Geen open taken gevonden." />
                        ) : (
                            <ul className="grid gap-3 lg:grid-cols-2">
                                {taskItems.map((task) => (
                                    <TaskRow key={task.id} task={task} />
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <div className="space-y-6">
                        <Panel title="Komende afspraken" subtitle="Eerstvolgende afspraken uit de planning.">
                            {appointmentItems.length === 0 ? (
                                <EmptyState text="Geen komende afspraken." />
                            ) : (
                                <ul className="space-y-3">
                                    {appointmentItems.slice(0, 6).map((item) => (
                                        <AppointmentRow key={item.id} item={item} />
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel title="Afspraken per klant" subtitle="Klanten met de meeste geplande contactmomenten.">
                            {appointmentsByCompany.length === 0 ? (
                                <EmptyState text="Geen afspraken per klant gevonden." />
                            ) : (
                                <div className="space-y-3">
                                    {appointmentsByCompany.slice(0, 6).map((row) => (
                                        <a
                                            key={row.garage_company.id}
                                            href={row.garage_company.url}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-950">{row.garage_company.bedrijfsnaam}</div>
                                                <div className="mt-1 text-xs leading-5 text-zinc-600">
                                                    Volgende afspraak: {row.eerstvolgende.titel}
                                                    <br />
                                                    {formatDateTime(row.eerstvolgende.due_at)}
                                                </div>
                                            </div>
                                            <Badge tone="neutral">{row.aantal} afspraken</Badge>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>
                </div>
            </div>
        </>
    );
}

