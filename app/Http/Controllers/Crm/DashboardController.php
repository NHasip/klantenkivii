<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\TaskStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Task;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
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

        $today = $now->toDateString();
        $activeModulesQuery = GarageCompanyModule::query()
            ->where('actief', true)
            ->where(function ($q) use ($today) {
                $q->whereNull('startdatum')->orWhere('startdatum', '<=', $today);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('einddatum')->orWhere('einddatum', '>=', $today);
            });

        $mrrExclExpr = GarageCompanyModule::hasAantalColumn()
            ? DB::raw('(prijs_maand_excl * aantal)')
            : 'prijs_maand_excl';

        $mrrBtwExpr = GarageCompanyModule::hasAantalColumn()
            ? DB::raw('((prijs_maand_excl * aantal) * (btw_percentage / 100))')
            : DB::raw('(prijs_maand_excl * (btw_percentage / 100))');

        $mrrExcl = (float) (clone $activeModulesQuery)->sum($mrrExclExpr);
        $mrrBtw = (float) (clone $activeModulesQuery)->sum($mrrBtwExpr);
        $mrrIncl = $mrrExcl + $mrrBtw;

        $tasksOpen = Task::query()->where('status', '!=', TaskStatus::Afgerond)->count();
        $tasksOverdue = Task::query()
            ->where('status', '!=', TaskStatus::Afgerond)
            ->whereNotNull('deadline')
            ->where('deadline', '<', $now)
            ->count();
        $tasksDue7 = Task::query()
            ->where('status', '!=', TaskStatus::Afgerond)
            ->whereNotNull('deadline')
            ->whereBetween('deadline', [$now, $now->addDays(7)->endOfDay()])
            ->count();

        $taskItems = Task::query()
            ->with(['project:id,naam'])
            ->where('status', '!=', TaskStatus::Afgerond)
            ->orderByRaw('case when deadline is null then 1 else 0 end, deadline asc')
            ->limit(12)
            ->get(['id', 'task_project_id', 'titel', 'status', 'prioriteit', 'deadline'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'titel' => $task->titel,
                'status' => $task->status?->value,
                'prioriteit' => $task->prioriteit?->value,
                'deadline' => $task->deadline?->toIso8601String(),
                'project' => $task->project ? [
                    'id' => $task->project->id,
                    'naam' => $task->project->naam,
                ] : null,
            ])
            ->values();

        $appointments = Activity::query()
            ->with('garageCompany:id,bedrijfsnaam')
            ->where('type', ActivityType::Afspraak)
            ->whereNull('done_at')
            ->whereNotNull('due_at')
            ->orderBy('due_at')
            ->limit(50)
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

        $appointmentsByCompany = $appointments
            ->filter(fn (array $row) => is_array($row['garage_company'] ?? null))
            ->groupBy(fn (array $row) => (string) $row['garage_company']['id'])
            ->map(function ($items) {
                /** @var \Illuminate\Support\Collection<int, array{id:int,titel:string,due_at:?string,garage_company:array{id:int,bedrijfsnaam:string,url:string}}> $items */
                $first = $items->first();

                return [
                    'garage_company' => $first['garage_company'],
                    'aantal' => $items->count(),
                    'eerstvolgende' => [
                        'titel' => $first['titel'],
                        'due_at' => $first['due_at'],
                    ],
                ];
            })
            ->sortByDesc(fn (array $row) => $row['aantal'])
            ->take(12)
            ->values();

        return Inertia::render('Crm/Dashboard', [
            'kpis' => [
                'companies_total' => $companiesTotal,
                'companies_active' => $companiesActive,
                'leads_last_30' => $leadsLast30,
                'active_new_last_30' => $activeNewLast30,
                'demo_requested_last_30' => $demoRequestedLast30,
                'cancelled_last_30' => $cancelledLast30,
                'mrr_excl' => $mrrExcl,
                'mrr_btw' => $mrrBtw,
                'mrr_incl' => $mrrIncl,
                'tasks_open' => $tasksOpen,
                'tasks_overdue' => $tasksOverdue,
                'tasks_due_7' => $tasksDue7,
            ],
            'lists' => [
                'tasks' => $taskItems,
                'appointments' => [
                    'items' => $appointments->take(12)->values(),
                    'by_company' => $appointmentsByCompany,
                ],
            ],
            'urls' => [
                'tasks' => route('crm.tasks.index'),
                'customers' => route('crm.garage_companies.index'),
                'reports' => route('crm.reports.index'),
            ],
            'meta' => [
                'generated_at' => $now->format('d-m-Y H:i'),
            ],
        ]);
    }
}
