<?php

namespace App\Livewire\Crm\Modules;

use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Livewire\Component;
use Throwable;

class Index extends Component
{
    public ?int $moduleId = null;

    public bool $showForm = false;

    public string $naam = '';
    public ?string $omschrijving = null;
    public bool $default_visible = true;
    public string $default_prijs_maand_excl = '0';
    public string $default_btw_percentage = '21';
    public bool $supportsDefaultPricing = false;

    public function mount(): void
    {
        $this->supportsDefaultPricing = Schema::hasColumn('modules', 'default_prijs_maand_excl')
            && Schema::hasColumn('modules', 'default_btw_percentage');
    }

    public function startCreate(): void
    {
        $this->resetForm();
        $this->moduleId = null;
        $this->showForm = true;
    }

    public function startEdit(int $id): void
    {
        $module = Module::findOrFail($id);
        $this->moduleId = $module->id;
        $this->naam = $module->naam;
        $this->omschrijving = $module->omschrijving;
        $this->default_visible = (bool) $module->default_visible;
        $this->default_prijs_maand_excl = $this->supportsDefaultPricing
            ? (string) ($module->default_prijs_maand_excl ?? '0')
            : '0';
        $this->default_btw_percentage = $this->supportsDefaultPricing
            ? (string) ($module->default_btw_percentage ?? '21')
            : '21';
        $this->showForm = true;
    }

    public function cancel(): void
    {
        $this->resetForm();
        $this->moduleId = null;
        $this->showForm = false;
    }

    public function save(): void
    {
        $rules = [
            'naam' => ['required', 'string', 'max:255', Rule::unique('modules', 'naam')->ignore($this->moduleId)],
            'omschrijving' => ['nullable', 'string'],
            'default_visible' => ['boolean'],
        ];

        if ($this->supportsDefaultPricing) {
            $rules['default_prijs_maand_excl'] = ['required', 'numeric', 'min:0'];
            $rules['default_btw_percentage'] = ['required', 'numeric', 'min:0', 'max:100'];
        }

        $data = $this->validate($rules);

        $payload = $data;
        if ($this->supportsDefaultPricing) {
            $payload['default_prijs_maand_excl'] = (float) $data['default_prijs_maand_excl'];
            $payload['default_btw_percentage'] = (float) $data['default_btw_percentage'];
        } else {
            unset($payload['default_prijs_maand_excl'], $payload['default_btw_percentage']);
        }

        Module::updateOrCreate(
            ['id' => $this->moduleId],
            $payload,
        );

        $this->resetForm();
        $this->moduleId = null;
        $this->showForm = false;
        session()->now('livewire_status', 'Module opgeslagen.');
    }

    public function deleteModule(int $id): void
    {
        $module = Module::findOrFail($id);

        if ($this->usageCount($module->id) > 0) {
            session()->now('livewire_error', 'Deze module is in gebruik bij klanten. Archiveer de module in plaats van verwijderen.');

            return;
        }

        try {
            $module->delete();
            session()->now('livewire_status', 'Module verwijderd.');
        } catch (Throwable $e) {
            report($e);
            session()->now('livewire_error', 'Verwijderen mislukt. Deze module wordt mogelijk nog gebruikt.');
        }
    }

    public function archiveModule(int $id): void
    {
        if (! Module::hasArchivedColumn()) {
            session()->now('livewire_error', 'Archiveren is nog niet beschikbaar. Draai eerst de nieuwste migraties.');

            return;
        }

        Module::findOrFail($id)->update(['archived_at' => now()]);
        session()->now('livewire_status', 'Module gearchiveerd. Bestaande klantkoppelingen blijven ongewijzigd.');
    }

    public function restoreModule(int $id): void
    {
        if (! Module::hasArchivedColumn()) {
            return;
        }

        Module::findOrFail($id)->update(['archived_at' => null]);
        session()->now('livewire_status', 'Module hersteld.');
    }

    /**
     * Aantal klanten (niet in prullenbak) met een actieve koppeling aan deze module.
     */
    private function usageCount(int $moduleId): int
    {
        return (int) GarageCompanyModule::query()
            ->where('module_id', $moduleId)
            ->where('actief', true)
            ->whereIn('garage_company_id', GarageCompany::query()->select('garage_companies.id'))
            ->distinct()
            ->count('garage_company_id');
    }

    private function resetForm(): void
    {
        $this->naam = '';
        $this->omschrijving = null;
        $this->default_visible = true;
        $this->default_prijs_maand_excl = '0';
        $this->default_btw_percentage = '21';
    }

    public function render()
    {
        $modules = Module::query()->orderBy('naam')->get();

        $usage = GarageCompanyModule::query()
            ->where('actief', true)
            ->whereIn('garage_company_id', GarageCompany::query()->select('garage_companies.id'))
            ->selectRaw('module_id, COUNT(DISTINCT garage_company_id) as total')
            ->groupBy('module_id')
            ->pluck('total', 'module_id');

        return view('livewire.crm.modules.index', [
            'modules' => $modules,
            'usage' => $usage,
            'supportsArchive' => Module::hasArchivedColumn(),
        ])->layout('layouts.crm', ['title' => 'Modules']);
    }
}
