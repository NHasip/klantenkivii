<?php

namespace App\Livewire\Crm\GarageCompanies;

use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Models\GarageCompany;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

class Index extends Component
{
    use WithPagination;

    #[Url(history: true)]
    public string $search = '';

    #[Url(history: true)]
    public string $status = 'alle';

    #[Url(history: true)]
    public string $bron = 'alle';

    #[Url(history: true)]
    public string $tag = '';

    #[Url(history: true)]
    public string $sort = 'updated_desc'; // updated_desc|actief_vanaf_desc|omzet_desc

    public int $perPage = 15;

    public function updatingSearch(): void
    {
        $this->resetPage();
    }

    public function updatingStatus(): void
    {
        $this->resetPage();
    }

    public function updatingBron(): void
    {
        $this->resetPage();
    }

    public function updatingTag(): void
    {
        $this->resetPage();
    }

    public function render()
    {
        $query = GarageCompany::query()
            ->withCount(['customerPersons as klantpersonen_aantal'])
            ->withCount(['seats as actieve_seats' => fn ($q) => $q->where('actief', true)])
            ->withSum(['modules as omzet_excl' => fn ($q) => $q->where('actief', true)], 'prijs_maand_excl');

        if ($this->status !== 'alle') {
            $query->where('status', $this->status);
        }

        if ($this->bron !== 'alle') {
            $query->where('bron', $this->bron);
        }

        if (filled($this->tag)) {
            $query->where('tags', 'like', '%'.$this->tag.'%');
        }

        if (filled($this->search)) {
            $search = trim($this->search);
            $query->where(function ($q) use ($search) {
                $q->where('bedrijfsnaam', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_email', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_telefoon', 'like', '%'.$search.'%')
                    ->orWhere('status', 'like', '%'.$search.'%')
                    ->orWhereHas('customerPersons', fn ($p) => $p->where('email', 'like', '%'.$search.'%'))
                    ->orWhereHas('mandates', fn ($m) => $m->where('iban', 'like', '%'.$search.'%'));
            });
        }

        $query->when($this->sort === 'actief_vanaf_desc', fn ($q) => $q->orderByDesc('actief_vanaf'))
            ->when($this->sort === 'omzet_desc', fn ($q) => $q->orderByDesc('omzet_excl'))
            ->when($this->sort === 'updated_desc', fn ($q) => $q->orderByDesc('updated_at'));

        return view('livewire.crm.garage-companies.index', [
            'companies' => $query->paginate($this->perPage),
            'statuses' => GarageCompanyStatus::cases(),
            'sources' => GarageCompanySource::cases(),
        ])->layout('layouts.crm', ['title' => 'Klanten']);
    }
}
