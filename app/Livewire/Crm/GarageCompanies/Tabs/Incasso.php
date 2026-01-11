<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\SepaMandate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Incasso extends Component
{
    public int $garageCompanyId;

    public bool $creating = false;

    public ?int $mandateId = null;
    public string $bedrijfsnaam = '';
    public string $voor_en_achternaam = '';
    public string $straatnaam_en_nummer = '';
    public string $postcode = '';
    public string $plaats = '';
    public string $land = 'Nederland';
    public string $iban = '';
    public ?string $bic = null;
    public string $email = '';
    public string $telefoonnummer = '';
    public string $plaats_van_tekenen = '';
    public string $datum_van_tekenen = '';
    public ?string $ondertekenaar_naam = null;
    public bool $akkoord_checkbox = false;
    public ?string $akkoord_op = null;
    public string $status = 'pending';
    public ?string $ontvangen_op = null;

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
    }

    public function startNew(): void
    {
        $company = GarageCompany::with('primaryPerson')->findOrFail($this->garageCompanyId);

        $this->creating = true;
        $this->mandateId = null;
        $this->bedrijfsnaam = $company->bedrijfsnaam;
        $this->voor_en_achternaam = trim(($company->primaryPerson?->voornaam ?? '').' '.($company->primaryPerson?->achternaam ?? '')) ?: $company->bedrijfsnaam;
        $this->straatnaam_en_nummer = $company->adres_straat_nummer ?? '';
        $this->postcode = $company->postcode ?? '';
        $this->plaats = $company->plaats;
        $this->land = $company->land;
        $this->iban = '';
        $this->bic = null;
        $this->email = $company->hoofd_email;
        $this->telefoonnummer = $company->hoofd_telefoon;
        $this->plaats_van_tekenen = $company->plaats;
        $this->datum_van_tekenen = now()->toDateString();
        $this->ondertekenaar_naam = null;
        $this->akkoord_checkbox = false;
        $this->akkoord_op = null;
        $this->status = SepaMandateStatus::Pending->value;
        $this->ontvangen_op = now()->format('Y-m-d\TH:i');
    }

    public function cancel(): void
    {
        $this->creating = false;
    }

    public function save(): void
    {
        $data = $this->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'voor_en_achternaam' => ['required', 'string', 'max:255'],
            'straatnaam_en_nummer' => ['required', 'string', 'max:255'],
            'postcode' => ['required', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],
            'iban' => ['required', 'string', 'max:34'],
            'bic' => ['nullable', 'string', 'max:11'],
            'email' => ['required', 'email', 'max:255'],
            'telefoonnummer' => ['required', 'string', 'max:50'],
            'plaats_van_tekenen' => ['required', 'string', 'max:255'],
            'datum_van_tekenen' => ['required', 'date'],
            'ondertekenaar_naam' => ['nullable', 'string', 'max:255'],
            'akkoord_checkbox' => ['boolean'],
            'akkoord_op' => ['nullable', 'date'],
            'status' => ['required', Rule::enum(SepaMandateStatus::class)],
            'ontvangen_op' => ['nullable', 'date'],
        ]);

        $company = GarageCompany::findOrFail($this->garageCompanyId);

        if ($data['status'] === SepaMandateStatus::Actief->value) {
            SepaMandate::query()
                ->where('garage_company_id', $company->id)
                ->where('status', SepaMandateStatus::Actief)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);
        }

        $mandate = SepaMandate::updateOrCreate(
            ['id' => $this->mandateId],
            [
                ...$data,
                'garage_company_id' => $company->id,
                'mandaat_id' => $this->mandateId ? SepaMandate::findOrFail($this->mandateId)->mandaat_id : $this->generateMandaatId($company->id),
            ],
        );

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Mandate,
            'titel' => 'SEPA mandaat opgeslagen',
            'inhoud' => "Mandaat {$mandate->mandaat_id} ({$mandate->status->value})",
            'created_by' => auth()->id(),
        ]);

        $this->creating = false;
        session()->flash('status', 'Mandaat opgeslagen.');
    }

    public function setStatus(int $mandateId, string $status): void
    {
        $mandate = SepaMandate::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($mandateId);

        $to = SepaMandateStatus::from($status);

        if ($to === SepaMandateStatus::Actief) {
            SepaMandate::query()
                ->where('garage_company_id', $this->garageCompanyId)
                ->where('status', SepaMandateStatus::Actief)
                ->whereKeyNot($mandate->id)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);
        }

        $mandate->status = $to;
        $mandate->save();

        Activity::create([
            'garage_company_id' => $this->garageCompanyId,
            'type' => ActivityType::Mandate,
            'titel' => 'Mandaat status gewijzigd',
            'inhoud' => "Mandaat {$mandate->mandaat_id} → {$to->value}",
            'created_by' => auth()->id(),
        ]);

        session()->flash('status', 'Mandaat status bijgewerkt.');
    }

    public function edit(int $mandateId): void
    {
        $mandate = SepaMandate::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($mandateId);

        $this->creating = true;
        $this->mandateId = $mandate->id;
        $this->bedrijfsnaam = $mandate->bedrijfsnaam;
        $this->voor_en_achternaam = $mandate->voor_en_achternaam;
        $this->straatnaam_en_nummer = $mandate->straatnaam_en_nummer;
        $this->postcode = $mandate->postcode;
        $this->plaats = $mandate->plaats;
        $this->land = $mandate->land;
        $this->iban = $mandate->iban;
        $this->bic = $mandate->bic;
        $this->email = $mandate->email;
        $this->telefoonnummer = $mandate->telefoonnummer;
        $this->plaats_van_tekenen = $mandate->plaats_van_tekenen;
        $this->datum_van_tekenen = $mandate->datum_van_tekenen->toDateString();
        $this->ondertekenaar_naam = $mandate->ondertekenaar_naam;
        $this->akkoord_checkbox = (bool) $mandate->akkoord_checkbox;
        $this->akkoord_op = optional($mandate->akkoord_op)->format('Y-m-d\TH:i');
        $this->status = $mandate->status->value;
        $this->ontvangen_op = optional($mandate->ontvangen_op)->format('Y-m-d\TH:i');
    }

    private function generateMandaatId(int $companyId): string
    {
        return 'KIVII-'.$companyId.'-'.Str::upper(Str::random(10));
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);
        $mandates = SepaMandate::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->orderByDesc('created_at')
            ->get();

        return view('livewire.crm.garage-companies.tabs.incasso', [
            'company' => $company,
            'mandates' => $mandates,
            'statuses' => SepaMandateStatus::cases(),
        ]);
    }
}

