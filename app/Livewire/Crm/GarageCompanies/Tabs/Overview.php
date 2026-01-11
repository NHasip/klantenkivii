<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Overview extends Component
{
    public int $garageCompanyId;

    public string $bedrijfsnaam = '';
    public ?string $kvk_nummer = null;
    public ?string $btw_nummer = null;
    public ?string $adres_straat_nummer = null;
    public ?string $postcode = null;
    public string $plaats = '';
    public string $land = 'Nederland';
    public ?string $website = null;
    public string $hoofd_email = '';
    public string $hoofd_telefoon = '';
    public string $status = 'lead';
    public string $bron = 'website_formulier';
    public ?string $tags = null;

    public ?string $demo_aangevraagd_op = null;
    public ?string $demo_gepland_op = null;
    public ?string $proefperiode_start = null;
    public ?string $actief_vanaf = null;
    public ?string $opgezegd_op = null;
    public ?string $opzegreden = null;
    public ?string $verloren_op = null;
    public ?string $verloren_reden = null;

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
        $this->fillFromModel();
    }

    public function save(): void
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);
        $oldStatus = $company->status->value;

        $data = $this->validate($this->rules());

        $company->fill($data);
        $company->save();

        if ($oldStatus !== $company->status->value) {
            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::StatusWijziging,
                'titel' => "Status gewijzigd: {$oldStatus} → {$company->status->value}",
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);
        }

        $this->dispatch('saved');
        session()->flash('status', 'Opgeslagen.');
    }

    private function fillFromModel(): void
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $this->bedrijfsnaam = $company->bedrijfsnaam;
        $this->kvk_nummer = $company->kvk_nummer;
        $this->btw_nummer = $company->btw_nummer;
        $this->adres_straat_nummer = $company->adres_straat_nummer;
        $this->postcode = $company->postcode;
        $this->plaats = $company->plaats;
        $this->land = $company->land;
        $this->website = $company->website;
        $this->hoofd_email = $company->hoofd_email;
        $this->hoofd_telefoon = $company->hoofd_telefoon;
        $this->status = $company->status->value;
        $this->bron = $company->bron->value;
        $this->tags = $company->tags;

        $this->demo_aangevraagd_op = optional($company->demo_aangevraagd_op)->format('Y-m-d\TH:i');
        $this->demo_gepland_op = optional($company->demo_gepland_op)->format('Y-m-d\TH:i');
        $this->proefperiode_start = optional($company->proefperiode_start)->format('Y-m-d\TH:i');
        $this->actief_vanaf = optional($company->actief_vanaf)->format('Y-m-d\TH:i');
        $this->opgezegd_op = optional($company->opgezegd_op)->format('Y-m-d\TH:i');
        $this->opzegreden = $company->opzegreden;
        $this->verloren_op = optional($company->verloren_op)->format('Y-m-d\TH:i');
        $this->verloren_reden = $company->verloren_reden;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'kvk_nummer' => ['nullable', 'string', 'max:50'],
            'btw_nummer' => ['nullable', 'string', 'max:50'],
            'adres_straat_nummer' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'hoofd_email' => ['required', 'email', 'max:255'],
            'hoofd_telefoon' => ['required', 'string', 'max:50'],
            'status' => ['required', Rule::enum(GarageCompanyStatus::class)],
            'bron' => ['required', Rule::enum(GarageCompanySource::class)],
            'tags' => ['nullable', 'string'],

            'demo_aangevraagd_op' => ['nullable', 'date'],
            'demo_gepland_op' => ['nullable', 'date'],
            'proefperiode_start' => ['nullable', 'date'],
            'actief_vanaf' => ['nullable', 'date'],
            'opgezegd_op' => ['nullable', 'date'],
            'opzegreden' => ['nullable', 'string'],
            'verloren_op' => ['nullable', 'date'],
            'verloren_reden' => ['nullable', 'string'],
        ];
    }

    public function updatedStatus(string $value): void
    {
        if ($value === GarageCompanyStatus::DemoAangevraagd->value && ! $this->demo_aangevraagd_op) {
            $this->demo_aangevraagd_op = now()->format('Y-m-d\TH:i');
        }

        if ($value === GarageCompanyStatus::Actief->value && ! $this->actief_vanaf) {
            $this->actief_vanaf = now()->format('Y-m-d\TH:i');
        }
    }

    public function render()
    {
        $company = GarageCompany::with(['mandates'])->findOrFail($this->garageCompanyId);

        $hasActiveMandate = $company->mandates()->where('status', SepaMandateStatus::Actief)->exists();

        $statusErrors = [];
        if ($this->status === GarageCompanyStatus::DemoAangevraagd->value && ! $this->demo_aangevraagd_op) {
            $statusErrors[] = 'Status demo_aangevraagd vereist demo_aangevraagd_op.';
        }
        if ($this->status === GarageCompanyStatus::DemoGepland->value && (! $this->demo_aangevraagd_op || ! $this->demo_gepland_op)) {
            $statusErrors[] = 'Status demo_gepland vereist demo_aangevraagd_op en demo_gepland_op.';
        }
        if ($this->status === GarageCompanyStatus::Proefperiode->value && ! $this->proefperiode_start) {
            $statusErrors[] = 'Status proefperiode vereist proefperiode_start.';
        }
        if ($this->status === GarageCompanyStatus::Actief->value) {
            if (! $this->actief_vanaf) {
                $statusErrors[] = 'Status actief vereist actief_vanaf.';
            }
            if (! $hasActiveMandate) {
                $statusErrors[] = 'Status actief vereist een SEPA mandaat met status actief.';
            }
        }
        if ($this->status === GarageCompanyStatus::Opgezegd->value && ! $this->opgezegd_op) {
            $statusErrors[] = 'Status opgezegd vereist opgezegd_op.';
        }
        if ($this->status === GarageCompanyStatus::Verloren->value && ! $this->verloren_op) {
            $statusErrors[] = 'Status verloren vereist verloren_op.';
        }

        return view('livewire.crm.garage-companies.tabs.overview', [
            'company' => $company,
            'statuses' => GarageCompanyStatus::cases(),
            'sources' => GarageCompanySource::cases(),
            'statusErrors' => $statusErrors,
            'hasActiveMandate' => $hasActiveMandate,
        ]);
    }
}

