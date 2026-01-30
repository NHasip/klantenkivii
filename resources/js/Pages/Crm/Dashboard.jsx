import React from 'react';
import { Head } from '@inertiajs/react';

function formatEuro(value) {
    try {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
    } catch {
        return `€ ${Number(value ?? 0).toFixed(2)}`.replace('.', ',');
    }
}

function formatInt(value) {
    try {
        return new Intl.NumberFormat('nl-NL').format(value ?? 0);
    } catch {
        return String(value ?? 0);
    }
}

function Card({ label, value, sub, tone = 'default' }) {
    const toneClasses = {
        default: 'border-zinc-200 bg-white',
        good: 'border-emerald-200 bg-emerald-50',
        warn: 'border-amber-200 bg-amber-50',
        bad: 'border-rose-200 bg-rose-50',
        brand: 'border-lime-200 bg-lime-50',
    }[tone];

    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
            <div className="text-xs font-semibold text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
            {sub ? <div className="mt-1 text-xs text-zinc-600">{sub}</div> : null}
        </div>
    );
}

function QuickLink({ href, title, subtitle }) {
    return (
        <a
            href={href}
            className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
        >
            <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900">{title}</div>
                <div className="mt-0.5 text-xs text-zinc-600">{subtitle}</div>
            </div>
            <div className="shrink-0 text-zinc-400 group-hover:text-zinc-600">→</div>
        </a>
    );
}

export default function Dashboard({ kpis, urls, meta }) {
    const tasksTone = kpis.tasks_overdue > 0 ? 'bad' : kpis.tasks_open > 0 ? 'warn' : 'good';

    return (
        <>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                        <div className="mt-1 text-sm text-zinc-600">
                            Overzicht (nieuw) · bijgewerkt: <span className="font-medium">{meta.generated_at}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={urls.dashboard_old}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                        >
                            Dashboard (old)
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card
                        label="Klanten totaal"
                        value={formatInt(kpis.companies_total)}
                        sub={`Actief: ${formatInt(kpis.companies_active)}`}
                    />
                    <Card label="Leads (30 dagen)" value={formatInt(kpis.leads_last_30)} />
                    <Card label="Nieuw actief (30 dagen)" value={formatInt(kpis.active_new_last_30)} tone="good" />
                    <Card label="Demo aangevraagd (30 dagen)" value={formatInt(kpis.demo_requested_last_30)} tone="brand" />
                    <Card label="Opzeggingen (30 dagen)" value={formatInt(kpis.cancelled_last_30)} tone={kpis.cancelled_last_30 > 0 ? 'warn' : 'default'} />
                    <Card
                        label="MRR excl. btw"
                        value={formatEuro(kpis.mrr_excl)}
                        sub={`BTW: ${formatEuro(kpis.mrr_btw)} · Incl: ${formatEuro(kpis.mrr_incl)}`}
                        tone="default"
                    />
                    <Card
                        label="Taken open"
                        value={formatInt(kpis.tasks_open)}
                        sub={`Overdue: ${formatInt(kpis.tasks_overdue)} · Binnen 7 dagen: ${formatInt(kpis.tasks_due_7)}`}
                        tone={tasksTone}
                    />
                    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 text-white shadow-sm">
                        <div className="text-xs font-semibold text-white/80">Snelkoppelingen</div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                            <a href={urls.customers} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">
                                Klanten
                            </a>
                            <a href={urls.tasks} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">
                                Taken
                            </a>
                            <a href={urls.reports} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">
                                Rapportages
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-sm font-semibold">Wat is nieuw?</div>
                                    <div className="mt-1 text-sm text-zinc-600">
                                        Dit dashboard is de eerste pagina die we naar React migreren. De rest blijft voorlopig Livewire (old).
                                    </div>
                                </div>
                                <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">React</div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <QuickLink href={urls.customers} title="Klanten beheren" subtitle="Zoeken, filters, modules, contactpersonen" />
                                <QuickLink href={urls.tasks} title="Taken" subtitle="Board, comments, mentions en bijlagen" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                            <div className="text-sm font-semibold">Status</div>
                            <div className="mt-3 space-y-2 text-sm text-zinc-700">
                                <div className="flex items-center justify-between">
                                    <span>Dashboard</span>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                        nieuw
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Dashboard (old)</span>
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                        livewire
                                    </span>
                                </div>
                                <div className="pt-2 text-xs text-zinc-500">
                                    Volgende stap: meer dashboards secties naar React, daarna Klanten.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

