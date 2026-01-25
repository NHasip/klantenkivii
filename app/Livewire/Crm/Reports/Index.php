<?php

namespace App\Livewire\Crm\Reports;

use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\KiviiSeat;
use App\Models\SepaMandate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Index extends Component
{
    public string $preset = '30d';
    public ?string $from = null;
    public ?string $to = null;

    public string $appliedPreset = '30d';
    public ?string $appliedFrom = null;
    public ?string $appliedTo = null;

    public function mount(): void
    {
        $this->applyFilters();
    }

    public function applyFilters(): void
    {
        $validated = $this->validate([
            'preset' => ['required', 'string', Rule::in(array_keys($this->presetOptions()))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $this->appliedPreset = $validated['preset'];
        $this->appliedFrom = $validated['from'] ?? null;
        $this->appliedTo = $validated['to'] ?? null;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function appliedRange(): array
    {
        $today = CarbonImmutable::now('Europe/Amsterdam');

        if ($this->appliedPreset === 'custom') {
            $start = $this->appliedFrom
                ? CarbonImmutable::parse($this->appliedFrom, 'Europe/Amsterdam')->startOfDay()
                : $today->subDays(29)->startOfDay();

            $end = $this->appliedTo
                ? CarbonImmutable::parse($this->appliedTo, 'Europe/Amsterdam')->endOfDay()
                : $today->endOfDay();

            return [$start, $end];
        }

        return match ($this->appliedPreset) {
            'today' => [$today->startOfDay(), $today->endOfDay()],
            '7d' => [$today->subDays(6)->startOfDay(), $today->endOfDay()],
            '30d' => [$today->subDays(29)->startOfDay(), $today->endOfDay()],
            'this_month' => [$today->startOfMonth()->startOfDay(), $today->endOfDay()],
            'last_month' => [$today->subMonthNoOverflow()->startOfMonth()->startOfDay(), $today->subMonthNoOverflow()->endOfMonth()->endOfDay()],
            'ytd' => [$today->startOfYear()->startOfDay(), $today->endOfDay()],
            default => [$today->subDays(29)->startOfDay(), $today->endOfDay()],
        };
    }

    /**
     * @return array<string, string>
     */
    public function presetOptions(): array
    {
        return [
            'today' => 'Vandaag',
            '7d' => 'Laatste 7 dagen',
            '30d' => 'Laatste 30 dagen',
            'this_month' => 'Deze maand',
            'last_month' => 'Vorige maand',
            'ytd' => 'Dit jaar',
            'custom' => 'Aangepast',
        ];
    }

    private function activeModulesQuery(): \Illuminate\Database\Eloquent\Builder
    {
        $today = CarbonImmutable::now('Europe/Amsterdam')->toDateString();

        return GarageCompanyModule::query()
            ->where('actief', true)
            ->where(function ($q) use ($today) {
                $q->whereNull('startdatum')->orWhere('startdatum', '<=', $today);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('einddatum')->orWhere('einddatum', '>=', $today);
            });
    }

    public function render()
    {
        [$start, $end] = $this->appliedRange();

        $companiesTotal = GarageCompany::query()->count();
        $companiesActive = GarageCompany::query()->where('status', 'actief')->count();

        $leadsNew = GarageCompany::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $activeNew = GarageCompany::query()
            ->whereBetween('actief_vanaf', [$start, $end])
            ->count();

        $demoRequested = GarageCompany::query()
            ->whereBetween('demo_aangevraagd_op', [$start, $end])
            ->count();

        $demoScheduled = GarageCompany::query()
            ->whereBetween('demo_gepland_op', [$start, $end])
            ->count();

        $cancelled = GarageCompany::query()
            ->whereBetween('opgezegd_op', [$start, $end])
            ->count();

        $lost = GarageCompany::query()
            ->whereBetween('verloren_op', [$start, $end])
            ->count();

        $funnel = GarageCompany::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $activeSeats = KiviiSeat::query()->where('actief', true)->count();

        $mandatesActive = SepaMandate::query()->where('status', 'actief')->count();
        $mandatesPending = SepaMandate::query()->where('status', 'pending')->count();

        $activeWithoutMandate = GarageCompany::query()
            ->where('status', 'actief')
            ->whereDoesntHave('activeMandate')
            ->count();

        $modulesQuery = $this->activeModulesQuery();

        $mrrExcl = (float) (clone $modulesQuery)->sum('prijs_maand_excl');
        $mrrBtw = (float) (clone $modulesQuery)->sum(DB::raw('(prijs_maand_excl * (btw_percentage / 100))'));
        $mrrIncl = $mrrExcl + $mrrBtw;

        $mrrPerModule = (clone $modulesQuery)
            ->join('modules', 'modules.id', '=', 'garage_company_modules.module_id')
            ->select('modules.id', 'modules.naam')
            ->selectRaw('COUNT(*) as subscriptions')
            ->selectRaw('SUM(garage_company_modules.prijs_maand_excl) as mrr_excl')
            ->groupBy('modules.id', 'modules.naam')
            ->orderByDesc('mrr_excl')
            ->get();

        $topCustomers = (clone $modulesQuery)
            ->join('garage_companies', 'garage_companies.id', '=', 'garage_company_modules.garage_company_id')
            ->select('garage_companies.id', 'garage_companies.bedrijfsnaam', 'garage_companies.plaats', 'garage_companies.status')
            ->selectRaw('SUM(garage_company_modules.prijs_maand_excl) as mrr_excl')
            ->groupBy('garage_companies.id', 'garage_companies.bedrijfsnaam', 'garage_companies.plaats', 'garage_companies.status')
            ->orderByDesc('mrr_excl')
            ->limit(10)
            ->get();

        $cancellationsByMonth = $this->cancellationsByMonth($start->subMonths(5)->startOfMonth());

        return view('livewire.crm.reports.index', [
            'range' => [
                'start' => $start,
                'end' => $end,
            ],
            'kpis' => [
                'companies_total' => $companiesTotal,
                'companies_active' => $companiesActive,
                'leads_new' => $leadsNew,
                'active_new' => $activeNew,
                'demo_requested' => $demoRequested,
                'demo_scheduled' => $demoScheduled,
                'cancelled' => $cancelled,
                'lost' => $lost,
                'active_seats' => $activeSeats,
                'mandates_active' => $mandatesActive,
                'mandates_pending' => $mandatesPending,
                'active_without_mandate' => $activeWithoutMandate,
                'mrr_excl' => $mrrExcl,
                'mrr_btw' => $mrrBtw,
                'mrr_incl' => $mrrIncl,
            ],
            'funnel' => $funnel,
            'mrrPerModule' => $mrrPerModule,
            'topCustomers' => $topCustomers,
            'cancellationsByMonth' => $cancellationsByMonth,
        ])->layout('layouts.crm', ['title' => 'Rapportages']);
    }

    /**
     * @return Collection<int, array{month: CarbonImmutable, total: int}>
     */
    private function cancellationsByMonth(CarbonImmutable $fromMonth): Collection
    {
        $start = $fromMonth->startOfMonth();
        $end = CarbonImmutable::now('Europe/Amsterdam')->endOfMonth();

        $rows = GarageCompany::query()
            ->whereNotNull('opgezegd_op')
            ->whereBetween('opgezegd_op', [$start, $end])
            ->get(['opgezegd_op']);

        $buckets = [];
        $cursor = $start;
        while ($cursor <= $end) {
            $buckets[$cursor->format('Y-m')] = 0;
            $cursor = $cursor->addMonth();
        }

        foreach ($rows as $row) {
            $key = CarbonImmutable::parse($row->opgezegd_op, 'Europe/Amsterdam')->format('Y-m');
            if (array_key_exists($key, $buckets)) {
                $buckets[$key]++;
            }
        }

        return collect($buckets)->map(function (int $total, string $key) {
            return [
                'month' => CarbonImmutable::parse($key.'-01', 'Europe/Amsterdam')->startOfMonth(),
                'total' => $total,
            ];
        })->values();
    }
}
