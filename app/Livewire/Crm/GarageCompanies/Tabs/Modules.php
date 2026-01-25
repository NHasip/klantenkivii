<?php

namespace App\Livewire\Crm\GarageCompanies\Tabs;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Livewire\Component;

class Modules extends Component
{
    public int $garageCompanyId;

    /**
     * @var array<int, array{assignment_id:int,module_id:int,naam:string,aantal:int,actief:bool,prijs_maand_excl:string,btw_percentage:string}>
     */
    public array $rows = [];

    public function mount(int $garageCompanyId): void
    {
        $this->garageCompanyId = $garageCompanyId;
        $this->ensureAssignmentsExist();
        $this->loadRows();
    }

    public function toggle(int $moduleId): void
    {
        foreach ($this->rows as &$row) {
            if ($row['module_id'] === $moduleId) {
                $row['actief'] = ! $row['actief'];
                break;
            }
        }
    }

    public function save(): void
    {
        $rules = [];
        $messages = [];

        foreach ($this->rows as $i => $row) {
            $rules["rows.$i.module_id"] = ['required', 'integer', 'exists:modules,id'];
            $rules["rows.$i.aantal"] = ['required', 'integer', 'min:0', 'max:999'];
            $rules["rows.$i.prijs_maand_excl"] = ['required', 'numeric', 'min:0'];
            $rules["rows.$i.btw_percentage"] = ['required', 'numeric', 'min:0', 'max:100'];
            $rules["rows.$i.actief"] = ['boolean'];

            $messages["rows.$i.prijs_maand_excl.required"] = "Prijs is verplicht voor {$row['naam']}.";
        }

        $validated = Validator::make(['rows' => $this->rows], $rules, $messages)->validate();

        foreach ($validated['rows'] as $row) {
            if ($row['actief'] && (int) $row['aantal'] < 1) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "rows.{$this->rowIndexByModuleId((int) $row['module_id'])}.aantal" => "Actieve module vereist aantal ≥ 1.",
                ]);
            }
            if ($row['actief'] && (float) $row['prijs_maand_excl'] <= 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "rows.{$this->rowIndexByModuleId((int) $row['module_id'])}.prijs_maand_excl" => "Actieve module vereist prijs > 0.",
                ]);
            }
        }

        DB::transaction(function () use ($validated) {
            foreach ($validated['rows'] as $row) {
                $updates = [
                    'actief' => (bool) $row['actief'],
                    'prijs_maand_excl' => $row['prijs_maand_excl'],
                    'btw_percentage' => $row['btw_percentage'],
                ];

                if (GarageCompanyModule::hasAantalColumn()) {
                    $updates['aantal'] = (int) $row['aantal'];
                }

                GarageCompanyModule::query()
                    ->where('garage_company_id', $this->garageCompanyId)
                    ->where('module_id', $row['module_id'])
                    ->update($updates);
            }
        });

        Activity::create([
            'garage_company_id' => $this->garageCompanyId,
            'type' => ActivityType::Module,
            'titel' => 'Modules/prijzen bijgewerkt',
            'inhoud' => null,
            'created_by' => auth()->id(),
        ]);

        $this->loadRows();
        session()->flash('status', 'Modules opgeslagen.');
    }

    private function ensureAssignmentsExist(): void
    {
        $moduleIds = Module::query()->pluck('id')->all();
        foreach ($moduleIds as $moduleId) {
            GarageCompanyModule::firstOrCreate(
                [
                    'garage_company_id' => $this->garageCompanyId,
                    'module_id' => $moduleId,
                ],
                [
                    'aantal' => 1,
                    'actief' => false,
                    'prijs_maand_excl' => 0,
                    'btw_percentage' => 21.00,
                ],
            );
        }
    }

    private function loadRows(): void
    {
        $rows = GarageCompanyModule::query()
            ->where('garage_company_id', $this->garageCompanyId)
            ->with('module')
            ->get()
            ->sortBy(fn ($r) => $r->module->naam)
            ->values();

        $this->rows = $rows->map(fn ($r) => [
            'assignment_id' => $r->id,
            'module_id' => $r->module_id,
            'naam' => $r->module->naam,
            'aantal' => GarageCompanyModule::hasAantalColumn() ? (int) ($r->aantal ?? 1) : 1,
            'actief' => (bool) $r->actief,
            'prijs_maand_excl' => (string) $r->prijs_maand_excl,
            'btw_percentage' => (string) $r->btw_percentage,
        ])->all();
    }

    private function rowIndexByModuleId(int $moduleId): int
    {
        foreach ($this->rows as $i => $row) {
            if ((int) $row['module_id'] === $moduleId) {
                return $i;
            }
        }

        return 0;
    }

    public function render()
    {
        $company = GarageCompany::findOrFail($this->garageCompanyId);

        $totaalExcl = 0.0;
        $btw = 0.0;
        $actieveModules = 0;

        foreach ($this->rows as $row) {
            if (! $row['actief']) {
                continue;
            }
            $prijs = (float) $row['prijs_maand_excl'];
            $aantal = max(1, (int) ($row['aantal'] ?? 1));
            $totaalExcl += $prijs * $aantal;
            $btw += ($prijs * $aantal) * ((float) $row['btw_percentage'] / 100);
            $actieveModules++;
        }

        return view('livewire.crm.garage-companies.tabs.modules', [
            'company' => $company,
            'actieveModules' => $actieveModules,
            'totaalModules' => count($this->rows),
            'totaalExcl' => $totaalExcl,
            'btw' => $btw,
            'totaalIncl' => $totaalExcl + $btw,
        ]);
    }
}
