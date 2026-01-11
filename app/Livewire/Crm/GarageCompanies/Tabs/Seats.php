<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\KiviiSeat;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Seats extends Component
{
    public int $garageCompanyId;

    public ?int $seatId = null;

    public string $naam = '';
    public string $email = '';
    public ?string $rol_in_kivii = null;
    public bool $actief = true;
    public ?string $aangemaakt_op = null;

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
    }

    public function startCreate(): void
    {
        $this->resetForm();
        $this->seatId = null;
    }

    public function startEdit(int $id): void
    {
        $seat = KiviiSeat::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($id);

        $this->seatId = $seat->id;
        $this->naam = $seat->naam;
        $this->email = $seat->email;
        $this->rol_in_kivii = $seat->rol_in_kivii;
        $this->actief = (bool) $seat->actief;
        $this->aangemaakt_op = optional($seat->aangemaakt_op)->toDateString();
    }

    public function save(): void
    {
        $data = $this->validate([
            'naam' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'rol_in_kivii' => ['nullable', 'string', 'max:255'],
            'actief' => ['boolean'],
            'aangemaakt_op' => ['nullable', 'date'],
        ]);

        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $seat = KiviiSeat::updateOrCreate(
            ['id' => $this->seatId],
            [
                ...$data,
                'garage_company_id' => $company->id,
            ],
        );

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Seat bijgewerkt',
            'inhoud' => "{$seat->naam} ({$seat->email})",
            'created_by' => auth()->id(),
        ]);

        $this->resetForm();
        $this->seatId = null;
        session()->flash('status', 'Seat opgeslagen.');
    }

    public function delete(int $id): void
    {
        $seat = KiviiSeat::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->findOrFail($id);
        $seat->delete();
        session()->flash('status', 'Seat verwijderd.');
    }

    private function resetForm(): void
    {
        $this->naam = '';
        $this->email = '';
        $this->rol_in_kivii = null;
        $this->actief = true;
        $this->aangemaakt_op = null;
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);
        $seats = KiviiSeat::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->orderByDesc('actief')
            ->orderBy('naam')
            ->get();

        $actieveSeats = $seats->where('actief', true)->count();

        return view('livewire.crm.garage-companies.tabs.seats', [
            'company' => $company,
            'seats' => $seats,
            'actieveSeats' => $actieveSeats,
        ]);
    }
}

