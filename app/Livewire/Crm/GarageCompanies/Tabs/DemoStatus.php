<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use Livewire\Component;

class DemoStatus extends Component
{
    public int $garageCompanyId;

    public string $status = 'lead';
    public ?string $demo_aangevraagd_op = null;
    public ?string $demo_gepland_op = null;
    public ?int $demo_duur_dagen = null;
    public ?string $demo_eind_op = null;
    public ?string $proefperiode_start = null;
    public ?string $actief_vanaf = null;
    public ?int $demo_verleng_dagen = null;
    public ?string $demo_verleng_notitie = null;

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
        $this->refreshFromModel();
    }

    public function saveDates(): void
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);
        $company->fill([
            'demo_aangevraagd_op' => $this->demo_aangevraagd_op,
            'demo_gepland_op' => $this->demo_gepland_op,
            'demo_duur_dagen' => $this->demo_duur_dagen,
            'proefperiode_start' => $this->proefperiode_start,
            'actief_vanaf' => $this->actief_vanaf,
        ]);

        if ($this->demo_aangevraagd_op && $this->demo_duur_dagen) {
            $company->demo_eind_op = \Illuminate\Support\Carbon::parse($this->demo_aangevraagd_op)
                ->addDays((int) $this->demo_duur_dagen);
        }
        $company->save();

        session()->flash('status', 'Datums opgeslagen.');
    }

    public function extendDemo(): void
    {
        if (! $this->demo_verleng_dagen || $this->demo_verleng_dagen < 1) {
            session()->flash('status', 'Vul een geldig aantal dagen in.');
            return;
        }

        $company = GarageCompany::findOrFail($this->garageCompanyId);

        if (! $company->demo_eind_op && $company->demo_aangevraagd_op) {
            $basisDagen = $company->demo_duur_dagen ?? 0;
            $company->demo_eind_op = $company->demo_aangevraagd_op->copy()->addDays($basisDagen);
        }

        if (! $company->demo_eind_op) {
            session()->flash('status', 'Stel eerst een demo einddatum in.');
            return;
        }

        $company->demo_eind_op = $company->demo_eind_op->copy()->addDays($this->demo_verleng_dagen);
        $company->demo_duur_dagen = (int) ($company->demo_duur_dagen ?? 0) + (int) $this->demo_verleng_dagen;
        $company->save();

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Demo,
            'titel' => "Demo verlengd met {$this->demo_verleng_dagen} dagen",
            'inhoud' => $this->demo_verleng_notitie ?: null,
            'created_by' => auth()->id(),
        ]);

        $this->demo_verleng_dagen = null;
        $this->demo_verleng_notitie = null;
        $this->refreshFromModel();

        session()->flash('status', 'Demo verlengd.');
    }

    public function setStatus(string $to): void
    {
        $company = GarageCompany::with('mandates')->findOrFail($this->garageCompanyId);
        $from = $company->status->value;

        if (! $this->canTransition($from, $to)) {
            session()->flash('status', 'Ongeldige status overgang.');
            return;
        }

        if ($to === GarageCompanyStatus::DemoAangevraagd->value && ! $company->demo_aangevraagd_op) {
            $company->demo_aangevraagd_op = now();
        }

        if ($to === GarageCompanyStatus::DemoGepland->value && ! $company->demo_gepland_op) {
            session()->flash('status', 'Vul eerst demo_gepland_op in.');
            return;
        }

        if ($to === GarageCompanyStatus::Proefperiode->value && ! $company->proefperiode_start) {
            $company->proefperiode_start = now();
        }

        if ($to === GarageCompanyStatus::Actief->value) {
            if (! $company->actief_vanaf) {
                $company->actief_vanaf = now();
            }

            $hasActiveMandate = $company->mandates->firstWhere('status', SepaMandateStatus::Actief) !== null;
            if (! $hasActiveMandate) {
                session()->flash('status', 'Actief vereist een SEPA mandaat met status actief.');
                return;
            }
        }

        $company->status = GarageCompanyStatus::from($to);
        $company->save();

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::StatusWijziging,
            'titel' => "Status gewijzigd: {$from} → {$to}",
            'inhoud' => null,
            'created_by' => auth()->id(),
        ]);

        $this->refreshFromModel();
        session()->flash('status', 'Status bijgewerkt.');
    }

    private function refreshFromModel(): void
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $this->status = $company->status->value;
        $this->demo_aangevraagd_op = optional($company->demo_aangevraagd_op)->format('Y-m-d\TH:i');
        $this->demo_gepland_op = optional($company->demo_gepland_op)->format('Y-m-d\TH:i');
        $this->demo_duur_dagen = $company->demo_duur_dagen;
        $this->demo_eind_op = optional($company->demo_eind_op)->format('Y-m-d\TH:i');
        $this->proefperiode_start = optional($company->proefperiode_start)->format('Y-m-d\TH:i');
        $this->actief_vanaf = optional($company->actief_vanaf)->format('Y-m-d\TH:i');
    }

    private function canTransition(string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        $flow = [
            GarageCompanyStatus::Lead->value => [GarageCompanyStatus::DemoAangevraagd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::DemoAangevraagd->value => [GarageCompanyStatus::DemoGepland->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::DemoGepland->value => [GarageCompanyStatus::Proefperiode->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Proefperiode->value => [GarageCompanyStatus::Actief->value, GarageCompanyStatus::Opgezegd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Actief->value => [GarageCompanyStatus::Opgezegd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Opgezegd->value => [],
            GarageCompanyStatus::Verloren->value => [],
        ];

        return in_array($to, $flow[$from] ?? [], true);
    }

    public function render()
    {
        $company = GarageCompany::with('mandates')->findOrFail($this->garageCompanyId);
        $hasActiveMandate = $company->mandates->firstWhere('status', SepaMandateStatus::Actief) !== null;

        return view('livewire.crm.garage-companies.tabs.demo-status', [
            'company' => $company,
            'hasActiveMandate' => $hasActiveMandate,
        ]);
    }
}
