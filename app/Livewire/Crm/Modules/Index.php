<?php

namespace App\Livewire\Crm\Modules;

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
        session()->flash('status', 'Module opgeslagen.');
    }

    public function deleteModule(int $id): void
    {
        try {
            Module::findOrFail($id)->delete();
            session()->flash('status', 'Module verwijderd.');
        } catch (Throwable $e) {
            report($e);
            session()->flash('status', 'Verwijderen mislukt. Deze module wordt mogelijk nog gebruikt.');
        }
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

        return view('livewire.crm.modules.index', [
            'modules' => $modules,
        ])->layout('layouts.crm', ['title' => 'Modules']);
    }
}
