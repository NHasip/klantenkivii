import React from 'react';
import { Head } from '@inertiajs/react';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat, buttonClasses, cx } from '../../components/ui';

const nlNumber = new Intl.NumberFormat('nl-NL');
const nlEuro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const nlDate = new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' });
const nlDateTime = new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatEuro = (value) => nlEuro.format(Number(value) || 0);
const formatInt = (value) => nlNumber.format(Number(value) || 0);

function safeFormat(formatter, value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : formatter.format(date);
}

const formatDate = (value) => safeFormat(nlDate, value);
const formatDateTime = (value) => safeFormat(nlDateTime, value);

const plural = (n, one, many) => `${formatInt(n)} ${Number(n) === 1 ? one : many}`;

function daysLeftLabel(days) {
    if (days < 0) return `${plural(Math.abs(days), 'dag', 'dagen')} verlopen`;
    if (days === 0) return 'Verloopt vandaag';
    return `Nog ${plural(days, 'dag', 'dagen')}`;
}

const PRIORITY_TONES = { kritiek: 'danger', hoog: 'warning', normaal: 'neutral', laag: 'neutral' };
/* Alleen hoge prioriteit tonen; normaal en laag zijn ruis in een overzicht. */
function PriorityBadge({ value }) {
    const tone = PRIORITY_TONES[value];
    if (!value || !tone || tone === 'neutral') return null;
    return <Badge tone={tone}>{capitalize(value)}</Badge>;
}

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ') : '');

const ROW_LINK = 'flex min-w-0 items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';

/* Lijst met rijen gescheiden door een subtiele lijn: rustiger dan losse kaartjes. */
function RowList({ children, className = '' }) {
    return <ul className={cx('-mx-3 divide-y divide-zinc-100', className)}>{children}</ul>;
}

function LinkRow({ href, title, meta, aside, overdue = false }) {
    const body = (
        <>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900" title={typeof title === 'string' ? title : undefined}>{title}</div>
                {meta ? <div className="mt-0.5 text-xs text-zinc-500">{meta}</div> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {aside}
                {overdue ? <Badge tone="danger">Te laat</Badge> : null}
            </div>
        </>
    );

    return (
        <li>
            {href ? (
                <a href={href} className={ROW_LINK}>{body}</a>
            ) : (
                <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-2.5">{body}</div>
            )}
        </li>
    );
}

function SubHeading({ children, action }) {
    return (
        <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h3>
            {action}
        </div>
    );
}

function TextLink({ href, children }) {
    return (
        <a href={href} className="rounded text-sm font-medium text-indigo-700 hover:text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            {children}
        </a>
    );
}

function DurationList({ items, typeLabel, emptyTitle }) {
    if (items.length === 0) return <EmptyState title={emptyTitle} />;

    return (
        <RowList>
            {items.slice(0, 8).map((item) => (
                <LinkRow
                    key={item.id}
                    href={item.url}
                    title={item.bedrijfsnaam}
                    meta={`${typeLabel} sinds ${formatDate(item.since_at)}`}
                    aside={<span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-700">{plural(item.days, 'dag', 'dagen')}</span>}
                />
            ))}
        </RowList>
    );
}

export default function Dashboard({ kpis = {}, urls = {}, meta = {}, lists = {} }) {
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

    const customersUrl = (status) => `${urls.customers}?status=${encodeURIComponent(status)}`;
    const tasksOverdue = Number(kpis.tasks_overdue) || 0;
    const missingSepa = Number(kpis.active_missing_sepa) || 0;
    const todayCount = todayTasks.length + todayCustomer.length;

    return (
        <>
            <Head title="Dashboard" />

            <div className="min-w-0 space-y-6">
                <PageHeader
                    title="Dashboard"
                    description={`Taken, afspraken, omzet en klantstatus in een oogopslag. Bijgewerkt om ${meta.generated_at ?? '-'}.`}
                    actions={
                        <>
                            <a href={urls.reports} className={buttonClasses({ variant: 'secondary' })}>Rapportages</a>
                            <a href={urls.tasks} className={buttonClasses({ variant: 'primary' })}>Naar taken</a>
                        </>
                    }
                />

                {/* Kerncijfers */}
                <section aria-label="Kerncijfers" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat
                        label="Open taken"
                        value={formatInt(kpis.tasks_open)}
                        sub={`${formatInt(tasksOverdue)} te laat, ${formatInt(kpis.tasks_due_7)} binnen 7 dagen`}
                        tone={tasksOverdue > 0 ? 'danger' : 'brand'}
                        href={`${urls.tasks}?weergave=lijst`}
                    />
                    <Stat
                        label="MRR excl. btw"
                        value={formatEuro(kpis.mrr_excl)}
                        sub={`Incl. btw ${formatEuro(kpis.mrr_incl)}, alleen status Actief`}
                        tone="success"
                        href={urls.reports}
                    />
                    <Stat
                        label="Pijplijn (demo)"
                        value={formatEuro(kpis.demo_pipeline_excl)}
                        sub="Modules van demo-klanten, telt niet mee in MRR"
                        href={customersUrl('proefperiode')}
                    />
                    <Stat
                        label="Klanten totaal"
                        value={formatInt(kpis.companies_total)}
                        sub={`${formatInt(kpis.leads_last_30)} nieuw toegevoegd (30d)`}
                        href={urls.customers}
                    />
                    <Stat
                        label="Actieve klanten"
                        value={formatInt(kpis.companies_active)}
                        sub={`Gem. ${plural(kpis.active_avg_days, 'dag', 'dagen')} actief, ${formatInt(kpis.active_new_last_30)} nieuw (30d)`}
                        tone="success"
                        href={customersUrl('actief')}
                    />
                    <Stat
                        label="Demo klanten"
                        value={formatInt(kpis.demo_customers)}
                        sub={`Gem. ${plural(kpis.demo_avg_days, 'dag', 'dagen')} in demo`}
                        tone="brand"
                        href={customersUrl('proefperiode')}
                    />
                    <Stat
                        label="Demo aangevraagd"
                        value={formatInt(kpis.companies_demo_requested)}
                        sub={`${formatInt(kpis.demo_requested_last_30)} aangevraagd in 30d`}
                        href={customersUrl('demo_aangevraagd')}
                    />
                    <Stat
                        label="Opzeggingen (30d)"
                        value={formatInt(kpis.cancelled_last_30)}
                        sub={missingSepa > 0 ? `${formatInt(missingSepa)} actief zonder complete SEPA` : 'SEPA van actieve klanten compleet'}
                        tone={Number(kpis.cancelled_last_30) > 0 ? 'danger' : missingSepa > 0 ? 'warning' : 'neutral'}
                        href={customersUrl('opgezegd')}
                    />
                </section>

                {/* Vandaag */}
                <Card>
                    <CardHeader
                        title="Vandaag"
                        description={todayCount > 0 ? `${plural(todayCount, 'item', 'items')} voor vandaag of te laat.` : 'Alles voor vandaag is afgehandeld.'}
                    />
                    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                        <div className="min-w-0">
                            <SubHeading action={<TextLink href={urls.tasks}>Alle taken</TextLink>}>Mijn taken</SubHeading>
                            {todayTasks.length === 0 ? (
                                <EmptyState title="Geen taken voor vandaag" description="Er staan geen taken met een deadline vandaag of eerder op jouw naam." />
                            ) : (
                                <RowList>
                                    {todayTasks.map((task) => (
                                        <LinkRow
                                            key={`t-${task.id}`}
                                            href={task.url}
                                            title={task.titel}
                                            meta={`Deadline ${formatDateTime(task.deadline)}`}
                                            overdue={task.overdue}
                                            aside={<PriorityBadge value={task.prioriteit} />}
                                        />
                                    ))}
                                </RowList>
                            )}
                        </div>
                        <div className="min-w-0">
                            <SubHeading>Klantafspraken en klanttaken</SubHeading>
                            {todayCustomer.length === 0 ? (
                                <EmptyState title="Geen klantafspraken voor vandaag" description="Open klanttaken en afspraken met een datum vandaag of eerder verschijnen hier." />
                            ) : (
                                <RowList>
                                    {todayCustomer.map((item) => (
                                        <LinkRow
                                            key={`a-${item.id}`}
                                            href={item.garage_company?.url}
                                            title={item.titel || 'Zonder titel'}
                                            meta={`${item.garage_company?.bedrijfsnaam ?? 'Onbekende klant'}, ${formatDateTime(item.due_at)}`}
                                            overdue={item.overdue}
                                            aside={<Badge tone={item.type === 'afspraak' ? 'info' : 'neutral'}>{item.type === 'afspraak' ? 'Afspraak' : 'Taak'}</Badge>}
                                        />
                                    ))}
                                </RowList>
                            )}
                        </div>
                    </div>
                </Card>

                {/* SEPA-signalering */}
                {missingSepa > 0 ? (
                    <details id="sepa" className="group min-w-0 rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm sm:p-5">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 [&::-webkit-details-marker]:hidden">
                            <div className="min-w-0">
                                <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-900">
                                    Actieve klanten zonder complete SEPA
                                    <Badge tone="warning">{formatInt(missingSepa)}</Badge>
                                </h2>
                                <p className="mt-0.5 text-sm text-zinc-600">Vul de ontbrekende gegevens aan bij Abonnement, onderdeel Incasso, van de klant.</p>
                            </div>
                            <span className={buttonClasses({ variant: 'secondary', size: 'sm' })} aria-hidden="true">
                                <span className="group-open:hidden">Tonen</span>
                                <span className="hidden group-open:inline">Verbergen</span>
                            </span>
                        </summary>
                        <RowList className="mt-4 rounded-lg bg-white">
                            {activeMissingSepaItems.map((item) => (
                                <LinkRow
                                    key={item.id}
                                    href={item.url}
                                    title={item.bedrijfsnaam}
                                    meta={<span className="text-amber-800">{(item.missing ?? []).join(', ')}</span>}
                                />
                            ))}
                        </RowList>
                        {missingSepa > activeMissingSepaItems.length ? (
                            <p className="mt-3 text-xs text-zinc-500">En nog {plural(missingSepa - activeMissingSepaItems.length, 'andere klant', 'andere klanten')}.</p>
                        ) : null}
                    </details>
                ) : null}

                {/* Demo's die aflopen */}
                <Card>
                    <CardHeader
                        title="Demo's die aflopen"
                        description="Demo's die binnen 7 dagen eindigen of al verlopen zijn."
                        actions={<TextLink href={customersUrl('proefperiode')}>Alle demo klanten</TextLink>}
                    />
                    {demoEnding.length === 0 ? (
                        <EmptyState title="Geen demo's die binnenkort aflopen" description="Demo's met een einddatum binnen 7 dagen verschijnen hier." />
                    ) : (
                        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {demoEnding.map((item) => (
                                <li key={item.id}>
                                    <a
                                        href={item.url}
                                        className={cx(
                                            'flex h-full min-w-0 items-start justify-between gap-3 rounded-lg border bg-white p-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                            item.days_left < 0 ? 'border-rose-200' : 'border-zinc-200'
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-zinc-900" title={item.bedrijfsnaam}>{item.bedrijfsnaam}</div>
                                            <div className="mt-0.5 text-xs text-zinc-500">
                                                Einddatum {formatDate(item.demo_eind_op)}
                                                {item.demo_eind_berekend ? <span className="text-zinc-400"> (berekend)</span> : null}
                                            </div>
                                        </div>
                                        <Badge tone={item.days_left < 0 ? 'danger' : item.days_left <= 2 ? 'warning' : 'neutral'}>
                                            {daysLeftLabel(item.days_left)}
                                        </Badge>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Taken en afspraken */}
                <div className="grid min-w-0 gap-6 xl:grid-cols-[1.4fr_1fr]">
                    <Card>
                        <CardHeader
                            title="Urgente taken"
                            description="Open taken uit de takenlijst, eerst op deadline. Klantafspraken staan bij Vandaag."
                            actions={<TextLink href={`${urls.tasks}?weergave=lijst`}>Takenlijst</TextLink>}
                        />
                        {taskItems.length === 0 ? (
                            <EmptyState title="Geen open taken" description="Alle taken in de takenlijst zijn afgerond." />
                        ) : (
                            <RowList>
                                {taskItems.map((task) => (
                                    <LinkRow
                                        key={task.id}
                                        href={task.url}
                                        title={task.titel}
                                        overdue={task.overdue}
                                        meta={[
                                            task.deadline ? `Deadline ${formatDateTime(task.deadline)}` : 'Geen deadline',
                                            task.project?.naam ? `Project ${task.project.naam}` : null,
                                        ].filter(Boolean).join(', ')}
                                        aside={<PriorityBadge value={task.prioriteit} />}
                                    />
                                ))}
                            </RowList>
                        )}
                    </Card>

                    <div className="min-w-0 space-y-6">
                        <Card>
                            <CardHeader
                                title="Komende afspraken"
                                description={appointmentsOverdue > 0
                                    ? `Vanaf vandaag. ${plural(appointmentsOverdue, 'verlopen afspraak staat', 'verlopen afspraken staan')} nog open.`
                                    : 'Eerstvolgende afspraken vanaf vandaag.'}
                            />
                            {appointmentItems.length === 0 ? (
                                <EmptyState title="Geen komende afspraken" description="Plan een afspraak vanuit de klantkaart, tab Activiteit." />
                            ) : (
                                <RowList>
                                    {appointmentItems.slice(0, 6).map((item) => (
                                        <LinkRow
                                            key={item.id}
                                            href={item.garage_company?.url}
                                            title={item.titel || 'Afspraak'}
                                            meta={[formatDateTime(item.due_at), item.garage_company?.bedrijfsnaam].filter(Boolean).join(', ')}
                                        />
                                    ))}
                                </RowList>
                            )}
                        </Card>

                        <Card>
                            <CardHeader title="Afspraken per klant" description="Klanten met de meeste open afspraken." />
                            {appointmentsByCompany.length === 0 ? (
                                <EmptyState title="Geen open afspraken" />
                            ) : (
                                <RowList>
                                    {appointmentsByCompany.slice(0, 6).map((row) => (
                                        <LinkRow
                                            key={row.garage_company.id}
                                            href={row.garage_company.url}
                                            title={row.garage_company.bedrijfsnaam}
                                            meta={`Volgende: ${row.eerstvolgende?.titel || 'Afspraak'}, ${formatDateTime(row.eerstvolgende?.due_at)}`}
                                            aside={<span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-700">{plural(row.aantal, 'afspraak', 'afspraken')}</span>}
                                        />
                                    ))}
                                </RowList>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Statusduur */}
                <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader
                            title="Langst in demo"
                            description="Aantal dagen dat klanten in demo-status staan."
                            actions={<TextLink href={customersUrl('proefperiode')}>Bekijk demo klanten</TextLink>}
                        />
                        <DurationList items={demoDurationItems} typeLabel="Demo" emptyTitle="Geen klanten met status Demo" />
                    </Card>
                    <Card>
                        <CardHeader
                            title="Langst actief"
                            description="Aantal dagen dat klanten actief zijn."
                            actions={<TextLink href={customersUrl('actief')}>Bekijk actieve klanten</TextLink>}
                        />
                        <DurationList items={activeDurationItems} typeLabel="Actief" emptyTitle="Geen actieve klanten" />
                    </Card>
                </div>
            </div>
        </>
    );
}
