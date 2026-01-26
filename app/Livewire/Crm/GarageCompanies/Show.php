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

        if ($this->tab === 'seats') {
            $this->redirect(
                route('crm.garage_companies.show', ['garageCompany' => $garageCompany->id, 'tab' => 'gebruikers']),
                navigate: true,
            );
        }
    }

    public function render()
    {
        return view('livewire.crm.garage-companies.show', [
            'tabs' => [
                'overzicht' => 'Overzicht',
                'klantpersonen' => 'Contactpersonen',
                'demo_status' => 'Demo & status',
                'incasso' => 'Incasso',
                'modules' => 'Modules & prijzen',
                'gebruikers' => 'Gebruikers',
                'timeline' => 'Notities & timeline',
                'taken_afspraken' => 'Taken & afspraken',
            ],
        ])->layout('layouts.crm', ['title' => $this->garageCompany->bedrijfsnaam]);
    }
}
