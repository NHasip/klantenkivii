<?php

namespace App\Livewire\Crm\Reports;

use App\Enums\GarageCompanyStatus;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use App\Models\SepaMandate;
use App\Services\Crm\RevenueCalculator;
use App\Services\Crm\SepaChecklist;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Livewire\Component;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        $demoStarted = GarageCompany::query()
            ->whereBetween('proefperiode_start', [$start, $end])
            ->count();

        $cancelled = GarageCompany::query()
            ->whereBetween('opgezegd_op', [$start, $end])
            ->count();

        $lost = GarageCompany::query()
            ->whereBetween('verloren_op', [$start, $end])
            ->count();

        // Oude statuswaarden (lead, demo_gepland) tellen mee bij hun huidige tegenhanger.
        $funnel = GarageCompany::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->reduce(function (array $carry, $total, $status) {
                $key = GarageCompanyStatus::normalize((string) $status);
                $carry[$key] = ($carry[$key] ?? 0) + (int) $total;

                return $carry;
            }, []);

        $mandatesActive = SepaMandate::query()->where('status', 'actief')->count();
        $mandatesPending = SepaMandate::query()->where('status', 'pending')->count();

        // Zelfde definitie als de SEPA-lijst op het dashboard.
        $activeWithoutMandate = SepaChecklist::activeCompaniesWithIssues()->count();

        $modulesTotal = Module::query()->count();

        // Zelfde berekening als dashboard en klantenlijst: alleen klanten met status Actief.
        $mrr = RevenueCalculator::mrr();
        $demoPipeline = RevenueCalculator::demoPipeline();

        $modulesOverview = $this->modulesOverview();

        $modulesActive = (int) $modulesOverview->filter(fn ($row) => (int) $row->total_aantal > 0)->count();
        $modulesTotalAantal = (int) $modulesOverview->sum(fn ($row) => (int) $row->total_aantal);

        $topCustomers = $this->topCustomers();

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
                'demo_started' => $demoStarted,
                'cancelled' => $cancelled,
                'lost' => $lost,
                'mandates_active' => $mandatesActive,
                'mandates_pending' => $mandatesPending,
                'active_without_mandate' => $activeWithoutMandate,
                'modules_total' => $modulesTotal,
                'modules_active' => $modulesActive,
                'modules_total_aantal' => $modulesTotalAantal,
                'mrr_excl' => $mrr['excl'],
                'mrr_btw' => $mrr['btw'],
                'mrr_incl' => $mrr['incl'],
                'demo_pipeline_excl' => $demoPipeline['excl'],
                'demo_pipeline_incl' => $demoPipeline['incl'],
            ],
            'funnel' => $funnel,
            'modulesOverview' => $modulesOverview,
            'topCustomers' => $topCustomers,
            'mrrHistory' => RevenueCalculator::mrrHistory(12),
            'flowByMonth' => $this->flowByMonth(12),
            'customersUrl' => route('crm.garage_companies.index'),
        ])->layout('layouts.crm', ['title' => 'Rapportages']);
    }

    private function modulesOverview(): Collection
    {
        // Modules per module, alleen voor klanten met status Actief (demo telt niet mee).
        return Module::query()
            ->leftJoin('garage_company_modules as gcm', function ($join) {
                $join->on('gcm.module_id', '=', 'modules.id');
                RevenueCalculator::constrainActiveModules($join, 'gcm.');
                $join->whereIn('gcm.garage_company_id', RevenueCalculator::companyIdsWithStatus(RevenueCalculator::activeStatuses()));
            })
            ->select('modules.id', 'modules.naam')
            ->selectRaw('COUNT(DISTINCT gcm.garage_company_id) as active_customers')
            ->selectRaw(GarageCompanyModule::hasAantalColumn()
                ? 'COALESCE(SUM(gcm.aantal), 0) as total_aantal'
                : 'COUNT(gcm.id) as total_aantal')
            ->selectRaw(GarageCompanyModule::hasAantalColumn()
                ? 'COALESCE(SUM(gcm.prijs_maand_excl * gcm.aantal), 0) as mrr_excl'
                : 'COALESCE(SUM(gcm.prijs_maand_excl), 0) as mrr_excl')
            ->selectRaw('COALESCE(MIN(gcm.btw_percentage), 21.00) as btw_min')
            ->selectRaw('COALESCE(MAX(gcm.btw_percentage), 21.00) as btw_max')
            ->groupBy('modules.id', 'modules.naam')
            ->orderBy('modules.naam')
            ->get();
    }

    private function topCustomers(?int $limit = 10): Collection
    {
        $query = RevenueCalculator::activeModulesQuery(RevenueCalculator::activeStatuses())
            ->join('garage_companies', 'garage_companies.id', '=', 'garage_company_modules.garage_company_id')
            ->select('garage_companies.id', 'garage_companies.bedrijfsnaam', 'garage_companies.plaats', 'garage_companies.status')
            ->selectRaw(GarageCompanyModule::hasAantalColumn()
                ? 'SUM(garage_company_modules.prijs_maand_excl * garage_company_modules.aantal) as mrr_excl'
                : 'SUM(garage_company_modules.prijs_maand_excl) as mrr_excl')
            ->groupBy('garage_companies.id', 'garage_companies.bedrijfsnaam', 'garage_companies.plaats', 'garage_companies.status')
            ->orderByDesc('mrr_excl');

        if ($limit !== null) {
            $query->limit($limit);
        }

        return $query->get();
    }

    /**
     * Instroom (nieuw actief op actief_vanaf) en uitstroom (opgezegd_op / verloren_op) per maand.
     *
     * @return list<array{month: string, label: string, in: int, opgezegd: int, verloren: int}>
     */
    private function flowByMonth(int $months): array
    {
        $now = CarbonImmutable::now('Europe/Amsterdam');
        $start = $now->startOfMonth()->subMonthsNoOverflow($months - 1);
        $end = $now->endOfMonth();

        $buckets = [];
        for ($i = 0; $i < $months; $i++) {
            $month = $start->addMonthsNoOverflow($i);
            $buckets[$month->format('Y-m')] = [
                'month' => $month->format('Y-m'),
                'label' => $month->locale('nl')->translatedFormat('M Y'),
                'in' => 0,
                'opgezegd' => 0,
                'verloren' => 0,
            ];
        }

        foreach (['actief_vanaf' => 'in', 'opgezegd_op' => 'opgezegd', 'verloren_op' => 'verloren'] as $column => $key) {
            GarageCompany::query()
                ->whereNotNull($column)
                ->whereBetween($column, [$start, $end])
                ->pluck($column)
                ->each(function ($value) use (&$buckets, $key) {
                    $monthKey = CarbonImmutable::parse($value)->setTimezone('Europe/Amsterdam')->format('Y-m');
                    if (isset($buckets[$monthKey])) {
                        $buckets[$monthKey][$key]++;
                    }
                });
        }

        return array_values($buckets);
    }

    /**
     * CSV-export van een tabel uit de rapportage.
     */
    public function export(string $table): StreamedResponse
    {
        $money = fn ($value) => number_format((float) $value, 2, ',', '');

        [$filename, $header, $rows] = match ($table) {
            'modules' => [
                'modules-prestaties',
                ['Module', 'Klanten', 'Aantal', 'MRR excl. btw'],
                $this->modulesOverview()->map(fn ($row) => [$row->naam, (int) $row->active_customers, (int) $row->total_aantal, $money($row->mrr_excl)])->all(),
            ],
            'klanten' => [
                'klanten-op-mrr',
                ['Klant', 'Plaats', 'MRR excl. btw'],
                $this->topCustomers(null)->map(fn ($row) => [$row->bedrijfsnaam, $row->plaats, $money($row->mrr_excl)])->all(),
            ],
            'mrr' => [
                'mrr-per-maand',
                ['Maand', 'MRR excl. btw'],
                collect(RevenueCalculator::mrrHistory(12))->map(fn ($row) => [$row['month'], $money($row['excl'])])->all(),
            ],
            'instroom' => [
                'instroom-uitstroom',
                ['Maand', 'Nieuw actief', 'Opgezegd', 'Verloren'],
                collect($this->flowByMonth(12))->map(fn ($row) => [$row['month'], $row['in'], $row['opgezegd'], $row['verloren']])->all(),
            ],
            default => abort(404),
        };

        $filename .= '-'.CarbonImmutable::now('Europe/Amsterdam')->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $header, ';');
            foreach ($rows as $row) {
                // Voorkom formule-injectie in spreadsheetprogramma's.
                $row = array_map(function ($value) {
                    $value = (string) $value;

                    return preg_match('/^[=+\-@\t\r]/', $value) && ! is_numeric(str_replace(',', '.', $value)) ? "'".$value : $value;
                }, $row);
                fputcsv($out, $row, ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
