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

function Badge({ children, tone = 'zinc' }) {
    const toneClasses = {
        zinc: 'bg-white text-zinc-700 ring-1 ring-zinc-200',
        lime: 'bg-[#F7FEE7] text-zinc-800 ring-1 ring-lime-200',
        dark: 'bg-[#F7FEE7] text-zinc-900 ring-1 ring-lime-300',
    }[tone];

    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses}`}>{children}</span>;
}

function Panel({ title, subtitle, action, children, className = '' }) {
    return (
        <section className={`rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_16px_50px_-34px_rgba(15,23,42,0.24)] ${className}`}>
            {(title || subtitle || action) && (
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        {title ? <h2 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h2> : null}
                        {subtitle ? <p className="mt-1 text-sm leading-6 text-zinc-600">{subtitle}</p> : null}
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
        accent: 'border-lime-200 bg-[#F7FEE7]',
        dark: 'border-lime-300 bg-[#F7FEE7]',
    }[tone];

    const labelTone = 'text-zinc-500';
    const subTone = 'text-zinc-600';

    return (
        <div className={`rounded-[24px] border p-5 shadow-sm shadow-[0_12px_32px_-28px_rgba(15,23,42,0.35)] ${toneClasses}`}>
            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${labelTone}`}>{label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
            {sub ? <div className={`mt-2 text-sm leading-6 ${subTone}`}>{sub}</div> : null}
        </div>
    );
}

function ActionLink({ href, title, subtitle, accent = 'zinc', className = '' }) {
    const accentClasses = {
        zinc: 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50',
        lime: 'border-lime-200 bg-[#F7FEE7] text-zinc-950 hover:border-lime-300 hover:bg-lime-100',
        dark: 'border-zinc-200 bg-white text-zinc-900 hover:border-lime-200 hover:bg-[#F7FEE7]',
    }[accent];

    return (
        <a
            href={href}
            className={`group rounded-[24px] border p-4 shadow-sm shadow-[0_12px_28px_-28px_rgba(15,23,42,0.4)] transition hover:translate-y-[-1px] ${accentClasses} ${className}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 max-w-md text-xs leading-5 text-zinc-600">{subtitle}</div>
                </div>
                <div className="text-sm font-medium text-zinc-500 transition group-hover:translate-x-0.5">Open</div>
            </div>
        </a>
    );
}

function EmptyState({ text }) {
    return (
        <div className="rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">
            {text}
        </div>
    );
}

function TaskRow({ task }) {
    const overdue = task.deadline ? new Date(task.deadline) < new Date() : false;

    return (
        <li className={`rounded-[20px] border bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm ${overdue ? 'border-zinc-900' : 'border-zinc-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-950">{task.titel}</div>
                        {task.project?.naam ? <Badge tone="lime">{task.project.naam}</Badge> : null}
                        {overdue ? <Badge tone="dark">Te laat</Badge> : null}
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
        <li className="rounded-[18px] border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm">
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

export default function Dashboard({ kpis, urls, meta, lists }) {
    const taskItems = lists?.tasks ?? [];
    const appointmentItems = lists?.appointments?.items ?? [];
    const appointmentsByCompany = lists?.appointments?.by_company ?? [];
    const tasksTone = kpis.tasks_overdue > 0 ? 'accent' : kpis.tasks_open > 0 ? 'accent' : 'default';

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_20px_70px_-36px_rgba(15,23,42,0.28)]">
                    <div className="h-1.5 w-full bg-lime-300" />
                    <div className="grid gap-6 p-6 xl:grid-cols-[1.35fr_0.85fr]">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                                Bijgewerkt om {meta.generated_at}
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                                Werkdashboard
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                                Een rustig overzicht van wat vandaag telt: acties die aandacht vragen,
                                afspraken die eraan komen en kerncijfers van je klantenbestand.
                            </p>

                            <div className="mt-6 grid gap-3 md:grid-cols-2">
                                <ActionLink
                                    href={urls.customers}
                                    title="Klanten"
                                    subtitle="Open klantoverzicht, beheer contactpersonen en werk direct verder vanuit bestaande klantdossiers."
                                    accent="lime"
                                    className="md:col-span-2"
                                />
                                <ActionLink
                                    href={urls.tasks}
                                    title="Taken"
                                    subtitle="Werk vanuit lijst of board aan je acties."
                                    accent="zinc"
                                />
                                <ActionLink
                                    href={urls.reports}
                                    title="Rapportages"
                                    subtitle="Bekijk groei, omzet en trends."
                                    accent="zinc"
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <MetricCard
                                label="Open taken"
                                value={formatInt(kpis.tasks_open)}
                                sub={`Te laat: ${formatInt(kpis.tasks_overdue)} | Binnen 7 dagen: ${formatInt(kpis.tasks_due_7)}`}
                                tone={tasksTone}
                            />
                            <MetricCard
                                label="Komende afspraken"
                                value={formatInt(appointmentItems.length)}
                                sub={`${formatInt(appointmentsByCompany.length)} klanten met afspraken`}
                                tone="accent"
                            />
                            <MetricCard
                                label="MRR excl. btw"
                                value={formatEuro(kpis.mrr_excl)}
                                sub={`BTW ${formatEuro(kpis.mrr_btw)} | Incl. ${formatEuro(kpis.mrr_incl)}`}
                                tone="accent"
                            />
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Klanten totaal"
                        value={formatInt(kpis.companies_total)}
                        sub={`Actief: ${formatInt(kpis.companies_active)}`}
                    />
                    <MetricCard
                        label="Leads laatste 30 dagen"
                        value={formatInt(kpis.leads_last_30)}
                        sub="Nieuwe instroom"
                        tone="accent"
                    />
                    <MetricCard
                        label="Nieuw actief"
                        value={formatInt(kpis.active_new_last_30)}
                        sub="Geactiveerd in de laatste 30 dagen"
                        tone="accent"
                    />
                    <MetricCard
                        label="Opzeggingen"
                        value={formatInt(kpis.cancelled_last_30)}
                        sub={`Demo aangevraagd: ${formatInt(kpis.demo_requested_last_30)}`}
                        tone={kpis.cancelled_last_30 > 0 ? 'accent' : 'default'}
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <Panel
                        title="Urgente taken"
                        subtitle="Open taken gesorteerd op deadline, zodat je direct ziet wat eerst moet."
                        action={
                            <a
                                href={urls.tasks}
                                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
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
                        <Panel title="Komende afspraken" subtitle="De eerstvolgende afspraken uit de planning.">
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

                        <Panel title="Afspraken per klant" subtitle="Welke klanten nu de meeste geplande contactmomenten hebben.">
                            {appointmentsByCompany.length === 0 ? (
                                <EmptyState text="Geen afspraken per klant gevonden." />
                            ) : (
                                <div className="space-y-3">
                                    {appointmentsByCompany.slice(0, 6).map((row) => (
                                        <a
                                            key={row.garage_company.id}
                                            href={row.garage_company.url}
                                            className="flex items-start justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-950">
                                                    {row.garage_company.bedrijfsnaam}
                                                </div>
                                                <div className="mt-2 text-xs leading-5 text-zinc-600">
                                                    Volgende afspraak: {row.eerstvolgende.titel}
                                                    <br />
                                                    {formatDateTime(row.eerstvolgende.due_at)}
                                                </div>
                                            </div>
                                            <Badge tone="zinc">{row.aantal} afspraken</Badge>
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
