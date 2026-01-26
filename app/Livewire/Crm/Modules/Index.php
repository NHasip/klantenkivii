<?php

namespace App\Livewire\Crm\Modules;

use App\Models\Module;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Index extends Component
{
    public ?int $moduleId = null;

    public bool $showForm = false;

    public string $naam = '';
    public ?string $omschrijving = null;
    public bool $default_visible = true;

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
        ]);

        Module::updateOrCreate(
            ['id' => $this->moduleId],
            $data,
        );

        $this->resetForm();
        $this->moduleId = null;
        $this->showForm = false;
        session()->flash('status', 'Module opgeslagen.');
    }

    public function delete(int $id): void
    {
        Module::findOrFail($id)->delete();
        session()->flash('status', 'Module verwijderd.');
    }

    private function resetForm(): void
    {
        $this->naam = '';
        $this->omschrijving = null;
        $this->default_visible = true;
    }

    public function render()
    {
        $modules = Module::query()->orderBy('naam')->get();

        return view('livewire.crm.modules.index', [
            'modules' => $modules,
        ])->layout('layouts.crm', ['title' => 'Modules']);
    }
}
