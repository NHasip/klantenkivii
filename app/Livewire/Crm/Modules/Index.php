<?php

namespace App\Livewire\Crm\Modules;

use App\Models\Module;
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
        $this->default_prijs_maand_excl = (string) ($module->default_prijs_maand_excl ?? '0');
        $this->default_btw_percentage = (string) ($module->default_btw_percentage ?? '21');
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
        $data = $this->validate([
            'naam' => ['required', 'string', 'max:255', Rule::unique('modules', 'naam')->ignore($this->moduleId)],
            'omschrijving' => ['nullable', 'string'],
            'default_visible' => ['boolean'],
            'default_prijs_maand_excl' => ['required', 'numeric', 'min:0'],
            'default_btw_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        Module::updateOrCreate(
            ['id' => $this->moduleId],
            [
                ...$data,
                'default_prijs_maand_excl' => (float) $data['default_prijs_maand_excl'],
                'default_btw_percentage' => (float) $data['default_btw_percentage'],
            ],
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
