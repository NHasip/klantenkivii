<?php

namespace App\Livewire\Crm\Reports;

use Livewire\Component;

class Index extends Component
{
    public function render()
    {
        return view('livewire.crm.reports.index')
            ->layout('layouts.crm', ['title' => 'Rapportages']);
    }
}

