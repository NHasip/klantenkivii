<?php

namespace App\Livewire\Crm\GarageCompanies;

use App\Models\GarageCompany;
use Livewire\Attributes\Url;
use Livewire\Component;

class Show extends Component
{
    public GarageCompany $garageCompany;

    #[Url(history: true)]
    public string $tab = 'overzicht';

    public function mount(GarageCompany $garageCompany): void
    {
        $this->garageCompany = $garageCompany;
    }

    public function render()
    {
        return view('livewire.crm.garage-companies.show', [
            'tabs' => [
                'overzicht' => 'Overzicht',
                'klantpersonen' => 'Klantpersonen',
                'demo_status' => 'Demo & status',
                'incasso' => 'Incasso',
                'modules' => 'Modules & prijzen',
                'seats' => 'Seats',
                'timeline' => 'Notities & timeline',
                'taken_afspraken' => 'Taken & afspraken',
            ],
        ])->layout('layouts.crm', ['title' => $this->garageCompany->bedrijfsnaam]);
    }
}

