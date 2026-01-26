<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\GarageCompany;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Persons extends Component
{
    public int $garageCompanyId;

    public bool $showForm = false;

    public ?int $personId = null;

    public string $voornaam = '';
    public string $achternaam = '';
    public ?string $rol = null;
    public string $email = '';
    public ?string $telefoon = null;
    public bool $is_primary = false;
    public bool $active = true;

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
    }

    public function startCreate(): void
    {
        $this->resetForm();
        $this->personId = null;
        $this->showForm = true;
    }

    public function startEdit(int $id): void
    {
        $person = CustomerPerson::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($id);

        $this->personId = $person->id;
        $this->voornaam = $person->voornaam;
        $this->achternaam = $person->achternaam;
        $this->rol = $person->rol;
        $this->email = $person->email;
        $this->telefoon = $person->telefoon;
        $this->is_primary = (bool) $person->is_primary;
        $this->active = (bool) $person->active;
        $this->showForm = true;
    }

    public function cancel(): void
    {
        $this->resetForm();
        $this->personId = null;
        $this->showForm = false;
    }

    public function save(): void
    {
        $data = $this->validate([
            'voornaam' => ['required', 'string', 'max:255'],
            'achternaam' => ['required', 'string', 'max:255'],
            'rol' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('customer_persons', 'email')
                    ->where('garage_company_id', $this->garageCompanyId)
                    ->ignore($this->personId),
            ],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $person = CustomerPerson::updateOrCreate(
            ['id' => $this->personId],
            [
                ...$data,
                'garage_company_id' => $company->id,
            ],
        );

        if ($data['is_primary']) {
            CustomerPerson::query()
                ->where('garage_company_id', $company->id)
                ->whereKeyNot($person->id)
                ->update(['is_primary' => false]);
        }

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Contactpersoon bijgewerkt',
            'inhoud' => "{$person->voornaam} {$person->achternaam} ({$person->email})",
            'created_by' => auth()->id(),
        ]);

        $this->resetForm();
        $this->personId = null;
        $this->showForm = false;
        session()->flash('status', 'Contactpersoon opgeslagen.');
    }

    public function delete(int $id): void
    {
        $person = CustomerPerson::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($id);

        $person->delete();
        session()->flash('status', 'Contactpersoon verwijderd.');
    }

    private function resetForm(): void
    {
        $this->voornaam = '';
        $this->achternaam = '';
        $this->rol = null;
        $this->email = '';
        $this->telefoon = null;
        $this->is_primary = false;
        $this->active = true;
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);
        $persons = CustomerPerson::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->orderByDesc('is_primary')
            ->orderBy('achternaam')
            ->get();

        return view('livewire.crm.garage-companies.tabs.persons', [
            'company' => $company,
            'persons' => $persons,
        ]);
    }
}
