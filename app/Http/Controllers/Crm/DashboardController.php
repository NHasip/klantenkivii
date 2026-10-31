<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\TaskStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\Task;
use App\Services\Crm\RevenueCalculator;
use App\Services\Crm\SepaChecklist;
use Carbon\CarbonImmutable;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    public function __invoke(): Response
    {
        $now = CarbonImmutable::now('Europe/Amsterdam');
        $last30Start = $now->subDays(29)->startOfDay();

        $companiesTotal = GarageCompany::query()->count();
        $companiesActive = GarageCompany::query()->where('status', 'actief')->count();

        $leadsLast30 = GarageCompany::query()
            ->whereBetween('created_at', [$last30Start, $now])
            ->count();

        $activeNewLast30 = GarageCompany::query()
            ->whereBetween('actief_vanaf', [$last30Start, $now])
            ->count();

        $demoRequestedLast30 = GarageCompany::query()
            ->whereBetween('demo_aangevraagd_op', [$last30Start, $now])
            ->count();

        $cancelledLast30 = GarageCompany::query()
            ->whereBetween('opgezegd_op', [$last30Start, $now])
            ->count();

        // Vorige periode van 30 dagen (dag 30 t/m 59 geleden) voor de trendpijltjes.
        $prev30Start = $last30Start->subDays(30);
        $prev30End = $last30Start->subSecond();
        $countPrev = fn (string $column) => GarageCompany::query()->whereBetween($column, [$prev30Start, $prev30End])->count();
        $leadsPrev30 = $countPrev('created_at');
        $activeNewPrev30 = $countPrev('actief_vanaf');
        $cancelledPrev30 = $countPrev('opgezegd_op');

        // Zelfde berekening als Rapportages en klantenlijst (alleen status Actief).
        $mrr = RevenueCalculator::mrr();
        $mrrExcl = $mrr['excl'];
        $mrrBtw = $mrr['btw'];
        $mrrIncl = $mrr['incl'];
        $demoPipeline = RevenueCalculator::demoPipeline();
        // MRR aan het eind van vorige maand (zelfde benadering als de grafiek in Rapportages).
        $mrrHistory = RevenueCalculator::mrrHistory(2);
        $mrrPrevMonth = count($mrrHistory) === 2 ? (float) $mrrHistory[0]['excl'] : null;

        $openTaskStatuses = fn ($q) => $q->where('status', '!=', TaskStatus::Afgerond);
        $customerTaskTypes = [ActivityType::Taak->value, ActivityType::Afspraak->value];
        $openCustomerActivities = fn () => Activity::query()
            ->whereIn('type', $customerTaskTypes)
            ->whereNull('done_at')
            ->whereHas('garageCompany');

        // Taken uit de takenlijst plus open klant-taken/afspraken (tijdlijn) tellen samen.
        $tasksOpen = $openTaskStatuses(Task::query())->count()
            + $openCustomerActivities()->count();
        $tasksOverdue = $openTaskStatuses(Task::query())
            ->whereNotNull('deadline')
            ->where('deadline', '<', $now)
            ->count()
            + $openCustomerActivities()->whereNotNull('due_at')->where('due_at', '<', $now)->count();
        $tasksDue7 = $openTaskStatuses(Task::query())
            ->whereNotNull('deadline')
            ->whereBetween('deadline', [$now, $now->addDays(7)->endOfDay()])
            ->count()
            + $openCustomerActivities()->whereBetween('due_at', [$now, $now->addDays(7)->endOfDay()])->count();

        $userId = auth()->id();
        $withCustomer = Task::supportsCustomer();
        $taskCustomer = fn (Task $task) => $withCustomer && $task->garageCompany ? [
            'id' => $task->garageCompany->id,
            'bedrijfsnaam' => $task->garageCompany->bedrijfsnaam,
            'url' => route('crm.garage_companies.show', ['garageCompany' => $task->garageCompany->id]),
        ] : null;
        $todayEnd = $now->endOfDay();

        $myTasksToday = $openTaskStatuses(Task::query())
            ->where(function ($q) use ($userId) {
                $q->whereHas('assignees', fn ($a) => $a->where('users.id', $userId))
                    ->orWhere(function ($own) use ($userId) {
                        $own->whereDoesntHave('assignees')->where('created_by', $userId);
                    });
            })
            ->whereNotNull('deadline')
            ->where('deadline', '<=', $todayEnd)
            ->orderBy('deadline')
            ->limit(20)
            ->when($withCustomer, fn ($q) => $q->with('garageCompany:id,bedrijfsnaam'))
            ->get($withCustomer ? ['id', 'titel', 'deadline', 'prioriteit', 'garage_company_id'] : ['id', 'titel', 'deadline', 'prioriteit'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'titel' => $task->titel,
                'deadline' => $task->deadline?->toIso8601String(),
                // Zelfde definitie als de KPI 'Te laat': deadline ligt voor nu.
                'overdue' => $task->deadline !== null && $task->deadline->lt($now),
                'prioriteit' => $task->prioriteit?->value,
                'url' => route('crm.tasks.show', ['task' => $task->id]),
                'garage_company' => $taskCustomer($task),
            ])
            ->values();

        $customerToday = $openCustomerActivities()
            ->with('garageCompany:id,bedrijfsnaam')
            ->whereNotNull('due_at')
            ->where('due_at', '<=', $todayEnd)
            ->orderBy('due_at')
            ->limit(20)
            ->get(['id', 'garage_company_id', 'type', 'titel', 'due_at'])
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'type' => $activity->type?->value,
                'titel' => $activity->titel,
                'due_at' => $activity->due_at?->toIso8601String(),
                'overdue' => $activity->due_at !== null && $activity->due_at->lt($now),
                'garage_company' => [
                    'id' => $activity->garageCompany->id,
                    'bedrijfsnaam' => $activity->garageCompany->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $activity->garageCompany->id, 'tab' => 'taken_afspraken']),
                ],
            ])
            ->values();

        $demoEnding = GarageCompany::withEffectiveDemoEndBetween(RevenueCalculator::demoStatuses(), null, $now->addDays(7)->endOfDay())
            ->take(20)
            ->map(function (GarageCompany $company) use ($now) {
                $end = CarbonImmutable::parse($company->effectiveDemoEnd())->setTimezone('Europe/Amsterdam')->startOfDay();
                $startRaw = $company->proefperiode_start ?? $company->demo_aangevraagd_op;
                $start = $startRaw ? CarbonImmutable::parse($startRaw)->setTimezone('Europe/Amsterdam')->startOfDay() : null;

                return [
                    'id' => $company->id,
                    'bedrijfsnaam' => $company->bedrijfsnaam,
                    'demo_eind_op' => $end->toDateString(),
                    'demo_eind_berekend' => $company->demoEndIsComputed(),
                    'days_left' => (int) $now->startOfDay()->diffInDays($end, false),
                    'demo_start_op' => $start?->toDateString(),
                    'total_days' => $start ? max(1, (int) $start->diffInDays($end, false)) : null,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'demo_status']),
                    'contact_url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'contact']),
                    'activity_url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'activiteit']),
                ];
            })
            ->values();

        $taskColumns = ['id', 'task_project_id', 'titel', 'status', 'prioriteit', 'deadline'];
        if ($withCustomer) {
            $taskColumns[] = 'garage_company_id';
        }

        $taskItems = Task::query()
            ->with($withCustomer ? ['project:id,naam', 'garageCompany:id,bedrijfsnaam'] : ['project:id,naam'])
            ->where('status', '!=', TaskStatus::Afgerond)
            ->orderByRaw('case when deadline is null then 1 else 0 end, deadline asc')
            ->limit(12)
            ->get($taskColumns)
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'titel' => $task->titel,
                'status' => $task->status?->value,
                'prioriteit' => $task->prioriteit?->value,
                'deadline' => $task->deadline?->toIso8601String(),
                'overdue' => $task->deadline !== null && $task->deadline->lt($now),
                'url' => route('crm.tasks.show', ['task' => $task->id]),
                'project' => $task->project ? [
                    'id' => $task->project->id,
                    'naam' => $task->project->naam,
                ] : null,
                'garage_company' => $taskCustomer($task),
            ])
            ->values();

        $appointments = Activity::query()
            ->with('garageCompany:id,bedrijfsnaam')
            ->where('type', ActivityType::Afspraak)
            ->whereNull('done_at')
            ->whereNotNull('due_at')
            ->whereHas('garageCompany')
            ->orderBy('due_at')
            // Geen limiet: anders klopt het aantal per klant niet (lijst wordt hieronder ingekort).
            ->get(['id', 'garage_company_id', 'titel', 'due_at'])
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'titel' => $activity->titel,
                'due_at' => $activity->due_at?->toIso8601String(),
                'garage_company' => $activity->garageCompany ? [
                    'id' => $activity->garageCompany->id,
                    'bedrijfsnaam' => $activity->garageCompany->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $activity->garageCompany->id]),
                ] : null,
            ])
            ->values();

        $nowTs = $now->getTimestamp();
        $ts = fn (?string $iso) => $iso ? strtotime($iso) : PHP_INT_MAX;
        $appointmentsByCompany = $appointments
            ->filter(fn (array $row) => is_array($row['garage_company'] ?? null))
            ->groupBy(fn (array $row) => (string) $row['garage_company']['id'])
            ->map(function ($items) use ($nowTs, $ts) {
                /** @var \Illuminate\Support\Collection<int, array{id:int,titel:string,due_at:?string,garage_company:array{id:int,bedrijfsnaam:string,url:string}}> $items */
                // Eerstvolgende = eerste afspraak vanaf nu; anders de oudste verlopen afspraak.
                $first = $items->first(fn (array $row) => $ts($row['due_at']) >= $nowTs && $row['due_at'] !== null) ?? $items->first();

                return [
                    'garage_company' => $first['garage_company'],
                    'aantal' => $items->count(),
                    'eerstvolgende' => [
                        'titel' => $first['titel'],
                        'due_at' => $first['due_at'],
                    ],
                ];
            })
            ->sort(fn (array $a, array $b) => [$b['aantal'], $ts($a['eerstvolgende']['due_at'])] <=> [$a['aantal'], $ts($b['eerstvolgende']['due_at'])])
            ->take(12)
            ->values();

        $todayStart = $now->startOfDay();

        $demoDurationRows = GarageCompany::query()
            ->whereIn('status', RevenueCalculator::demoStatuses())
            ->get(['id', 'bedrijfsnaam', 'proefperiode_start', 'created_at'])
            ->map(function (GarageCompany $company) use ($todayStart) {
                $since = $company->proefperiode_start ?? $company->created_at;
                $days = 0;

                if ($since) {
                    $days = (int) max(0, round($since->copy()->startOfDay()->diffInDays($todayStart, false)));
                }

                return [
                    'id' => $company->id,
                    'bedrijfsnaam' => $company->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
                    'since_at' => $since?->toDateString(),
                    'days' => $days,
                ];
            });

        $activeDurationRows = GarageCompany::query()
            ->where('status', 'actief')
            ->get(['id', 'bedrijfsnaam', 'actief_vanaf', 'created_at'])
            ->map(function (GarageCompany $company) use ($todayStart) {
                $since = $company->actief_vanaf ?? $company->created_at;
                $days = 0;

                if ($since) {
                    $days = (int) max(0, round($since->copy()->startOfDay()->diffInDays($todayStart, false)));
                }

                return [
                    'id' => $company->id,
                    'bedrijfsnaam' => $company->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
                    'since_at' => $since?->toDateString(),
                    'days' => $days,
                ];
            });

        $activeSepaIssues = SepaChecklist::activeCompaniesWithIssues();

        // Gepauzeerde klanten; pauzes waarvan de einddatum voorbij is vragen om actie (hervatten?).
        $companiesPaused = GarageCompany::query()->where('status', GarageCompanyStatus::Gepauzeerd->value)->count();
        $pauseExpired = collect();
        if ($companiesPaused > 0 && GarageCompany::hasPauseColumns()) {
            $pauseExpired = GarageCompany::query()
                ->where('status', GarageCompanyStatus::Gepauzeerd->value)
                ->whereNotNull('gepauzeerd_tot')
                ->whereDate('gepauzeerd_tot', '<', $todayStart->toDateString())
                ->orderBy('gepauzeerd_tot')
                ->limit(50)
                ->get(['id', 'bedrijfsnaam', 'gepauzeerd_tot', 'gepauzeerd_reden'])
                ->map(fn (GarageCompany $company) => [
                    'id' => $company->id,
                    'bedrijfsnaam' => $company->bedrijfsnaam,
                    'gepauzeerd_tot' => $company->gepauzeerd_tot?->toDateString(),
                    'reden' => $company->gepauzeerd_reden,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'demo_status']),
                ])
                ->values();
        }

        // Laatste tijdlijnregels over alle klanten heen (alleen-lezen feed).
        $recentActivity = Activity::query()
            ->with(['garageCompany:id,bedrijfsnaam', 'creator:id,name'])
            ->whereHas('garageCompany')
            ->latest()
            ->latest('id')
            ->limit(10)
            ->get(['id', 'garage_company_id', 'type', 'titel', 'created_at', 'due_at', 'done_at', 'created_by'])
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'type' => $activity->type?->value,
                'titel' => $activity->titel,
                'created_at' => $activity->created_at?->toIso8601String(),
                'due_at' => $activity->due_at?->toIso8601String(),
                'done' => $activity->done_at !== null,
                'creator' => $activity->creator?->name,
                'garage_company' => [
                    'id' => $activity->garageCompany->id,
                    'bedrijfsnaam' => $activity->garageCompany->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $activity->garageCompany->id, 'tab' => 'timeline']),
                ],
            ])
            ->values();

        return Inertia::render('Crm/Dashboard', [
            'kpis' => [
                'companies_total' => $companiesTotal,
                'companies_active' => $companiesActive,
                'companies_demo_requested' => GarageCompany::query()->where('status', 'demo_aangevraagd')->count(),
                'leads_last_30' => $leadsLast30,
                'active_new_last_30' => $activeNewLast30,
                'demo_requested_last_30' => $demoRequestedLast30,
                'cancelled_last_30' => $cancelledLast30,
                'leads_prev_30' => $leadsPrev30,
                'active_new_prev_30' => $activeNewPrev30,
                'cancelled_prev_30' => $cancelledPrev30,
                'mrr_prev_month' => $mrrPrevMonth,
                'mrr_excl' => $mrrExcl,
                'mrr_btw' => $mrrBtw,
                'mrr_incl' => $mrrIncl,
                'demo_pipeline_excl' => $demoPipeline['excl'],
                'demo_pipeline_incl' => $demoPipeline['incl'],
                'tasks_open' => $tasksOpen,
                'tasks_overdue' => $tasksOverdue,
                'tasks_due_7' => $tasksDue7,
                'demo_customers' => $demoDurationRows->count(),
                'demo_avg_days' => (int) round((float) ($demoDurationRows->avg('days') ?? 0)),
                'active_avg_days' => (int) round((float) ($activeDurationRows->avg('days') ?? 0)),
                'active_missing_sepa' => $activeSepaIssues->count(),
                'companies_paused' => $companiesPaused,
                'pause_expired' => $pauseExpired->count(),
                'mandates_received_7' => \App\Services\Sepa\MandateRequestService::available()
                    ? \App\Models\SepaMandateRequest::query()->where('status', 'verwerkt')->where('completed_at', '>=', $now->copy()->subDays(7))->count()
                    : 0,
                'mandates_to_link' => \App\Services\Sepa\MandateRequestService::available()
                    ? \App\Models\SepaMandateRequest::query()->whereIn('status', ['ontvangen', 'fout'])->count()
                    : 0,
            ],
            'lists' => [
                'tasks' => $taskItems,
                'appointments' => [
                    // Komend = vanaf vandaag; verlopen afspraken staan al bij Vandaag.
                    'items' => $appointments
                        ->filter(fn (array $row) => $row['due_at'] !== null && strtotime($row['due_at']) >= $todayStart->getTimestamp())
                        ->take(12)
                        ->values(),
                    'overdue_count' => $appointments
                        ->filter(fn (array $row) => $row['due_at'] !== null && strtotime($row['due_at']) < $todayStart->getTimestamp())
                        ->count(),
                    'by_company' => $appointmentsByCompany,
                ],
                'status_duration' => [
                    'demo' => $demoDurationRows->sortByDesc('days')->take(12)->values(),
                    'active' => $activeDurationRows->sortByDesc('days')->take(12)->values(),
                ],
                'active_missing_sepa' => $activeSepaIssues->take(50)->values(),
                'pause_expired' => $pauseExpired,
                'today' => [
                    'tasks' => $myTasksToday,
                    'customer' => $customerToday,
                ],
                'demo_ending' => $demoEnding,
                'recent_activity' => $recentActivity,
            ],
            'urls' => [
                'tasks' => route('crm.tasks.index'),
                'customers' => route('crm.garage_companies.index'),
                'reports' => route('crm.reports.index'),
                'mandates' => auth()->user()?->isAdmin() ? route('crm.mandate_requests.index') : null,
            ],
            'meta' => [
                'generated_at' => $now->format('d-m-Y H:i'),
                'hour' => (int) $now->format('G'),
                'today' => $now->toDateString(),
            ],
        ]);
    }
}
