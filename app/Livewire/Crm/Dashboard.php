<?php

namespace App\Livewire\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use Livewire\Component;

class Dashboard extends Component
{
    public string $periode = 'deze_maand'; // deze_maand|laatste_30|laatste_90|custom

    public string $status = 'alle';

    public string $land = 'Nederland'; // Nederland|alle

    public ?string $start = null;

    public ?string $end = null;

    public function render()
    {
        [$from, $to] = $this->range();

        $companies = GarageCompany::query()
            ->when($this->land !== 'alle', fn ($q) => $q->where('land', $this->land))
            ->when($this->status !== 'alle', fn ($q) => $q->where('status', $this->status));

        $companyIds = (clone $companies)->pluck('id');

        $activeModuleRows = GarageCompanyModule::query()
            ->whereIn('garage_company_id', $companyIds)
            ->where('actief', true)
            ->where(function ($q) {
                $q->whereNull('startdatum')->orWhere('startdatum', '<=', now()->toDateString());
            })
            ->where(function ($q) {
                $q->whereNull('einddatum')->orWhere('einddatum', '>=', now()->toDateString());
            })
            ->get(['prijs_maand_excl', 'btw_percentage']);

        $mrrExcl = (float) $activeModuleRows->sum('prijs_maand_excl');
        $mrrBtw = 0.0;
        foreach ($activeModuleRows as $row) {
            $mrrBtw += (float) $row->prijs_maand_excl * ((float) $row->btw_percentage / 100);
        }

        $newActief = (clone $companies)
            ->whereNotNull('actief_vanaf')
            ->whereBetween('actief_vanaf', [$from, $to])
            ->count();

        $opzeggingen = (clone $companies)
            ->whereNotNull('opgezegd_op')
            ->whereBetween('opgezegd_op', [$from, $to])
            ->count();

        $demoAangevraagd = (clone $companies)
            ->whereNotNull('demo_aangevraagd_op')
            ->whereBetween('demo_aangevraagd_op', [$from, $to])
            ->count();

        $demoLaatste30 = (clone $companies)
            ->whereNotNull('demo_aangevraagd_op')
            ->whereBetween('demo_aangevraagd_op', [now()->subDays(30), now()])
            ->count();

        $actiefLaatste30 = (clone $companies)
            ->whereNotNull('actief_vanaf')
            ->whereBetween('actief_vanaf', [now()->subDays(30), now()])
            ->count();

        $conversieDemoNaarActief30 = $demoLaatste30 > 0 ? round(($actiefLaatste30 / $demoLaatste30) * 100, 1) : null;

        $avgDemoNaarActief = (clone $companies)
            ->whereNotNull('demo_aangevraagd_op')
            ->whereNotNull('actief_vanaf')
            ->whereBetween('actief_vanaf', [now()->subDays(90), now()])
            ->get(['demo_aangevraagd_op', 'actief_vanaf'])
            ->map(fn ($c) => $c->demo_aangevraagd_op->diffInDays($c->actief_vanaf))
            ->average();

        $pipeline = (clone $companies)
            ->selectRaw('status, count(*) as totaal')
            ->groupBy('status')
            ->pluck('totaal', 'status')
            ->toArray();

        $demoOuderDan7 = (clone $companies)
            ->where('status', GarageCompanyStatus::DemoAangevraagd)
            ->whereNotNull('demo_aangevraagd_op')
            ->where('demo_aangevraagd_op', '<', now()->subDays(7))
            ->orderBy('demo_aangevraagd_op')
            ->limit(10)
            ->get();

        $zonderMandaatNaDemo7 = (clone $companies)
            ->whereIn('status', [GarageCompanyStatus::DemoAangevraagd, GarageCompanyStatus::DemoGepland])
            ->whereNotNull('demo_aangevraagd_op')
            ->where('demo_aangevraagd_op', '<', now()->subDays(7))
            ->whereDoesntHave('mandates')
            ->limit(10)
            ->get();

        $actiefZonderActiefMandaat = (clone $companies)
            ->whereIn('status', [GarageCompanyStatus::Actief, GarageCompanyStatus::Proefperiode])
            ->whereDoesntHave('mandates', fn ($q) => $q->where('status', SepaMandateStatus::Actief))
            ->limit(10)
            ->get();

        $mandatenPending = (clone $companies)
            ->whereHas('mandates', fn ($q) => $q->where('status', SepaMandateStatus::Pending))
            ->count();

        $mandatenActief = (clone $companies)
            ->whereHas('mandates', fn ($q) => $q->where('status', SepaMandateStatus::Actief))
            ->count();

        $moduleAdoptie = Module::query()
            ->leftJoin('garage_company_modules', 'garage_company_modules.module_id', '=', 'modules.id')
            ->where(function ($q) use ($companyIds) {
                $q->whereNull('garage_company_modules.garage_company_id')
                    ->orWhereIn('garage_company_modules.garage_company_id', $companyIds);
            })
            ->selectRaw('modules.id, modules.naam, sum(case when garage_company_modules.actief = 1 then 1 else 0 end) as actief_aantal')
            ->groupBy('modules.id', 'modules.naam')
            ->orderByDesc('actief_aantal')
            ->limit(5)
            ->get();

        $seatsTop10 = GarageCompany::query()
            ->whereIn('id', $companyIds)
            ->withCount(['seats as actieve_seats' => fn ($q) => $q->where('actief', true)])
            ->orderByDesc('actieve_seats')
            ->limit(10)
            ->get();

        $afsprakenKomend = Activity::query()
            ->whereIn('garage_company_id', $companyIds)
            ->where('type', ActivityType::Afspraak)
            ->whereNull('done_at')
            ->whereBetween('due_at', [now()->startOfDay(), now()->addDays(7)->endOfDay()])
            ->orderBy('due_at')
            ->limit(10)
            ->get();

        $takenOpen = Activity::query()
            ->whereIn('garage_company_id', $companyIds)
            ->where('type', ActivityType::Taak)
            ->whereNull('done_at')
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->limit(10)
            ->get();

        $laatsteActiviteiten = Activity::query()
            ->whereIn('garage_company_id', $companyIds)
            ->latest()
            ->limit(10)
            ->get();

        return view('livewire.crm.dashboard', [
            'from' => $from,
            'to' => $to,
            'mrrExcl' => $mrrExcl,
            'mrrBtw' => $mrrBtw,
            'mrrIncl' => $mrrExcl + $mrrBtw,
            'newActief' => $newActief,
            'opzeggingen' => $opzeggingen,
            'demoAangevraagd' => $demoAangevraagd,
            'conversieDemoNaarActief30' => $conversieDemoNaarActief30,
            'avgDemoNaarActief' => $avgDemoNaarActief,
            'pipeline' => $pipeline,
            'demoOuderDan7' => $demoOuderDan7,
            'zonderMandaatNaDemo7' => $zonderMandaatNaDemo7,
            'actiefZonderActiefMandaat' => $actiefZonderActiefMandaat,
            'mandatenPending' => $mandatenPending,
            'mandatenActief' => $mandatenActief,
            'moduleAdoptie' => $moduleAdoptie,
            'seatsTop10' => $seatsTop10,
            'afsprakenKomend' => $afsprakenKomend,
            'takenOpen' => $takenOpen,
            'laatsteActiviteiten' => $laatsteActiviteiten,
        ])->layout('layouts.crm', ['title' => 'Dashboard']);
    }

    /**
     * @return array{0:\Illuminate\Support\Carbon,1:\Illuminate\Support\Carbon}
     */
    private function range(): array
    {
        return match ($this->periode) {
            'laatste_30' => [now()->subDays(30)->startOfDay(), now()->endOfDay()],
            'laatste_90' => [now()->subDays(90)->startOfDay(), now()->endOfDay()],
            'custom' => [
                ($this->start ? \Illuminate\Support\Carbon::parse($this->start) : now()->startOfMonth())->startOfDay(),
                ($this->end ? \Illuminate\Support\Carbon::parse($this->end) : now())->endOfDay(),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }
}
