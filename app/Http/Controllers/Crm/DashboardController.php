<?php

namespace App\Http\Controllers\Crm;

use App\Enums\TaskStatus;
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
            'urls' => [
                'dashboard_old' => route('dashboard.old'),
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

