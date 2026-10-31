import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Icon } from '../../components/icons';
import {
    ActivityItem,
    ActivityList,
    Avatar,
    Badge,
    Card,
    CardHeader,
    EmptyState,
    IconTile,
    ProgressBar,
    Stat,
    buttonClasses,
    cx,
} from '../../components/ui';

/*
 * Badge-tonen worden in ui.jsx dynamisch opgebouwd (`badge-${tone}`); Tailwind ziet die niet.
 * Letterlijk noemen houdt ze in de build: badge-neutral badge-brand badge-success badge-warning badge-danger badge-info
 */
const nlNumber = new Intl.NumberFormat('nl-NL');
const nlEuro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const nlDate = new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' });
const nlShortDate = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
const nlTime = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });
const nlLongDate = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const nlRelative = new Intl.RelativeTimeFormat('nl-NL', { numeric: 'auto' });

const formatEuro = (value) => nlEuro.format(Number(value) || 0);
const formatInt = (value) => nlNumber.format(Number(value) || 0);
const plural = (n, one, many) => `${formatInt(n)} ${Number(n) === 1 ? one : many}`;
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ') : '');

function toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

const formatDate = (value) => {
    const d = toDate(value);
    return d ? nlDate.format(d) : value ? String(value) : '-';
};

const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Vandaag 14:30", "Morgen 09:00", "12 nov. 10:00". */
function formatWhen(value) {
    const d = toDate(value);
    if (!d) return '-';
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const time = nlTime.format(d);
    if (isSameDay(d, now)) return `Vandaag ${time}`;
    if (isSameDay(d, tomorrow)) return `Morgen ${time}`;
    if (isSameDay(d, yesterday)) return `Gisteren ${time}`;
    return `${nlShortDate.format(d)} ${time}`;
}

/** "5 minuten geleden", "gisteren", "3 dagen geleden". */
function formatAgo(value) {
    const d = toDate(value);
    if (!d) return '';
    const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSec);
    if (abs < 60) return 'zojuist';
    if (abs < 3600) return nlRelative.format(Math.round(diffSec / 60), 'minute');
    if (abs < 86400) return nlRelative.format(Math.round(diffSec / 3600), 'hour');
    if (abs < 86400 * 30) return nlRelative.format(Math.round(diffSec / 86400), 'day');
    return nlShortDate.format(d);
}

function greeting(hour) {
    if (hour < 6) return 'Goedenacht';
    if (hour < 12) return 'Goedemorgen';
    if (hour < 18) return 'Goedemiddag';
    return 'Goedenavond';
}

function daysLeftLabel(days) {
    if (days < 0) return `${plural(Math.abs(days), 'dag', 'dagen')} verlopen`;
    if (days === 0) return 'Verloopt vandaag';
    return `Nog ${plural(days, 'dag', 'dagen')}`;
}

/** Trend t.o.v. vorige periode als absoluut verschil ("+3"). `positive` = of stijgen goed is. */
function countTrend(current, previous, { upIsGood = true } = {}) {
    if (previous === undefined || previous === null) return undefined;
    const diff = (Number(current) || 0) - (Number(previous) || 0);
    if (diff === 0) return { value: '0', direction: 'flat' };
    const direction = diff > 0 ? 'up' : 'down';
    return { value: `${diff > 0 ? '+' : '-'}${formatInt(Math.abs(diff))}`, direction, positive: direction === 'up' ? upIsGood : !upIsGood };
}

/** Procentuele trend ("+4,2%"); zonder basiswaarde geen trend. */
function percentTrend(current, previous) {
    const prev = Number(previous);
    if (previous === undefined || previous === null || !(prev > 0)) return undefined;
    const pct = ((Number(current) || 0) - prev) / prev * 100;
    if (Math.abs(pct) < 0.05) return { value: '0%', direction: 'flat' };
    const direction = pct > 0 ? 'up' : 'down';
    return { value: `${pct > 0 ? '+' : '-'}${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(Math.abs(pct))}%`, direction };
}

const ACTIVITY_TYPES = {
    status_wijziging: { icon: 'refresh', tone: 'brand', label: 'Status gewijzigd' },
    notitie: { icon: 'message-square', tone: 'neutral', label: 'Notitie' },
    taak: { icon: 'check-square', tone: 'warning', label: 'Taak' },
    afspraak: { icon: 'calendar', tone: 'info', label: 'Afspraak' },
    demo: { icon: 'sparkles', tone: 'brand', label: 'Demo' },
    mandate: { icon: 'credit-card', tone: 'success', label: 'Machtiging' },
    module: { icon: 'package', tone: 'info', label: 'Module' },
    systeem: { icon: 'settings', tone: 'neutral', label: 'Systeem' },
};

const PRIORITY_TONES = { kritiek: 'danger', hoog: 'warning' };
/* Alleen hoge prioriteit tonen; normaal en laag zijn ruis in een overzicht. */
function PriorityBadge({ value }) {
    const tone = PRIORITY_TONES[value];
    if (!tone) return null;
    return <Badge tone={tone}>{capitalize(value)}</Badge>;
}

/* ------------------------------------------------------------------ Bouwstenen */

const LINK_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';

function TextLink({ href, children, className = '' }) {
    return (
        <a href={href} className={cx('tap-link inline-flex items-center gap-1 rounded text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline', LINK_FOCUS, className)}>
            {children}
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </a>
    );
}

/** Klantnaam als kleine link met avatar; zo zie je overal bij welke klant iets hoort. */
function CustomerChip({ company, size = 'xs' }) {
    if (!company?.bedrijfsnaam) return null;
    const content = (
        <>
            <Avatar name={company.bedrijfsnaam} size={size} />
            <span className="truncate">{company.bedrijfsnaam}</span>
        </>
    );
    return company.url ? (
        <a href={company.url} className={cx('tap-link inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-xs font-medium text-zinc-700 hover:text-indigo-700 hover:underline', LINK_FOCUS)}>
            {content}
        </a>
    ) : (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs font-medium text-zinc-700">{content}</span>
    );
}

function RowList({ children, className = '' }) {
    return <ul className={cx('-mx-2 divide-y divide-zinc-100', className)}>{children}</ul>;
}

/**
 * Lijstregel: leading (avatar/tegel), titel als link, meta-regel en rechts een aside.
 * Alleen de titel is een link, zodat een klant-link in de meta-regel apart klikbaar blijft.
 */
function Row({ leading, title, href, meta, aside, overdue = false }) {
    return (
        <li className="relative flex min-w-0 items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50/80">
            {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
            <div className="min-w-0 flex-1">
                {href ? (
                    // truncate op een binnenste span: het tikvlak (tap-link::after) valt anders weg door overflow: hidden.
                    <a href={href} className={cx('tap-link block rounded text-sm font-medium text-zinc-900 hover:text-indigo-700', LINK_FOCUS)} title={typeof title === 'string' ? title : undefined}>
                        <span className="block truncate">{title}</span>
                    </a>
                ) : (
                    <div className="truncate text-sm font-medium text-zinc-900">{title}</div>
                )}
                {meta ? <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">{meta}</div> : null}
                {/* Op smalle schermen onder de titel, zodat die niet wordt afgekapt. */}
                {aside || overdue ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                        {aside}
                        {overdue ? <Badge tone="danger" icon="clock">Te laat</Badge> : null}
                    </div>
                ) : null}
            </div>
            {aside || overdue ? (
                <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 sm:flex">
                    {aside}
                    {overdue ? <Badge tone="danger" icon="clock">Te laat</Badge> : null}
                </div>
            ) : null}
        </li>
    );
}

function MetaItem({ icon, children, className = '' }) {
    return (
        <span className={cx('inline-flex items-center gap-1 whitespace-nowrap', className)}>
            {icon ? <Icon name={icon} className="h-3.5 w-3.5 text-zinc-400" /> : null}
            {children}
        </span>
    );
}

function SubHeading({ icon, children, count, action }) {
    return (
        <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                {icon ? <Icon name={icon} className="h-4 w-4 text-zinc-400" /> : null}
                {children}
                {count ? <span className="rounded-full bg-zinc-100 px-1.5 text-2xs font-semibold tabular-nums text-zinc-600">{count}</span> : null}
            </h3>
            {action}
        </div>
    );
}

/* ------------------------------------------------------------------ Secties */

function Greeting({ name, hour, today, summary, actions }) {
    const date = toDate(today ? `${today}T12:00:00` : null) ?? new Date();
    return (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
            <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-500">{capitalize(nlLongDate.format(date))}</p>
                <h1 className="page-title mt-1">
                    {greeting(hour)}
                    {name ? `, ${name}` : ''}
                </h1>
                <p className="page-description">{summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
    );
}

/** Kleine signaleringen bovenaan, alleen als er iets aandacht vraagt. Elk item linkt naar de plek waar je het oplost. */
function AttentionBar({ items }) {
    const visible = items.filter((i) => i.count > 0);
    if (visible.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <Icon name="check-circle" className="h-4 w-4" />
                Niets dringends: geen te late taken, verlopen demo's of SEPA-gaten.
            </div>
        );
    }
    return (
        <nav aria-label="Aandachtspunten" className="flex flex-wrap gap-2">
            {visible.map((item) => (
                <a
                    key={item.key}
                    href={item.href}
                    className={cx(
                        'tap-target inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-sm font-medium ring-1 ring-inset transition-colors',
                        item.tone === 'danger' ? 'bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100' : 'bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100',
                        LINK_FOCUS,
                    )}
                >
                    <span className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums text-white', item.tone === 'danger' ? 'bg-rose-600' : 'bg-amber-600')}>
                        {formatInt(item.count)}
                    </span>
                    {item.label}
                </a>
            ))}
        </nav>
    );
}

function DemoEndingRow({ item }) {
    const expired = item.days_left < 0;
    const tone = expired ? 'danger' : item.days_left <= 2 ? 'warning' : 'brand';
    const total = Number(item.total_days) || 0;
    const elapsed = total > 0 ? Math.min(total, Math.max(0, total - item.days_left)) : 0;
    return (
        <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={item.bedrijfsnaam} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <a href={item.url} className={cx('tap-link min-w-0 max-w-full rounded text-sm font-semibold text-zinc-900 hover:text-indigo-700', LINK_FOCUS)} title={item.bedrijfsnaam}>
                            <span className="block truncate">{item.bedrijfsnaam}</span>
                        </a>
                        <Badge tone={tone === 'brand' ? 'neutral' : tone}>{daysLeftLabel(item.days_left)}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                        {total > 0 ? (
                            <ProgressBar
                                value={elapsed}
                                max={total}
                                tone={tone}
                                size="sm"
                                hideLabel
                                label={`Demo ${item.bedrijfsnaam}: dag ${formatInt(elapsed)} van ${formatInt(total)}`}
                                className="w-full max-w-[14rem]"
                            />
                        ) : null}
                        <span className="whitespace-nowrap text-xs text-zinc-500">
                            Eindigt {formatDate(item.demo_eind_op)}
                            {item.demo_eind_berekend ? ' (berekend)' : ''}
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:flex sm:justify-end">
                <a href={item.url} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                    <Icon name="sparkles" className="h-4 w-4 text-zinc-500" />
                    Demo
                </a>
                {item.contact_url ? (
                    <a href={item.contact_url} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                        <Icon name="phone" className="h-4 w-4 text-zinc-500" />
                        Contact
                    </a>
                ) : null}
                {item.activity_url ? (
                    <a href={item.activity_url} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                        <Icon name="activity" className="h-4 w-4 text-zinc-500" />
                        Activiteit
                    </a>
                ) : null}
            </div>
        </li>
    );
}

function DurationList({ items, typeLabel, emptyTitle, tone }) {
    if (items.length === 0) return <EmptyState compact illustration="people" title={emptyTitle} />;
    const max = Math.max(1, ...items.map((i) => Number(i.days) || 0));
    return (
        <RowList>
            {items.slice(0, 8).map((item) => (
                <Row
                    key={item.id}
                    leading={<Avatar name={item.bedrijfsnaam} size="sm" />}
                    href={item.url}
                    title={item.bedrijfsnaam}
                    meta={
                        <>
                            <span>{typeLabel} sinds {formatDate(item.since_at)}</span>
                            <ProgressBar value={item.days} max={max} tone={tone} size="sm" hideLabel label={`${item.bedrijfsnaam}: ${plural(item.days, 'dag', 'dagen')}`} className="w-24" />
                        </>
                    }
                    aside={<span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-700">{plural(item.days, 'dag', 'dagen')}</span>}
                />
            ))}
        </RowList>
    );
}

function RecentActivity({ items }) {
    if (items.length === 0) {
        return <EmptyState compact bare illustration="inbox" title="Nog geen activiteit" description="Notities, statuswijzigingen en afspraken van klanten verschijnen hier." />;
    }
    return (
        <ActivityList aria-label="Recente activiteit">
            {items.map((item) => {
                const type = ACTIVITY_TYPES[item.type] ?? { icon: 'activity', tone: 'neutral', label: capitalize(item.type) };
                const created = toDate(item.created_at);
                return (
                    <ActivityItem
                        key={item.id}
                        icon={type.icon}
                        tone={type.tone}
                        time={created ? <time dateTime={item.created_at} title={formatWhen(item.created_at)}>{formatAgo(item.created_at)}</time> : null}
                        title={
                            <a href={item.garage_company?.url} className={cx('tap-link rounded font-medium text-zinc-900 hover:text-indigo-700', LINK_FOCUS)}>
                                {item.titel || type.label}
                            </a>
                        }
                        meta={
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                <CustomerChip company={item.garage_company} />
                                <span className="text-zinc-400">{type.label}{item.creator ? `, door ${item.creator}` : ''}</span>
                            </span>
                        }
                    />
                );
            })}
        </ActivityList>
    );
}

/* ------------------------------------------------------------------ Pagina */

export default function Dashboard({ kpis = {}, urls = {}, meta = {}, lists = {} }) {
    const page = usePage();
    const fullName = page?.props?.auth?.user?.name ?? '';
    const firstName = String(fullName).trim().split(/\s+/)[0] ?? '';
    const hour = Number.isFinite(Number(meta.hour)) && meta.hour !== undefined ? Number(meta.hour) : new Date().getHours();

    const todayTasks = lists?.today?.tasks ?? [];
    const todayCustomer = lists?.today?.customer ?? [];
    const demoEnding = lists?.demo_ending ?? [];
    const taskItems = lists?.tasks ?? [];
    const appointmentItems = lists?.appointments?.items ?? [];
    const appointmentsOverdue = lists?.appointments?.overdue_count ?? 0;
    const appointmentsByCompany = lists?.appointments?.by_company ?? [];
    const demoDurationItems = lists?.status_duration?.demo ?? [];
    const activeDurationItems = lists?.status_duration?.active ?? [];
    const activeMissingSepaItems = lists?.active_missing_sepa ?? [];
    const pauseExpiredItems = lists?.pause_expired ?? [];
    const pauseExpired = Number(kpis.pause_expired) || 0;
    const companiesPaused = Number(kpis.companies_paused) || 0;
    const recentActivity = lists?.recent_activity ?? [];

    const customersUrl = (status) => `${urls.customers}?status=${encodeURIComponent(status)}`;
    const tasksOverdue = Number(kpis.tasks_overdue) || 0;
    const missingSepa = Number(kpis.active_missing_sepa) || 0;
    const todayCount = todayTasks.length + todayCustomer.length;
    const demosExpired = demoEnding.filter((d) => d.days_left < 0).length;
    const demosSoon = demoEnding.length - demosExpired;

    const summaryParts = [];
    if (todayCount > 0) summaryParts.push(`${plural(todayCount, 'ding', 'dingen')} voor vandaag`);
    if (demosSoon > 0) summaryParts.push(`${plural(demosSoon, 'demo loopt', "demo's lopen")} deze week af`);
    if (appointmentItems.length > 0) summaryParts.push(`${plural(appointmentItems.length, 'komende afspraak', 'komende afspraken')}`);
    const summary = summaryParts.length
        ? `Je hebt ${summaryParts.join(', ').replace(/, ([^,]*)$/, ' en $1')}. Bijgewerkt om ${meta.generated_at?.split(' ')[1] ?? meta.generated_at ?? '-'}.`
        : `Een rustige dag: niets gepland voor vandaag. Bijgewerkt om ${meta.generated_at?.split(' ')[1] ?? meta.generated_at ?? '-'}.`;

    return (
        <>
            <Head title="Dashboard" />

            <div className="min-w-0 space-y-6">
                <Greeting
                    name={firstName}
                    hour={hour}
                    today={meta.today}
                    summary={summary}
                    actions={
                        <>
                            <a href={urls.reports} className={buttonClasses({ variant: 'secondary' })}>
                                <Icon name="bar-chart" className="h-4 w-4 text-zinc-500" />
                                Rapportages
                            </a>
                            <a href={urls.tasks} className={buttonClasses({ variant: 'primary' })}>
                                <Icon name="check-square" className="h-4 w-4" />
                                Naar taken
                            </a>
                        </>
                    }
                />

                <AttentionBar
                    items={[
                        { key: 'tasks', count: tasksOverdue, label: tasksOverdue === 1 ? 'taak te laat' : 'taken te laat', tone: 'danger', href: `${urls.tasks}?weergave=lijst` },
                        { key: 'demo-expired', count: demosExpired, label: demosExpired === 1 ? 'demo verlopen' : "demo's verlopen", tone: 'danger', href: '#demos' },
                        { key: 'appointments', count: appointmentsOverdue, label: appointmentsOverdue === 1 ? 'verlopen afspraak open' : 'verlopen afspraken open', tone: 'warning', href: '#vandaag' },
                        { key: 'sepa', count: missingSepa, label: 'actief zonder complete SEPA', tone: 'warning', href: '#sepa' },
                        { key: 'pause', count: pauseExpired, label: pauseExpired === 1 ? 'pauze verlopen' : 'pauzes verlopen', tone: 'warning', href: '#pauze' },
                        { key: 'mandate-link', count: Number(kpis.mandates_to_link) || 0, label: 'machtiging moet gekoppeld worden', tone: 'danger', href: urls.mandates || '#' },
                        { key: 'mandate-new', count: Number(kpis.mandates_received_7) || 0, label: Number(kpis.mandates_received_7) === 1 ? 'nieuwe machtiging ontvangen' : 'nieuwe machtigingen ontvangen', tone: 'warning', href: urls.mandates || '#' },
                    ]}
                />

                {/* Kerncijfers */}
                <section aria-labelledby="kpi-heading" className="min-w-0">
                    <h2 id="kpi-heading" className="sr-only">Kerncijfers</h2>
                    <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                        <Stat
                            label="MRR excl. btw"
                            value={formatEuro(kpis.mrr_excl)}
                            icon="euro"
                            tone="success"
                            trend={percentTrend(kpis.mrr_excl, kpis.mrr_prev_month)}
                            sub={kpis.mrr_prev_month !== null && kpis.mrr_prev_month !== undefined ? `t.o.v. vorige maand, incl. btw ${formatEuro(kpis.mrr_incl)}` : `Incl. btw ${formatEuro(kpis.mrr_incl)}`}
                            href={urls.reports}
                        />
                        <Stat
                            label="Actieve klanten"
                            value={formatInt(kpis.companies_active)}
                            icon="users"
                            tone="brand"
                            trend={countTrend(kpis.active_new_last_30, kpis.active_new_prev_30)}
                            sub={`${formatInt(kpis.active_new_last_30)} nieuw in 30 dagen, gem. ${plural(kpis.active_avg_days, 'dag', 'dagen')} actief${companiesPaused > 0 ? `, ${formatInt(companiesPaused)} gepauzeerd` : ''}`}
                            href={customersUrl('actief')}
                        />
                        <Stat
                            label="Open taken"
                            value={formatInt(kpis.tasks_open)}
                            icon="check-square"
                            tone={tasksOverdue > 0 ? 'danger' : 'info'}
                            sub={`${formatInt(tasksOverdue)} te laat, ${formatInt(kpis.tasks_due_7)} binnen 7 dagen`}
                            href={`${urls.tasks}?weergave=lijst`}
                        />
                        <Stat
                            label="Pijplijn (demo)"
                            value={formatEuro(kpis.demo_pipeline_excl)}
                            icon="sparkles"
                            tone="warning"
                            sub={`${plural(kpis.demo_customers, 'demo klant', 'demo klanten')}, gem. ${plural(kpis.demo_avg_days, 'dag', 'dagen')} in demo`}
                            href={customersUrl('proefperiode')}
                        />
                    </div>

                    <div className="mt-3 grid min-w-0 grid-cols-1 overflow-hidden rounded-2xl border border-hairline bg-white shadow-card min-[420px]:grid-cols-2 sm:mt-4 xl:grid-cols-4">
                        {[
                            { label: 'Klanten totaal', value: kpis.companies_total, href: urls.customers, icon: 'building', note: `${formatInt(kpis.leads_last_30)} nieuw in 30 dagen`, trend: countTrend(kpis.leads_last_30, kpis.leads_prev_30) },
                            { label: 'Demo klanten', value: kpis.demo_customers, href: customersUrl('proefperiode'), icon: 'sparkles', note: `${plural(demoEnding.length, 'loopt', 'lopen')} binnen 7 dagen af` },
                            { label: 'Demo aangevraagd', value: kpis.companies_demo_requested, href: customersUrl('demo_aangevraagd'), icon: 'inbox', note: `${formatInt(kpis.demo_requested_last_30)} aangevraagd in 30 dagen` },
                            { label: 'Opzeggingen (30d)', value: kpis.cancelled_last_30, href: customersUrl('opgezegd'), icon: 'log-out', note: 'Vergeleken met de 30 dagen ervoor', trend: countTrend(kpis.cancelled_last_30, kpis.cancelled_prev_30, { upIsGood: false }) },
                        ].map((s, i) => (
                            <a
                                key={s.label}
                                href={s.href}
                                className={cx(
                                    'group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 sm:px-5',
                                    i > 0 && 'border-t border-zinc-100',
                                    i === 1 && 'min-[420px]:border-t-0 min-[420px]:border-l',
                                    i === 2 && 'xl:border-t-0 xl:border-l',
                                    i === 3 && 'min-[420px]:border-l',
                                )}
                            >
                                <IconTile icon={s.icon} tone="neutral" size="sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-medium text-zinc-500">{s.label}</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-semibold tabular-nums text-zinc-900">{formatInt(s.value)}</span>
                                        {s.trend && s.trend.direction !== 'flat' ? (
                                            <span className={cx('text-xs font-semibold tabular-nums', (s.trend.positive ?? s.trend.direction === 'up') ? 'text-emerald-700' : 'text-rose-700')}>
                                                <span className="sr-only">{s.trend.direction === 'up' ? 'Gestegen' : 'Gedaald'}: </span>
                                                {s.trend.value}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="truncate text-xs text-zinc-500">{s.note}</div>
                                </div>
                                <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" />
                            </a>
                        ))}
                    </div>
                </section>

                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                    {/* Hoofdkolom */}
                    <div className="min-w-0 space-y-6">
                        <Card id="vandaag" className="scroll-mt-20">
                            <CardHeader
                                icon="calendar"
                                title="Vandaag"
                                description={todayCount > 0 ? `${plural(todayCount, 'item', 'items')} voor vandaag of te laat.` : 'Alles voor vandaag is afgehandeld.'}
                                actions={<TextLink href={urls.tasks}>Alle taken</TextLink>}
                            />
                            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                                <div className="min-w-0">
                                    <SubHeading icon="user" count={todayTasks.length || null}>Mijn taken</SubHeading>
                                    {todayTasks.length === 0 ? (
                                        <EmptyState compact illustration="tasks" title="Geen taken voor vandaag" description="Er staan geen taken met een deadline vandaag of eerder op jouw naam." />
                                    ) : (
                                        <RowList>
                                            {todayTasks.map((task) => (
                                                <Row
                                                    key={`t-${task.id}`}
                                                    leading={<IconTile icon="check-square" tone={task.overdue ? 'danger' : 'neutral'} size="sm" />}
                                                    href={task.url}
                                                    title={task.titel}
                                                    overdue={task.overdue}
                                                    aside={<PriorityBadge value={task.prioriteit} />}
                                                    meta={
                                                        <>
                                                            <MetaItem icon="clock">{formatWhen(task.deadline)}</MetaItem>
                                                            <CustomerChip company={task.garage_company} />
                                                        </>
                                                    }
                                                />
                                            ))}
                                        </RowList>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <SubHeading icon="building" count={todayCustomer.length || null}>Bij klanten</SubHeading>
                                    {todayCustomer.length === 0 ? (
                                        <EmptyState compact illustration="people" title="Geen klantafspraken voor vandaag" description="Open klanttaken en afspraken met een datum vandaag of eerder verschijnen hier." />
                                    ) : (
                                        <RowList>
                                            {todayCustomer.map((item) => (
                                                <Row
                                                    key={`a-${item.id}`}
                                                    leading={<Avatar name={item.garage_company?.bedrijfsnaam} size="sm" />}
                                                    href={item.garage_company?.url}
                                                    title={item.titel || 'Zonder titel'}
                                                    overdue={item.overdue}
                                                    aside={<Badge tone={item.type === 'afspraak' ? 'info' : 'neutral'} icon={item.type === 'afspraak' ? 'calendar' : 'check-square'}>{item.type === 'afspraak' ? 'Afspraak' : 'Taak'}</Badge>}
                                                    meta={
                                                        <>
                                                            <span className="truncate font-medium text-zinc-600">{item.garage_company?.bedrijfsnaam ?? 'Onbekende klant'}</span>
                                                            <MetaItem icon="clock">{formatWhen(item.due_at)}</MetaItem>
                                                        </>
                                                    }
                                                />
                                            ))}
                                        </RowList>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card id="demos" className="scroll-mt-20">
                            <CardHeader
                                icon="sparkles"
                                tone="warning"
                                title="Demo's die aflopen"
                                description="Binnen 7 dagen of al verlopen. Bel of mail de klant voordat de demo stopt."
                                actions={<TextLink href={customersUrl('proefperiode')}>Alle demo klanten</TextLink>}
                            />
                            {demoEnding.length === 0 ? (
                                <EmptyState compact illustration="inbox" title="Geen demo's die binnenkort aflopen" description="Demo's met een einddatum binnen 7 dagen verschijnen hier." />
                            ) : (
                                <ul className="space-y-2.5">
                                    {demoEnding.map((item) => (
                                        <DemoEndingRow key={item.id} item={item} />
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card>
                            <CardHeader
                                icon="list"
                                tone="info"
                                title="Urgente taken"
                                description="Open taken uit de takenlijst, eerst op deadline."
                                actions={<TextLink href={`${urls.tasks}?weergave=lijst`}>Takenlijst</TextLink>}
                            />
                            {taskItems.length === 0 ? (
                                <EmptyState compact illustration="tasks" title="Geen open taken" description="Alle taken in de takenlijst zijn afgerond." />
                            ) : (
                                <RowList>
                                    {taskItems.map((task) => (
                                        <Row
                                            key={task.id}
                                            leading={task.garage_company ? <Avatar name={task.garage_company.bedrijfsnaam} size="sm" /> : <IconTile icon="check-square" tone={task.overdue ? 'danger' : 'neutral'} size="sm" />}
                                            href={task.url}
                                            title={task.titel}
                                            overdue={task.overdue}
                                            aside={<PriorityBadge value={task.prioriteit} />}
                                            meta={
                                                <>
                                                    <MetaItem icon="clock" className={task.overdue ? 'text-rose-700' : ''}>{task.deadline ? formatWhen(task.deadline) : 'Geen deadline'}</MetaItem>
                                                    {task.project?.naam ? <MetaItem icon="layers">{task.project.naam}</MetaItem> : null}
                                                    <CustomerChip company={task.garage_company} />
                                                </>
                                            }
                                        />
                                    ))}
                                </RowList>
                            )}
                        </Card>
                    </div>

                    {/* Zijkolom */}
                    <div className="min-w-0 space-y-6">
                        <Card>
                            <CardHeader icon="activity" title="Recente activiteit" description="Laatste wijzigingen in klantdossiers." />
                            <RecentActivity items={recentActivity} />
                        </Card>

                        <Card>
                            <CardHeader
                                icon="calendar"
                                tone="info"
                                title="Komende afspraken"
                                description={appointmentsOverdue > 0
                                    ? `Vanaf vandaag. ${plural(appointmentsOverdue, 'verlopen afspraak staat', 'verlopen afspraken staan')} nog open.`
                                    : 'Eerstvolgende afspraken vanaf vandaag.'}
                            />
                            {appointmentItems.length === 0 ? (
                                <EmptyState compact bare illustration="inbox" title="Geen komende afspraken" description="Plan een afspraak vanuit de klantkaart, tab Activiteit." />
                            ) : (
                                <RowList>
                                    {appointmentItems.slice(0, 6).map((item) => {
                                        const d = toDate(item.due_at);
                                        return (
                                            <Row
                                                key={item.id}
                                                leading={
                                                    <span className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-100" aria-hidden="true">
                                                        <span className="text-2xs font-medium uppercase leading-none">{d ? nlShortDate.format(d).split(' ')[1]?.replace('.', '') : ''}</span>
                                                        <span className="text-sm font-semibold leading-tight tabular-nums">{d ? d.getDate() : '-'}</span>
                                                    </span>
                                                }
                                                href={item.garage_company?.url}
                                                title={item.titel || 'Afspraak'}
                                                meta={
                                                    <>
                                                        <MetaItem icon="clock">{formatWhen(item.due_at)}</MetaItem>
                                                        <CustomerChip company={item.garage_company} />
                                                    </>
                                                }
                                            />
                                        );
                                    })}
                                </RowList>
                            )}
                        </Card>

                        <Card>
                            <CardHeader icon="users" title="Afspraken per klant" description="Klanten met de meeste open afspraken." />
                            {appointmentsByCompany.length === 0 ? (
                                <EmptyState compact bare title="Geen open afspraken" />
                            ) : (
                                <RowList>
                                    {appointmentsByCompany.slice(0, 6).map((row) => (
                                        <Row
                                            key={row.garage_company.id}
                                            leading={<Avatar name={row.garage_company.bedrijfsnaam} size="sm" />}
                                            href={row.garage_company.url}
                                            title={row.garage_company.bedrijfsnaam}
                                            meta={<span className="truncate">Volgende: {row.eerstvolgende?.titel || 'Afspraak'}, {formatWhen(row.eerstvolgende?.due_at)}</span>}
                                            aside={<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700">{formatInt(row.aantal)}</span>}
                                        />
                                    ))}
                                </RowList>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Verlopen pauzes */}
                {pauseExpired > 0 ? (
                    <section id="pauze" className="card scroll-mt-20 overflow-hidden border-violet-200" aria-labelledby="pauze-heading">
                        <div className="flex flex-wrap items-start justify-between gap-3 bg-violet-50/60 px-5 py-4 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                                <IconTile icon="clock" tone="brand" size="sm" />
                                <div className="min-w-0">
                                    <h2 id="pauze-heading" className="section-heading flex flex-wrap items-center gap-2">
                                        Pauze verlopen: hervatten?
                                        <Badge tone="brand">{formatInt(pauseExpired)}</Badge>
                                    </h2>
                                    <p className="section-description">De pauze van deze klanten is voorbij. Hervat de klant of pas de pauze aan.</p>
                                </div>
                            </div>
                            <a href={customersUrl('gepauzeerd')} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                                Gepauzeerde klanten
                            </a>
                        </div>
                        <div className="px-5 pb-4 pt-2 sm:px-6">
                            <RowList>
                                {pauseExpiredItems.map((item) => (
                                    <Row
                                        key={item.id}
                                        leading={<Avatar name={item.bedrijfsnaam} size="sm" />}
                                        href={item.url}
                                        title={item.bedrijfsnaam}
                                        meta={`Gepauzeerd tot ${formatDate(item.gepauzeerd_tot)}${item.reden ? `, reden: ${item.reden}` : ''}`}
                                        aside={
                                            <a href={item.url} className={buttonClasses({ variant: 'secondary', size: 'xs' })}>
                                                Hervatten
                                            </a>
                                        }
                                    />
                                ))}
                            </RowList>
                        </div>
                    </section>
                ) : null}

                {/* SEPA-signalering */}
                {missingSepa > 0 ? (
                    <details id="sepa" className="group card scroll-mt-20 overflow-hidden border-amber-200">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-amber-50/60 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 sm:px-6 [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 items-start gap-3">
                                <IconTile icon="credit-card" tone="warning" size="sm" />
                                <div className="min-w-0">
                                    <h2 className="section-heading flex flex-wrap items-center gap-2">
                                        Actieve klanten zonder complete SEPA
                                        <Badge tone="warning">{formatInt(missingSepa)}</Badge>
                                    </h2>
                                    <p className="section-description">Vul de ontbrekende gegevens aan bij Abonnement, onderdeel Incasso, van de klant.</p>
                                </div>
                            </div>
                            <span className={buttonClasses({ variant: 'secondary', size: 'sm' })} aria-hidden="true">
                                <span className="group-open:hidden">Tonen</span>
                                <span className="hidden group-open:inline">Verbergen</span>
                                <Icon name="chevron-down" className="h-4 w-4 transition-transform group-open:rotate-180" />
                            </span>
                        </summary>
                        <div className="px-5 pb-4 pt-2 sm:px-6">
                            <RowList>
                                {activeMissingSepaItems.map((item) => (
                                    <Row
                                        key={item.id}
                                        leading={<Avatar name={item.bedrijfsnaam} size="sm" />}
                                        href={item.url}
                                        title={item.bedrijfsnaam}
                                        meta={
                                            <span className="flex flex-wrap gap-1">
                                                {(item.missing ?? []).map((m) => (
                                                    <Badge key={m} tone="warning">{m}</Badge>
                                                ))}
                                            </span>
                                        }
                                        aside={
                                            <a href={item.url} className={buttonClasses({ variant: 'secondary', size: 'xs' })}>
                                                Naar incasso
                                            </a>
                                        }
                                    />
                                ))}
                            </RowList>
                            {missingSepa > activeMissingSepaItems.length ? (
                                <p className="mt-3 text-xs text-zinc-500">En nog {plural(missingSepa - activeMissingSepaItems.length, 'andere klant', 'andere klanten')}.</p>
                            ) : null}
                        </div>
                    </details>
                ) : null}

                {/* Statusduur */}
                <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader
                            icon="clock"
                            tone="warning"
                            title="Langst in demo"
                            description="Dagen sinds de start van de demo."
                            actions={<TextLink href={customersUrl('proefperiode')}>Demo klanten</TextLink>}
                        />
                        <DurationList items={demoDurationItems} typeLabel="Demo" emptyTitle="Geen klanten met status Demo" tone="warning" />
                    </Card>
                    <Card>
                        <CardHeader
                            icon="shield"
                            tone="success"
                            title="Langst actief"
                            description="Trouwste klanten, op dagen actief."
                            actions={<TextLink href={customersUrl('actief')}>Actieve klanten</TextLink>}
                        />
                        <DurationList items={activeDurationItems} typeLabel="Actief" emptyTitle="Geen actieve klanten" tone="success" />
                    </Card>
                </div>
            </div>
        </>
    );
}
