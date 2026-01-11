<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\GarageCompany;
use Livewire\Component;
use Livewire\WithPagination;

class Timeline extends Component
{
    use WithPagination;

    public int $garageCompanyId;

    public string $titel = 'Notitie';
    public string $inhoud = '';

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
    }

    public function addNote(): void
    {
        $data = $this->validate([
            'titel' => ['required', 'string', 'max:255'],
            'inhoud' => ['required', 'string', 'min:2'],
        ]);

        Activity::create([
            'garage_company_id' => $this->garageCompanyId,
            'type' => ActivityType::Notitie,
            'titel' => $data['titel'],
            'inhoud' => $data['inhoud'],
            'created_by' => auth()->id(),
        ]);

        $this->titel = 'Notitie';
        $this->inhoud = '';
        $this->resetPage();
        session()->flash('status', 'Notitie toegevoegd.');
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $activities = Activity::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->with('creator')
            ->latest()
            ->paginate(15);

        return view('livewire.crm.garage-companies.tabs.timeline', [
            'company' => $company,
            'activities' => $activities,
        ]);
    }
}

