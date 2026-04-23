<?php

namespace App\Livewire\Crm\GarageCompanies;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\Module;
use App\Models\SepaMandate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Livewire\Component;

class Create extends Component
{
    public string $bedrijfsnaam = '';
    public string $land = 'Nederland';

    // Contact
    public string $voor_en_achternaam = '';
    public string $email = '';
    public string $telefoonnummer = '';

    // Adres
    public string $straatnaam_en_nummer = '';
    public string $postcode = '';
    public string $plaats = '';

    // SEPA (basis)
    public string $iban = '';
    public ?string $bic = null;
    public string $plaats_van_tekenen = '';
    public string $datum_van_tekenen = '';

    // CRM
    public string $status = 'lead';
    public string $bron = 'website_formulier';
    public ?string $tags = null;

    /**
     * @var array<int, array{module_id:int,naam:string,aantal:int,actief:bool,prijs_maand_excl:string,btw_percentage:string}>
     */
    public array $moduleRows = [];

    public function mount(): void
    {
        $this->datum_van_tekenen = now()->toDateString();
        $this->plaats_van_tekenen = $this->plaats_van_tekenen ?: '';
        $this->loadModuleRows();
    }

    public function updatedPlaats(string $value): void
    {
        if (! filled($this->plaats_van_tekenen)) {
            $this->plaats_van_tekenen = $value;
        }
    }

    public function save()
    {
        $data = $this->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],

            'voor_en_achternaam' => ['required', 'string', 'max:255', 'regex:/\\s+/'],
            'email' => ['required', 'email', 'max:255'],
            'telefoonnummer' => ['required', 'string', 'max:50'],

            'straatnaam_en_nummer' => ['required', 'string', 'max:255'],
            'postcode' => ['required', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],

            'iban' => ['required', 'string', 'max:34'],
            'bic' => ['nullable', 'string', 'max:11'],
            'plaats_van_tekenen' => ['required', 'string', 'max:255'],
            'datum_van_tekenen' => ['required', 'date'],

            'status' => ['required', Rule::enum(GarageCompanyStatus::class)],
            'bron' => ['required', Rule::enum(GarageCompanySource::class)],
            'tags' => ['nullable', 'string'],
        ]);

        $rules = [];
        $messages = [];
        foreach ($this->moduleRows as $i => $row) {
            $rules["moduleRows.$i.module_id"] = ['required', 'integer', 'exists:modules,id'];
            $rules["moduleRows.$i.actief"] = ['boolean'];
            $rules["moduleRows.$i.aantal"] = ['required', 'integer', 'min:0', 'max:999'];
            $rules["moduleRows.$i.prijs_maand_excl"] = ['required', 'numeric', 'min:0'];
            $rules["moduleRows.$i.btw_percentage"] = ['required', 'numeric', 'min:0', 'max:100'];
            $messages["moduleRows.$i.prijs_maand_excl.required"] = "Prijs is verplicht voor {$row['naam']}.";
        }

        $validatedModules = Validator::make(['moduleRows' => $this->moduleRows], $rules, $messages)->validate();
        $moduleRows = $validatedModules['moduleRows'] ?? [];

        foreach ($moduleRows as $row) {
            if ($row['actief'] && (int) $row['aantal'] < 1) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "moduleRows.{$this->moduleRowIndexByModuleId((int) $row['module_id'])}.aantal" => 'Actieve module vereist aantal >= 1.',
                ]);
            }
        }

        $company = DB::transaction(function () use ($data, $moduleRows) {
            [$voornaam, $achternaam] = $this->splitFullName($data['voor_en_achternaam']);

            $company = GarageCompany::create([
                'bedrijfsnaam' => $data['bedrijfsnaam'],
                'adres_straat_nummer' => $data['straatnaam_en_nummer'],
                'postcode' => $data['postcode'],
                'plaats' => $data['plaats'],
                'land' => $data['land'],
                'hoofd_email' => $data['email'],
                'hoofd_telefoon' => $data['telefoonnummer'],
                'status' => $data['status'],
                'bron' => $data['bron'],
                'tags' => $data['tags'] ?? null,
                'created_by' => auth()->id(),
            ]);

            $person = CustomerPerson::create([
                'garage_company_id' => $company->id,
                'voornaam' => $voornaam,
                'achternaam' => $achternaam,
                'email' => $data['email'],
                'telefoon' => $data['telefoonnummer'],
                'rol' => 'eigenaar',
                'is_primary' => true,
                'active' => true,
            ]);

            SepaMandate::create([
                'garage_company_id' => $company->id,
                'bedrijfsnaam' => $company->bedrijfsnaam,
                'voor_en_achternaam' => $data['voor_en_achternaam'],
                'straatnaam_en_nummer' => $company->adres_straat_nummer ?? $data['straatnaam_en_nummer'],
                'postcode' => $company->postcode ?? $data['postcode'],
                'plaats' => $company->plaats,
                'land' => $company->land,
                'iban' => $data['iban'],
                'bic' => $data['bic'] ?? null,
                'email' => $data['email'],
                'telefoonnummer' => $data['telefoonnummer'],
                'plaats_van_tekenen' => $data['plaats_van_tekenen'],
                'datum_van_tekenen' => $data['datum_van_tekenen'],
                'mandaat_id' => $this->generateMandaatId($company->id),
                'status' => 'pending',
                'ontvangen_op' => now(),
            ]);

            foreach ($moduleRows as $row) {
                $values = [
                    'garage_company_id' => $company->id,
                    'module_id' => (int) $row['module_id'],
                    'aantal' => (int) $row['aantal'],
                    'actief' => (bool) $row['actief'],
                    'prijs_maand_excl' => (float) $row['prijs_maand_excl'],
                    'btw_percentage' => (float) $row['btw_percentage'],
                    'startdatum' => null,
                    'einddatum' => null,
                ];

                if (! GarageCompanyModule::hasAantalColumn()) {
                    unset($values['aantal']);
                }

                GarageCompanyModule::create($values);
            }

            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Systeem,
                'titel' => 'Klant aangemaakt',
                'inhoud' => 'Aangemaakt door '.auth()->user()->name,
                'created_by' => auth()->id(),
            ]);

            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Mandate,
                'titel' => 'SEPA mandaat vastgelegd (pending)',
                'inhoud' => "IBAN: {$data['iban']}",
                'created_by' => auth()->id(),
            ]);

            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Module,
                'titel' => 'Modules ingesteld',
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);

            return $company;
        });

        return redirect()->route('crm.garage_companies.show', $company)
            ->with('status', 'Klant aangemaakt.');
    }

    /**
     * @return array{0:string,1:string}
     */
    private function splitFullName(string $fullName): array
    {
        $fullName = trim(preg_replace('/\s+/', ' ', $fullName) ?? $fullName);

        $parts = explode(' ', $fullName);

        if (count($parts) < 2) {
            return [$fullName, '-'];
        }

        $lastName = array_pop($parts);
        $firstName = implode(' ', $parts);

        return [$firstName, $lastName];
    }

    private function generateMandaatId(int $companyId): string
    {
        return 'KIVII-'.$companyId.'-'.Str::upper(Str::random(10));
    }

    private function loadModuleRows(): void
    {
        $fallbackByModuleId = $this->modulePricingFallbacks();
        $modules = Module::query()->orderBy('naam')->get();

        $this->moduleRows = $modules->map(function (Module $module) use ($fallbackByModuleId) {
            $resolvedDefaults = $this->resolveModulePricingDefaults($module, $fallbackByModuleId);

            return [
                'module_id' => (int) $module->id,
                'naam' => $module->naam,
                'aantal' => 1,
                'actief' => false,
                'prijs_maand_excl' => (string) $resolvedDefaults['prijs_maand_excl'],
                'btw_percentage' => (string) $resolvedDefaults['btw_percentage'],
            ];
        })->all();
    }

    /**
     * @return array<int, array{prijs_maand_excl: float, btw_percentage: float}>
     */
    private function modulePricingFallbacks(): array
    {
        return GarageCompanyModule::query()
            ->select(['module_id', 'prijs_maand_excl', 'btw_percentage'])
            ->whereIn('id', function ($query) {
                $query->from('garage_company_modules')
                    ->selectRaw('MAX(id)')
                    ->where('prijs_maand_excl', '>', 0)
                    ->groupBy('module_id');
            })
            ->get()
            ->mapWithKeys(fn (GarageCompanyModule $row) => [
                (int) $row->module_id => [
                    'prijs_maand_excl' => (float) $row->prijs_maand_excl,
                    'btw_percentage' => (float) $row->btw_percentage,
                ],
            ])
            ->all();
    }

    /**
     * @param array<int, array{prijs_maand_excl: float, btw_percentage: float}> $fallbackByModuleId
     * @return array{prijs_maand_excl: float, btw_percentage: float}
     */
    private function resolveModulePricingDefaults(Module $module, array $fallbackByModuleId): array
    {
        $fallback = $fallbackByModuleId[(int) $module->id] ?? null;

        $price = (float) ($module->default_prijs_maand_excl ?? 0);
        if ($price <= 0 && $fallback) {
            $price = (float) $fallback['prijs_maand_excl'];
        }

        $vat = (float) ($module->default_btw_percentage ?? 0);
        if ($vat <= 0 && $fallback) {
            $vat = (float) $fallback['btw_percentage'];
        }

        if ($vat <= 0) {
            $vat = 21.0;
        }

        return [
            'prijs_maand_excl' => $price,
            'btw_percentage' => $vat,
        ];
    }

    private function moduleRowIndexByModuleId(int $moduleId): int
    {
        foreach ($this->moduleRows as $i => $row) {
            if ((int) $row['module_id'] === $moduleId) {
                return $i;
            }
        }

        return 0;
    }

    public function render()
    {
        $totaalExcl = 0.0;
        $btw = 0.0;
        $actieveModules = 0;
        foreach ($this->moduleRows as $row) {
            if (! $row['actief']) {
                continue;
            }
            $prijs = (float) $row['prijs_maand_excl'];
            $aantal = max(1, (int) ($row['aantal'] ?? 1));
            $totaalExcl += $prijs * $aantal;
            $btw += ($prijs * $aantal) * ((float) $row['btw_percentage'] / 100);
            $actieveModules++;
        }

        return view('livewire.crm.garage-companies.create', [
            'statuses' => GarageCompanyStatus::cases(),
            'sources' => GarageCompanySource::cases(),
            'actieveModules' => $actieveModules,
            'totaalModules' => count($this->moduleRows),
            'totaalExcl' => $totaalExcl,
            'btw' => $btw,
            'totaalIncl' => $totaalExcl + $btw,
        ])->layout('layouts.crm', ['title' => 'Nieuwe klant']);
    }
}
