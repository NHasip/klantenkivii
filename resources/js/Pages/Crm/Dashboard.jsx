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
        zinc: 'bg-zinc-100 text-zinc-700',
        emerald: 'bg-emerald-100 text-emerald-800',
        amber: 'bg-amber-100 text-amber-800',
        rose: 'bg-rose-100 text-rose-800',
        sky: 'bg-sky-100 text-sky-800',
        lime: 'bg-lime-100 text-lime-800',
    }[tone];

    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses}`}>{children}</span>;
}

function Panel({ title, subtitle, action, children, className = '' }) {
    return (
        <section className={`rounded-[28px] border border-zinc-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur ${className}`}>
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
        good: 'border-emerald-200 bg-emerald-50',
        warn: 'border-amber-200 bg-amber-50',
        bad: 'border-rose-200 bg-rose-50',
        brand: 'border-sky-200 bg-sky-50',
        dark: 'border-zinc-900 bg-zinc-900 text-white',
    }[tone];

    const labelTone = tone === 'dark' ? 'text-zinc-300' : 'text-zinc-500';
    const subTone = tone === 'dark' ? 'text-zinc-300' : 'text-zinc-600';

    return (
        <div className={`rounded-[24px] border p-5 shadow-sm ${toneClasses}`}>
            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${labelTone}`}>{label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
            {sub ? <div className={`mt-2 text-sm leading-6 ${subTone}`}>{sub}</div> : null}
        </div>
    );
}

function ActionLink({ href, title, subtitle, accent = 'zinc' }) {
    const accentClasses = {
        zinc: 'from-zinc-900 to-zinc-800 text-white',
        lime: 'from-lime-300 to-lime-400 text-zinc-950',
        sky: 'from-sky-500 to-cyan-500 text-white',
    }[accent];

    return (
        <a
            href={href}
            className={`group rounded-[24px] bg-gradient-to-br p-4 shadow-sm transition hover:translate-y-[-1px] ${accentClasses}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs leading-5 opacity-80">{subtitle}</div>
                </div>
                <div className="text-sm opacity-70 transition group-hover:translate-x-0.5">Open</div>
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
        <li className="rounded-[20px] border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-950">{task.titel}</div>
                        {task.project?.naam ? <Badge tone="sky">{task.project.naam}</Badge> : null}
                        {overdue ? <Badge tone="rose">Te laat</Badge> : null}
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
    const tasksTone = kpis.tasks_overdue > 0 ? 'bad' : kpis.tasks_open > 0 ? 'warn' : 'good';

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(163,230,53,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#ffffff,_#f8fafc)] p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-lime-200/30 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />

                    <div className="relative grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-600">
                                Bijgewerkt om {meta.generated_at}
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                                Werkdashboard
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                                Alles wat vandaag aandacht vraagt in een scherm: open taken, komende afspraken,
                                nieuwe leads en omzet uit actieve modules.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <ActionLink href={urls.customers} title="Klanten" subtitle="Open klantoverzicht en werk direct door." accent="lime" />
                                <ActionLink href={urls.tasks} title="Taken" subtitle="Werk vanuit lijst of board aan je acties." accent="zinc" />
                                <ActionLink href={urls.reports} title="Rapportages" subtitle="Bekijk groei, omzet en trends." accent="sky" />
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
                                tone="brand"
                            />
                            <MetricCard
                                label="MRR excl. btw"
                                value={formatEuro(kpis.mrr_excl)}
                                sub={`BTW ${formatEuro(kpis.mrr_btw)} | Incl. ${formatEuro(kpis.mrr_incl)}`}
                                tone="dark"
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
                        tone="brand"
                    />
                    <MetricCard
                        label="Nieuw actief"
                        value={formatInt(kpis.active_new_last_30)}
                        sub="Geactiveerd in de laatste 30 dagen"
                        tone="good"
                    />
                    <MetricCard
                        label="Opzeggingen"
                        value={formatInt(kpis.cancelled_last_30)}
                        sub={`Demo aangevraagd: ${formatInt(kpis.demo_requested_last_30)}`}
                        tone={kpis.cancelled_last_30 > 0 ? 'warn' : 'default'}
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
