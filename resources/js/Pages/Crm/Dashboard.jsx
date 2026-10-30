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

const primaryButtonClass =
    'inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700';

function ButtonLink({ href, children }) {
    return (
        <a href={href} className={primaryButtonClass}>
            {children}
        </a>
    );
}

function Panel({ title, subtitle, action, children }) {
    return (
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            {(title || subtitle || action) && (
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-48">
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

function MetricCard({ label, value, sub, tone = 'default', href }) {
    const toneClasses = {
        default: 'border-zinc-200 bg-white',
        info: 'border-sky-200 bg-sky-50',
        danger: 'border-rose-200 bg-rose-50',
    };
    const className = cx(
        'block min-w-0 rounded-xl border p-4',
        toneClasses[tone] || toneClasses.default,
        href && 'transition hover:border-indigo-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1'
    );
    const content = (
        <>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-zinc-950">{value}</div>
            {sub ? <div className="mt-1 text-sm text-zinc-600">{sub}</div> : null}
        </>
    );

    return href ? (
        <a href={href} className={className}>
            {content}
        </a>
    ) : (
        <div className={className}>{content}</div>
    );
}

function daysLeftLabel(days) {
    if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dag' : 'dagen'} verlopen`;
    if (days === 0) return 'Verloopt vandaag';
    return `Nog ${days} ${days === 1 ? 'dag' : 'dagen'}`;
}

function TodayRow({ href, title, meta, overdue, badge }) {
    return (
        <li>
            <a
                href={href}
                className={cx(
                    'flex min-w-0 items-start justify-between gap-3 rounded-xl border bg-white p-3 transition hover:border-zinc-300',
                    overdue ? 'border-rose-300' : 'border-zinc-200'
                )}
            >
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-950" title={title}>{title}</div>
                    <div className="mt-1 text-xs text-zinc-600">{meta}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {badge ? <Badge>{badge}</Badge> : null}
                    {overdue ? <Badge tone="danger">Te laat</Badge> : null}
                </div>
            </a>
        </li>
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
    const hasDeadline = Boolean(task.deadline);

    return (
        <li className={cx('min-w-0 rounded-xl border bg-white p-4', overdue ? 'border-rose-300' : 'border-zinc-200')}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 max-w-full truncate text-sm font-semibold text-zinc-950" title={task.titel}>{task.titel}</div>
                        {overdue ? <Badge tone="danger">Te laat</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                        {task.project?.naam ? <span>Project: {task.project.naam}</span> : null}
                        <span>{hasDeadline ? `Deadline: ${formatDateTime(task.deadline)}` : 'Geen deadline'}</span>
                        {task.prioriteit ? <span>Prioriteit: {task.prioriteit.charAt(0).toUpperCase() + task.prioriteit.slice(1)}</span> : null}
                    </div>
                </div>
                <div className="shrink-0 text-xs font-semibold text-zinc-400">#{task.id}</div>
            </div>
        </li>
    );
}

function AppointmentRow({ item }) {
    const overdue = item.due_at ? new Date(item.due_at) < new Date() : false;
    return (
        <li className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 break-words text-sm font-semibold text-zinc-950">{item.titel}</div>
                        {overdue ? <Badge tone="danger">Verlopen</Badge> : null}
                    </div>
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
            className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
        >
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-zinc-950">{item.bedrijfsnaam}</div>
                <div className="mt-1 text-xs text-zinc-600">
                    Sinds {formatDate(item.since_at)} | {typeLabel}
                </div>
            </div>
            <div className="shrink-0 whitespace-nowrap text-sm font-semibold text-zinc-700">{formatInt(item.days)} dagen</div>
        </a>
    );
}

export default function Dashboard({ kpis, urls, meta, lists }) {
    const todayTasks = lists?.today?.tasks ?? [];
    const todayCustomer = lists?.today?.customer ?? [];
    const demoEnding = lists?.demo_ending ?? [];
    const customersUrl = (status) => `${urls.customers}?status=${encodeURIComponent(status)}`;
    const taskItems = lists?.tasks ?? [];
    const appointmentItems = lists?.appointments?.items ?? [];
    const appointmentsByCompany = lists?.appointments?.by_company ?? [];
    const demoDurationItems = lists?.status_duration?.demo ?? [];
    const activeDurationItems = lists?.status_duration?.active ?? [];
    const activeMissingSepaItems = lists?.active_missing_sepa ?? [];

    const tasksTone = kpis?.tasks_overdue > 0 ? 'danger' : kpis.tasks_open > 0 ? 'info' : 'default';
    const cancelledTone = kpis.cancelled_last_30 > 0 ? 'danger' : 'default';

    return (
        <>
            <Head title="Dashboard" />

            <div className="min-w-0 space-y-6 overflow-x-hidden">
                <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="h-1.5 w-full bg-sky-400" />
                    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[1.3fr_0.7fr]">
                        <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-500">Bijgewerkt om {meta.generated_at}</div>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Dashboard</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                                Helder overzicht van taken, afspraken, omzet en statusduur van je klanten.
                            </p>

                            <div className="mt-6">
                                <h2 className="text-base font-semibold text-zinc-950">Vandaag</h2>
                                <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-2">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mijn taken</div>
                                            <a href={urls.tasks} className="text-xs font-semibold text-indigo-700 hover:underline">Alle taken</a>
                                        </div>
                                        {todayTasks.length === 0 ? (
                                            <EmptyState text="Geen taken voor vandaag of te laat." />
                                        ) : (
                                            <ul className="space-y-2">
                                                {todayTasks.map((task) => (
                                                    <TodayRow
                                                        key={`t-${task.id}`}
                                                        href={task.url}
                                                        title={task.titel}
                                                        meta={`Deadline: ${formatDateTime(task.deadline)}`}
                                                        overdue={task.overdue}
                                                    />
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Klantafspraken en klanttaken</div>
                                        {todayCustomer.length === 0 ? (
                                            <EmptyState text="Geen klantafspraken voor vandaag of te laat." />
                                        ) : (
                                            <ul className="space-y-2">
                                                {todayCustomer.map((item) => (
                                                    <TodayRow
                                                        key={`a-${item.id}`}
                                                        href={item.garage_company.url}
                                                        title={item.titel}
                                                        meta={`${item.garage_company.bedrijfsnaam} | ${formatDateTime(item.due_at)}`}
                                                        overdue={item.overdue}
                                                        badge={item.type === 'afspraak' ? 'Afspraak' : 'Taak'}
                                                    />
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <MetricCard
                                label="Open taken"
                                value={formatInt(kpis.tasks_open)}
                                sub={`Te laat: ${formatInt(kpis.tasks_overdue)} | Binnen 7 dagen: ${formatInt(kpis.tasks_due_7)}`}
                                tone={tasksTone}
                                href={urls.tasks}
                            />
                            <MetricCard
                                label="MRR excl. btw"
                                value={formatEuro(kpis.mrr_excl)}
                                sub={`Alleen status Actief | Incl. btw ${formatEuro(kpis.mrr_incl)}`}
                                tone="info"
                            />
                            <MetricCard
                                label="Pijplijn (demo)"
                                value={formatEuro(kpis.demo_pipeline_excl)}
                                sub="Modules van demo-klanten, excl. btw. Telt niet mee in MRR."
                            />
                        </div>
                    </div>
                </section>

                <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Klanten totaal" value={formatInt(kpis.companies_total)} sub={`Actief: ${formatInt(kpis.companies_active)}`} href={urls.customers} />
                    <MetricCard label="Demo klanten" value={formatInt(kpis.demo_customers)} sub={`Gem. ${formatInt(kpis.demo_avg_days)} dagen`} tone="info" href={customersUrl('proefperiode')} />
                    <MetricCard label="Actieve klanten" value={formatInt(kpis.companies_active)} sub={`Gem. ${formatInt(kpis.active_avg_days)} dagen actief`} tone="info" href={customersUrl('actief')} />
                    <MetricCard
                        label="Opzeggingen (30d)"
                        value={formatInt(kpis.cancelled_last_30)}
                        sub={`Nieuw actief: ${formatInt(kpis.active_new_last_30)} | Demo aangevraagd: ${formatInt(kpis.demo_requested_last_30)}`}
                        tone={cancelledTone}
                        href={customersUrl('opgezegd')}
                    />
                </div>

                <Panel
                    title="Demo's die aflopen"
                    subtitle="Demo's die binnen 7 dagen eindigen of al verlopen zijn."
                    action={<ButtonLink href={customersUrl('proefperiode')}>Alle demo klanten</ButtonLink>}
                >
                    {demoEnding.length === 0 ? (
                        <EmptyState text="Geen demo's die binnenkort aflopen." />
                    ) : (
                        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {demoEnding.map((item) => (
                                <li key={item.id}>
                                    <a
                                        href={item.url}
                                        className={cx(
                                            'flex min-w-0 items-start justify-between gap-3 rounded-xl border bg-white p-4 transition hover:border-zinc-300',
                                            item.days_left < 0 ? 'border-rose-300' : 'border-zinc-200'
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-zinc-950">{item.bedrijfsnaam}</div>
                                            <div className="mt-1 text-xs text-zinc-600">Einddatum {formatDate(item.demo_eind_op)}</div>
                                        </div>
                                        <Badge tone={item.days_left < 0 ? 'danger' : item.days_left <= 2 ? 'info' : 'neutral'}>
                                            {daysLeftLabel(item.days_left)}
                                        </Badge>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                {kpis.active_missing_sepa > 0 && (
                    <details className="group min-w-0 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-zinc-950">
                                    Actieve klanten zonder complete SEPA{' '}
                                    <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                        {formatInt(kpis.active_missing_sepa)}
                                    </span>
                                </h2>
                                <p className="mt-1 text-sm text-zinc-600">Klik om de lijst te tonen. Vul de gegevens aan in de Incasso-tab per klant.</p>
                            </div>
                            <span className="text-sm font-semibold text-indigo-700">
                                <span className="group-open:hidden">Tonen</span>
                                <span className="hidden group-open:inline">Verbergen</span>
                            </span>
                        </summary>
                        <div className="mt-4 space-y-3">
                            {activeMissingSepaItems.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.url}
                                    className="block rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300"
                                >
                                    <div className="text-sm font-semibold text-zinc-900">{item.bedrijfsnaam}</div>
                                    <div className="mt-1 text-xs text-amber-900">{item.missing.join(', ')}</div>
                                </a>
                            ))}
                            {kpis.active_missing_sepa > activeMissingSepaItems.length ? (
                                <div className="text-xs text-zinc-500">
                                    En nog {formatInt(kpis.active_missing_sepa - activeMissingSepaItems.length)} andere klanten.
                                </div>
                            ) : null}
                        </div>
                    </details>
                )}

                <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                    <Panel
                        title="Demo statusduur"
                        subtitle="Aantal dagen dat klanten in demo-status staan."
                        action={
                            <ButtonLink href={`${urls.customers}?status=proefperiode`}>Bekijk demo klanten</ButtonLink>
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
                            <ButtonLink href={`${urls.customers}?status=actief`}>Bekijk actieve klanten</ButtonLink>
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

                <div className="grid min-w-0 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <Panel
                        title="Urgente taken"
                        subtitle="Open taken uit de takenlijst, gesorteerd op deadline. Klantafspraken staan bij Vandaag."
                        action={
                            <ButtonLink href={urls.tasks}>Naar taken</ButtonLink>
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

                    <div className="min-w-0 space-y-6">
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
                                            className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-semibold text-zinc-950">{row.garage_company.bedrijfsnaam}</div>
                                                <div className="mt-1 text-xs leading-5 text-zinc-600">
                                                    Volgende afspraak: {row.eerstvolgende.titel}
                                                    <br />
                                                    {formatDateTime(row.eerstvolgende.due_at)}
                                                </div>
                                            </div>
                                            <div className="shrink-0 whitespace-nowrap text-sm font-semibold text-zinc-700">{row.aantal} afspraken</div>
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
