<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\KiviiSeat;
use App\Models\Module;
use App\Models\Reminder;
use App\Models\SepaMandate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GarageCompaniesController
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => (string) $request->query('search', ''),
            'status' => (string) $request->query('status', 'alle'),
            'tag' => (string) $request->query('tag', ''),
            'sort' => (string) $request->query('sort', 'updated_desc'),
        ];

        $perPage = (int) $request->query('perPage', 15);

        $query = GarageCompany::query()
            ->withCount(['customerPersons as klantpersonen_aantal'])
            ->withCount(['seats as actieve_seats' => fn ($q) => $q->where('actief', true)])
            ->withSum(['modules as omzet_excl' => fn ($q) => $q->where('actief', true)], 'prijs_maand_excl');

        if ($filters['status'] !== 'alle') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['tag'])) {
            $query->where('tags', 'like', '%'.$filters['tag'].'%');
        }

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('bedrijfsnaam', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_email', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_telefoon', 'like', '%'.$search.'%')
                    ->orWhere('status', 'like', '%'.$search.'%')
                    ->orWhereHas('customerPersons', fn ($p) => $p->where('email', 'like', '%'.$search.'%'))
                    ->orWhereHas('mandates', fn ($m) => $m->where('iban', 'like', '%'.$search.'%'));
            });
        }

        $query->when($filters['sort'] === 'actief_vanaf_desc', fn ($q) => $q->orderByDesc('actief_vanaf'))
            ->when($filters['sort'] === 'omzet_desc', fn ($q) => $q->orderByDesc('omzet_excl'))
            ->when($filters['sort'] === 'updated_desc', fn ($q) => $q->orderByDesc('updated_at'));

        $companies = $query->paginate($perPage)->withQueryString();

        $companies->through(fn (GarageCompany $company) => [
            'id' => $company->id,
            'bedrijfsnaam' => $company->bedrijfsnaam,
            'status' => $company->status?->value,
            'hoofd_email' => $company->hoofd_email,
            'hoofd_telefoon' => $company->hoofd_telefoon,
            'plaats' => $company->plaats,
            'updated_at' => $company->updated_at?->toIso8601String(),
            'actieve_seats' => (int) ($company->actieve_seats ?? 0),
            'omzet_excl' => (float) ($company->omzet_excl ?? 0),
            'show_url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
        ]);

        return Inertia::render('Crm/GarageCompanies/Index', [
            'companies' => $companies,
            'filters' => $filters,
            'statusOptions' => collect(GarageCompanyStatus::cases())->map(fn ($s) => $s->value)->values(),
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'create' => route('crm.garage_companies.create'),
                'old_index' => route('crm.garage_companies.old'),
            ],
        ]);
    }

    public function create(): Response
    {
        $moduleRows = $this->defaultModuleRows();

        return Inertia::render('Crm/GarageCompanies/Create', [
            'statusOptions' => collect(GarageCompanyStatus::cases())->map(fn ($s) => $s->value)->values(),
            'sourceOptions' => collect(GarageCompanySource::cases())->map(fn ($s) => $s->value)->values(),
            'moduleRows' => $moduleRows,
            'defaults' => [
                'land' => 'Nederland',
                'datum_van_tekenen' => now()->toDateString(),
            ],
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'store' => route('crm.garage_companies.store'),
                'old_create' => route('crm.garage_companies.old.create'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
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

        $moduleRows = $request->input('moduleRows', []);
        $rules = [];
        $messages = [];
        foreach ($moduleRows as $i => $row) {
            $rules["moduleRows.$i.module_id"] = ['required', 'integer', 'exists:modules,id'];
            $rules["moduleRows.$i.actief"] = ['boolean'];
            $rules["moduleRows.$i.aantal"] = ['required', 'integer', 'min:0', 'max:999'];
            $rules["moduleRows.$i.prijs_maand_excl"] = ['required', 'numeric', 'min:0'];
            $rules["moduleRows.$i.btw_percentage"] = ['required', 'numeric', 'min:0', 'max:100'];
            $messages["moduleRows.$i.prijs_maand_excl.required"] = "Prijs is verplicht voor {$row['naam']}.";
        }

        $validatedModules = Validator::make(['moduleRows' => $moduleRows], $rules, $messages)->validate();
        $moduleRows = $validatedModules['moduleRows'] ?? [];

        foreach ($moduleRows as $row) {
            if ($row['actief'] && (int) $row['aantal'] < 1) {
                return back()
                    ->withErrors(["moduleRows.{$this->moduleRowIndexByModuleId($moduleRows, (int) $row['module_id'])}.aantal" => 'Actieve module vereist aantal >= 1.'])
                    ->withInput();
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

            CustomerPerson::create([
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
                'status' => SepaMandateStatus::Pending->value,
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

        return redirect()
            ->route('crm.garage_companies.show', ['garageCompany' => $company->id])
            ->with('status', 'Klant aangemaakt.');
    }

    public function show(Request $request, GarageCompany $garageCompany): Response
    {
        $tab = (string) $request->query('tab', 'overzicht');
        if ($tab == 'seats') {
            return redirect()->route('crm.garage_companies.show', [
                'garageCompany' => $garageCompany->id,
                'tab' => 'gebruikers',
            ]);
        }

        $garageCompany->load(['primaryPerson', 'mandates', 'modules.module', 'seats']);

        $this->ensureAssignmentsExist($garageCompany->id);

        $moduleRows = $this->moduleRows($garageCompany->id);
        $moduleTotals = $this->moduleTotals($moduleRows);

        $persons = CustomerPerson::query()
            ->where('garage_company_id', $garageCompany->id)
            ->orderByDesc('is_primary')
            ->orderBy('achternaam')
            ->get()
            ->map(fn (CustomerPerson $person) => [
                'id' => $person->id,
                'voornaam' => $person->voornaam,
                'achternaam' => $person->achternaam,
                'rol' => $person->rol,
                'email' => $person->email,
                'telefoon' => $person->telefoon,
                'is_primary' => (bool) $person->is_primary,
                'active' => (bool) $person->active,
            ]);

        $seats = KiviiSeat::query()
            ->where('garage_company_id', $garageCompany->id)
            ->orderByDesc('actief')
            ->orderBy('naam')
            ->get()
            ->map(fn (KiviiSeat $seat) => [
                'id' => $seat->id,
                'naam' => $seat->naam,
                'email' => $seat->email,
                'rol_in_kivii' => $seat->rol_in_kivii,
                'actief' => (bool) $seat->actief,
                'aangemaakt_op' => optional($seat->aangemaakt_op)->toDateString(),
            ]);

        $mandates = SepaMandate::query()
            ->where('garage_company_id', $garageCompany->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SepaMandate $mandate) => [
                'id' => $mandate->id,
                'mandaat_id' => $mandate->mandaat_id,
                'bedrijfsnaam' => $mandate->bedrijfsnaam,
                'voor_en_achternaam' => $mandate->voor_en_achternaam,
                'straatnaam_en_nummer' => $mandate->straatnaam_en_nummer,
                'postcode' => $mandate->postcode,
                'plaats' => $mandate->plaats,
                'land' => $mandate->land,
                'iban' => $mandate->iban,
                'bic' => $mandate->bic,
                'email' => $mandate->email,
                'telefoonnummer' => $mandate->telefoonnummer,
                'plaats_van_tekenen' => $mandate->plaats_van_tekenen,
                'datum_van_tekenen' => optional($mandate->datum_van_tekenen)->toDateString(),
                'ondertekenaar_naam' => $mandate->ondertekenaar_naam,
                'akkoord_checkbox' => (bool) $mandate->akkoord_checkbox,
                'akkoord_op' => optional($mandate->akkoord_op)->format('Y-m-d\TH:i'),
                'status' => $mandate->status->value,
                'ontvangen_op' => optional($mandate->ontvangen_op)->format('Y-m-d\TH:i'),
            ]);

        $activities = Activity::query()
            ->where('garage_company_id', $garageCompany->id)
            ->with('creator')
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Activity $activity) => [
                'id' => $activity->id,
                'type' => $activity->type?->value,
                'titel' => $activity->titel,
                'inhoud' => $activity->inhoud,
                'created_at' => optional($activity->created_at)->toIso8601String(),
                'due_at' => optional($activity->due_at)->toIso8601String(),
                'done_at' => optional($activity->done_at)->toIso8601String(),
                'creator' => $activity->creator ? [
                    'id' => $activity->creator->id,
                    'name' => $activity->creator->name,
                ] : null,
            ]);

        $taken = Activity::query()
            ->where('garage_company_id', $garageCompany->id)
            ->where('type', ActivityType::Taak)
            ->whereNull('done_at')
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->limit(20)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'titel' => $activity->titel,
                'inhoud' => $activity->inhoud,
                'due_at' => optional($activity->due_at)->toIso8601String(),
            ]);

        $afspraken = Activity::query()
            ->where('garage_company_id', $garageCompany->id)
            ->where('type', ActivityType::Afspraak)
            ->whereNull('done_at')
            ->orderByRaw('case when due_at is null then 1 else 0 end, due_at asc')
            ->limit(20)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'titel' => $activity->titel,
                'inhoud' => $activity->inhoud,
                'due_at' => optional($activity->due_at)->toIso8601String(),
            ]);

        return Inertia::render('Crm/GarageCompanies/Show', [
            'garageCompany' => [
                'id' => $garageCompany->id,
                'bedrijfsnaam' => $garageCompany->bedrijfsnaam,
                'kvk_nummer' => $garageCompany->kvk_nummer,
                'btw_nummer' => $garageCompany->btw_nummer,
                'adres_straat_nummer' => $garageCompany->adres_straat_nummer,
                'postcode' => $garageCompany->postcode,
                'plaats' => $garageCompany->plaats,
                'land' => $garageCompany->land,
                'website' => $garageCompany->website,
                'hoofd_email' => $garageCompany->hoofd_email,
                'hoofd_telefoon' => $garageCompany->hoofd_telefoon,
                'status' => $garageCompany->status->value,
                'bron' => $garageCompany->bron->value,
                'tags' => $garageCompany->tags,
                'demo_aangevraagd_op' => $this->formatDateTime($garageCompany->demo_aangevraagd_op),
                'demo_gepland_op' => $this->formatDateTime($garageCompany->demo_gepland_op),
                'demo_duur_dagen' => $garageCompany->demo_duur_dagen,
                'demo_eind_op' => $this->formatDateTime($garageCompany->demo_eind_op),
                'proefperiode_start' => $this->formatDateTime($garageCompany->proefperiode_start),
                'actief_vanaf' => $this->formatDateTime($garageCompany->actief_vanaf),
                'opgezegd_op' => $this->formatDateTime($garageCompany->opgezegd_op),
                'opzegreden' => $garageCompany->opzegreden,
                'verloren_op' => $this->formatDateTime($garageCompany->verloren_op),
                'verloren_reden' => $garageCompany->verloren_reden,
                'actieve_seats' => $garageCompany->active_seats_count ?? 0,
                'active_mrr_excl' => (float) $garageCompany->active_mrr_excl,
                'active_mrr_incl' => (float) $garageCompany->active_mrr_incl,
                'primary_person' => $garageCompany->primaryPerson ? [
                    'voornaam' => $garageCompany->primaryPerson->voornaam,
                    'achternaam' => $garageCompany->primaryPerson->achternaam,
                    'email' => $garageCompany->primaryPerson->email,
                    'telefoon' => $garageCompany->primaryPerson->telefoon,
                ] : null,
            ],
            'tab' => $tab,
            'statusOptions' => collect(GarageCompanyStatus::cases())->map(fn ($s) => $s->value)->values(),
            'sourceOptions' => collect(GarageCompanySource::cases())->map(fn ($s) => $s->value)->values(),
            'moduleRows' => $moduleRows,
            'moduleTotals' => $moduleTotals,
            'persons' => $persons,
            'seats' => $seats,
            'mandates' => $mandates,
            'activities' => $activities,
            'tasks' => $taken,
            'appointments' => $afspraken,
            'reminderChannels' => collect(ReminderChannel::cases())->map(fn ($c) => $c->value)->values(),
            'hasActiveMandate' => $garageCompany->mandates->firstWhere('status', SepaMandateStatus::Actief) !== null,
            'statusErrors' => $this->statusErrors($garageCompany),
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'show' => route('crm.garage_companies.show', ['garageCompany' => $garageCompany->id]),
                'old_show' => route('crm.garage_companies.old.show', ['garageCompany' => $garageCompany->id]),
                'update_overview' => route('crm.garage_companies.update', ['garageCompany' => $garageCompany->id]),
                'store_person' => route('crm.garage_companies.persons.store', ['garageCompany' => $garageCompany->id]),
                'update_person' => route('crm.garage_companies.persons.update', ['garageCompany' => $garageCompany->id, 'person' => '__PERSON__']),
                'delete_person' => route('crm.garage_companies.persons.delete', ['garageCompany' => $garageCompany->id, 'person' => '__PERSON__']),
                'update_modules' => route('crm.garage_companies.modules.update', ['garageCompany' => $garageCompany->id]),
                'store_seat' => route('crm.garage_companies.seats.store', ['garageCompany' => $garageCompany->id]),
                'update_seat' => route('crm.garage_companies.seats.update', ['garageCompany' => $garageCompany->id, 'seat' => '__SEAT__']),
                'delete_seat' => route('crm.garage_companies.seats.delete', ['garageCompany' => $garageCompany->id, 'seat' => '__SEAT__']),
                'save_demo_dates' => route('crm.garage_companies.demo.dates', ['garageCompany' => $garageCompany->id]),
                'extend_demo' => route('crm.garage_companies.demo.extend', ['garageCompany' => $garageCompany->id]),
                'set_demo_status' => route('crm.garage_companies.demo.status', ['garageCompany' => $garageCompany->id]),
                'save_mandate' => route('crm.garage_companies.mandates.save', ['garageCompany' => $garageCompany->id]),
                'set_mandate_status' => route('crm.garage_companies.mandates.status', ['garageCompany' => $garageCompany->id, 'mandate' => '__MANDATE__']),
                'add_note' => route('crm.garage_companies.timeline.add', ['garageCompany' => $garageCompany->id]),
                'add_task' => route('crm.garage_companies.tasks.add', ['garageCompany' => $garageCompany->id]),
                'mark_task_done' => route('crm.garage_companies.tasks.done', ['garageCompany' => $garageCompany->id, 'activity' => '__ACTIVITY__']),
            ],
        ]);
    }


    public function updateOverview(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'kvk_nummer' => ['nullable', 'string', 'max:50'],
            'btw_nummer' => ['nullable', 'string', 'max:50'],
            'adres_straat_nummer' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'hoofd_email' => ['required', 'email', 'max:255'],
            'hoofd_telefoon' => ['required', 'string', 'max:50'],
            'status' => ['required', Rule::enum(GarageCompanyStatus::class)],
            'bron' => ['required', Rule::enum(GarageCompanySource::class)],
            'tags' => ['nullable', 'string'],
            'demo_aangevraagd_op' => ['nullable', 'date'],
            'demo_gepland_op' => ['nullable', 'date'],
            'proefperiode_start' => ['nullable', 'date'],
            'actief_vanaf' => ['nullable', 'date'],
            'opgezegd_op' => ['nullable', 'date'],
            'opzegreden' => ['nullable', 'string'],
            'verloren_op' => ['nullable', 'date'],
            'verloren_reden' => ['nullable', 'string'],
        ]);

        $oldStatus = $garageCompany->status->value;

        $garageCompany->fill($data);
        $garageCompany->save();

        if ($oldStatus !== $garageCompany->status->value) {
            Activity::create([
                'garage_company_id' => $garageCompany->id,
                'type' => ActivityType::StatusWijziging,
                'titel' => "Status gewijzigd: {$oldStatus} -> {$garageCompany->status->value}",
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);
        }

        return back()->with('status', 'Opgeslagen.');
    }

    public function storePerson(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'voornaam' => ['required', 'string', 'max:255'],
            'achternaam' => ['required', 'string', 'max:255'],
            'rol' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('customer_persons', 'email')
                    ->where('garage_company_id', $garageCompany->id),
            ],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $person = CustomerPerson::create([
            ...$data,
            'garage_company_id' => $garageCompany->id,
        ]);

        if ($data['is_primary'] ?? false) {
            CustomerPerson::query()
                ->where('garage_company_id', $garageCompany->id)
                ->whereKeyNot($person->id)
                ->update(['is_primary' => false]);
        }

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Contactpersoon bijgewerkt',
            'inhoud' => "{$person->voornaam} {$person->achternaam} ({$person->email})",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Contactpersoon opgeslagen.');
    }

    public function updatePerson(Request $request, GarageCompany $garageCompany, CustomerPerson $person): RedirectResponse
    {
        $data = $request->validate([
            'voornaam' => ['required', 'string', 'max:255'],
            'achternaam' => ['required', 'string', 'max:255'],
            'rol' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('customer_persons', 'email')
                    ->where('garage_company_id', $garageCompany->id)
                    ->ignore($person->id),
            ],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $person->update($data);

        if ($data['is_primary'] ?? false) {
            CustomerPerson::query()
                ->where('garage_company_id', $garageCompany->id)
                ->whereKeyNot($person->id)
                ->update(['is_primary' => false]);
        }

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Contactpersoon bijgewerkt',
            'inhoud' => "{$person->voornaam} {$person->achternaam} ({$person->email})",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Contactpersoon opgeslagen.');
    }

    public function deletePerson(GarageCompany $garageCompany, CustomerPerson $person): RedirectResponse
    {
        $person->delete();

        return back()->with('status', 'Contactpersoon verwijderd.');
    }


    public function updateModules(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $rows = $request->input('rows', []);
        $rules = [];
        $messages = [];

        foreach ($rows as $i => $row) {
            $rules["rows.$i.module_id"] = ['required', 'integer', 'exists:modules,id'];
            $rules["rows.$i.aantal"] = ['required', 'integer', 'min:0', 'max:999'];
            $rules["rows.$i.prijs_maand_excl"] = ['required', 'numeric', 'min:0'];
            $rules["rows.$i.btw_percentage"] = ['required', 'numeric', 'min:0', 'max:100'];
            $rules["rows.$i.actief"] = ['boolean'];
            $messages["rows.$i.prijs_maand_excl.required"] = "Prijs is verplicht voor {$row['naam']}.";
        }

        $validated = Validator::make(['rows' => $rows], $rules, $messages)->validate();

        foreach ($validated['rows'] as $row) {
            if ($row['actief'] && (int) $row['aantal'] < 1) {
                return back()
                    ->withErrors(["rows.{$this->rowIndexByModuleId($validated['rows'], (int) $row['module_id'])}.aantal" => 'Actieve module vereist aantal >= 1.'])
                    ->withInput();
            }
        }

        DB::transaction(function () use ($garageCompany, $validated) {
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
                    ->where('garage_company_id', $garageCompany->id)
                    ->where('module_id', $row['module_id'])
                    ->update($updates);
            }
        });

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Module,
            'titel' => 'Modules/prijzen bijgewerkt',
            'inhoud' => null,
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Modules opgeslagen.');
    }

    public function storeSeat(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'naam' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'rol_in_kivii' => ['nullable', 'string', 'max:255'],
            'actief' => ['boolean'],
            'aangemaakt_op' => ['nullable', 'date'],
        ]);

        $seat = KiviiSeat::create([
            ...$data,
            'garage_company_id' => $garageCompany->id,
        ]);

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Gebruiker bijgewerkt',
            'inhoud' => "{$seat->naam} ({$seat->email})",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Gebruiker opgeslagen.');
    }

    public function updateSeat(Request $request, GarageCompany $garageCompany, KiviiSeat $seat): RedirectResponse
    {
        $data = $request->validate([
            'naam' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'rol_in_kivii' => ['nullable', 'string', 'max:255'],
            'actief' => ['boolean'],
            'aangemaakt_op' => ['nullable', 'date'],
        ]);

        $seat->update($data);

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Systeem,
            'titel' => 'Gebruiker bijgewerkt',
            'inhoud' => "{$seat->naam} ({$seat->email})",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Gebruiker opgeslagen.');
    }

    public function deleteSeat(GarageCompany $garageCompany, KiviiSeat $seat): RedirectResponse
    {
        $seat->delete();

        return back()->with('status', 'Gebruiker verwijderd.');
    }


    public function saveDemoDates(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'demo_aangevraagd_op' => ['nullable', 'date'],
            'demo_gepland_op' => ['nullable', 'date'],
            'demo_duur_dagen' => ['nullable', 'integer', 'min:0'],
            'proefperiode_start' => ['nullable', 'date'],
            'actief_vanaf' => ['nullable', 'date'],
        ]);

        $garageCompany->fill($data);

        if ($data['demo_aangevraagd_op'] ?? null && $data['demo_duur_dagen'] ?? null) {
            $garageCompany->demo_eind_op = Carbon::parse($data['demo_aangevraagd_op'])
                ->addDays((int) $data['demo_duur_dagen']);
        }

        $garageCompany->save();

        return back()->with('status', 'Datums opgeslagen.');
    }

    public function extendDemo(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'demo_verleng_dagen' => ['required', 'integer', 'min:1'],
            'demo_verleng_notitie' => ['nullable', 'string'],
        ]);

        if (! $garageCompany->demo_eind_op && $garageCompany->demo_aangevraagd_op) {
            $basisDagen = $garageCompany->demo_duur_dagen ?? 0;
            $garageCompany->demo_eind_op = $garageCompany->demo_aangevraagd_op->copy()->addDays($basisDagen);
        }

        if (! $garageCompany->demo_eind_op) {
            return back()->with('status', 'Stel eerst een demo einddatum in.');
        }

        $garageCompany->demo_eind_op = $garageCompany->demo_eind_op->copy()->addDays((int) $data['demo_verleng_dagen']);
        $garageCompany->demo_duur_dagen = (int) ($garageCompany->demo_duur_dagen ?? 0) + (int) $data['demo_verleng_dagen'];
        $garageCompany->save();

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Demo,
            'titel' => "Demo verlengd met {$data['demo_verleng_dagen']} dagen",
            'inhoud' => $data['demo_verleng_notitie'] ?: null,
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Demo verlengd.');
    }

    public function setDemoStatus(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(GarageCompanyStatus::class)],
        ]);

        $garageCompany->load('mandates');
        $from = $garageCompany->status->value;
        $to = $data['status'];

        if (! $this->canTransition($from, $to)) {
            return back()->with('status', 'Ongeldige status overgang.');
        }

        if ($to === GarageCompanyStatus::DemoAangevraagd->value && ! $garageCompany->demo_aangevraagd_op) {
            $garageCompany->demo_aangevraagd_op = now();
        }

        if ($to === GarageCompanyStatus::DemoGepland->value && ! $garageCompany->demo_gepland_op) {
            return back()->with('status', 'Vul eerst demo_gepland_op in.');
        }

        if ($to === GarageCompanyStatus::Proefperiode->value && ! $garageCompany->proefperiode_start) {
            $garageCompany->proefperiode_start = now();
        }

        if ($to === GarageCompanyStatus::Actief->value) {
            if (! $garageCompany->actief_vanaf) {
                $garageCompany->actief_vanaf = now();
            }

            $hasActiveMandate = $garageCompany->mandates->firstWhere('status', SepaMandateStatus::Actief) !== null;
            if (! $hasActiveMandate) {
                return back()->with('status', 'Actief vereist een SEPA mandaat met status actief.');
            }
        }

        $garageCompany->status = GarageCompanyStatus::from($to);
        $garageCompany->save();

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::StatusWijziging,
            'titel' => "Status gewijzigd: {$from} -> {$to}",
            'inhoud' => null,
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Status bijgewerkt.');
    }


    public function saveMandate(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'mandate_id' => ['nullable', 'integer'],
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'voor_en_achternaam' => ['required', 'string', 'max:255'],
            'straatnaam_en_nummer' => ['required', 'string', 'max:255'],
            'postcode' => ['required', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],
            'iban' => ['required', 'string', 'max:34'],
            'bic' => ['nullable', 'string', 'max:11'],
            'email' => ['required', 'email', 'max:255'],
            'telefoonnummer' => ['required', 'string', 'max:50'],
            'plaats_van_tekenen' => ['required', 'string', 'max:255'],
            'datum_van_tekenen' => ['required', 'date'],
            'ondertekenaar_naam' => ['nullable', 'string', 'max:255'],
            'akkoord_checkbox' => ['boolean'],
            'akkoord_op' => ['nullable', 'date'],
            'status' => ['required', Rule::enum(SepaMandateStatus::class)],
            'ontvangen_op' => ['nullable', 'date'],
        ]);

        $mandateId = $data['mandate_id'] ?? null;
        unset($data['mandate_id']);

        if ($data['status'] === SepaMandateStatus::Actief->value) {
            SepaMandate::query()
                ->where('garage_company_id', $garageCompany->id)
                ->where('status', SepaMandateStatus::Actief)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);
        }

        $mandate = SepaMandate::updateOrCreate(
            ['id' => $mandateId],
            [
                ...$data,
                'garage_company_id' => $garageCompany->id,
                'mandaat_id' => $mandateId ? SepaMandate::findOrFail($mandateId)->mandaat_id : $this->generateMandaatId($garageCompany->id),
            ],
        );

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Mandate,
            'titel' => 'SEPA mandaat opgeslagen',
            'inhoud' => "Mandaat {$mandate->mandaat_id} ({$mandate->status->value})",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Mandaat opgeslagen.');
    }

    public function setMandateStatus(Request $request, GarageCompany $garageCompany, SepaMandate $mandate): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(SepaMandateStatus::class)],
        ]);

        $to = SepaMandateStatus::from($data['status']);

        if ($to === SepaMandateStatus::Actief) {
            SepaMandate::query()
                ->where('garage_company_id', $garageCompany->id)
                ->where('status', SepaMandateStatus::Actief)
                ->whereKeyNot($mandate->id)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);
        }

        $mandate->status = $to;
        $mandate->save();

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Mandate,
            'titel' => 'Mandaat status gewijzigd',
            'inhoud' => "Mandaat {$mandate->mandaat_id} -> {$to->value}",
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Mandaat status bijgewerkt.');
    }

    public function addTimelineNote(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'titel' => ['required', 'string', 'max:255'],
            'inhoud' => ['required', 'string', 'min:2'],
        ]);

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Notitie,
            'titel' => $data['titel'],
            'inhoud' => $data['inhoud'],
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Notitie toegevoegd.');
    }

    public function addTaskAppointment(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(ActivityType::class)],
            'titel' => ['required', 'string', 'max:255'],
            'inhoud' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'createReminder' => ['boolean'],
            'remind_at' => ['nullable', 'date'],
            'channel' => ['required', Rule::enum(ReminderChannel::class)],
        ]);

        $type = in_array($data['type'], [ActivityType::Taak->value, ActivityType::Afspraak->value], true)
            ? ActivityType::from($data['type'])
            : ActivityType::Taak;

        $activity = Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => $type,
            'titel' => $data['titel'],
            'inhoud' => $data['inhoud'],
            'due_at' => $data['due_at'],
            'created_by' => auth()->id(),
        ]);

        if ($data['createReminder'] ?? false) {
            Reminder::create([
                'user_id' => auth()->id(),
                'garage_company_id' => $garageCompany->id,
                'activity_id' => $activity->id,
                'titel' => $data['titel'],
                'message' => $data['inhoud'],
                'remind_at' => $data['remind_at'] ?? $data['due_at'] ?? now()->addHour(),
                'channel' => ReminderChannel::from($data['channel']),
                'status' => ReminderStatus::Gepland,
            ]);
        }

        return back()->with('status', 'Toegevoegd.');
    }

    public function markTaskDone(GarageCompany $garageCompany, Activity $activity): RedirectResponse
    {
        Activity::query()
            ->where('garage_company_id', $garageCompany->id)
            ->whereKey($activity->id)
            ->update(['done_at' => now()]);

        return back()->with('status', 'Afgehandeld.');
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

    private function ensureAssignmentsExist(int $garageCompanyId): void
    {
        $moduleIds = Module::query()->pluck('id')->all();
        foreach ($moduleIds as $moduleId) {
            GarageCompanyModule::firstOrCreate(
                [
                    'garage_company_id' => $garageCompanyId,
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

    /**
     * @return array<int, array{assignment_id:int,module_id:int,naam:string,aantal:int,actief:bool,prijs_maand_excl:string,btw_percentage:string}>
     */
    private function moduleRows(int $garageCompanyId): array
    {
        return GarageCompanyModule::query()
            ->where('garage_company_id', $garageCompanyId)
            ->with('module')
            ->get()
            ->sortBy(fn ($r) => $r->module->naam)
            ->values()
            ->map(fn ($r) => [
                'assignment_id' => $r->id,
                'module_id' => $r->module_id,
                'naam' => $r->module->naam,
                'aantal' => GarageCompanyModule::hasAantalColumn() ? (int) ($r->aantal ?? 1) : 1,
                'actief' => (bool) $r->actief,
                'prijs_maand_excl' => (string) $r->prijs_maand_excl,
                'btw_percentage' => (string) $r->btw_percentage,
            ])
            ->all();
    }

    /**
     * @param array<int, array{assignment_id:int,module_id:int,naam:string,aantal:int,actief:bool,prijs_maand_excl:string,btw_percentage:string}> $rows
     * @return array{actieveModules:int,totaalModules:int,totaalExcl:float,btw:float,totaalIncl:float}
     */
    private function moduleTotals(array $rows): array
    {
        $totaalExcl = 0.0;
        $btw = 0.0;
        $actieveModules = 0;

        foreach ($rows as $row) {
            if (! $row['actief']) {
                continue;
            }
            $prijs = (float) $row['prijs_maand_excl'];
            $aantal = max(1, (int) ($row['aantal'] ?? 1));
            $totaalExcl += $prijs * $aantal;
            $btw += ($prijs * $aantal) * ((float) $row['btw_percentage'] / 100);
            $actieveModules++;
        }

        return [
            'actieveModules' => $actieveModules,
            'totaalModules' => count($rows),
            'totaalExcl' => $totaalExcl,
            'btw' => $btw,
            'totaalIncl' => $totaalExcl + $btw,
        ];
    }

    /**
     * @return array<int, array{module_id:int,naam:string,aantal:int,actief:bool,prijs_maand_excl:float,btw_percentage:float}>
     */
    private function defaultModuleRows(): array
    {
        return Module::query()
            ->orderBy('naam')
            ->get()
            ->map(fn (Module $module) => [
                'module_id' => $module->id,
                'naam' => $module->naam,
                'aantal' => 1,
                'actief' => false,
                'prijs_maand_excl' => 0.0,
                'btw_percentage' => 21.0,
            ])
            ->all();
    }

    /**
     * @param array<int, array{module_id:int}> $rows
     */
    private function rowIndexByModuleId(array $rows, int $moduleId): int
    {
        foreach ($rows as $i => $row) {
            if ((int) $row['module_id'] === $moduleId) {
                return $i;
            }
        }

        return 0;
    }

    /**
     * @param array<int, array{module_id:int}> $rows
     */
    private function moduleRowIndexByModuleId(array $rows, int $moduleId): int
    {
        return $this->rowIndexByModuleId($rows, $moduleId);
    }

    private function canTransition(string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        $flow = [
            GarageCompanyStatus::Lead->value => [GarageCompanyStatus::DemoAangevraagd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::DemoAangevraagd->value => [GarageCompanyStatus::DemoGepland->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::DemoGepland->value => [GarageCompanyStatus::Proefperiode->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Proefperiode->value => [GarageCompanyStatus::Actief->value, GarageCompanyStatus::Opgezegd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Actief->value => [GarageCompanyStatus::Opgezegd->value, GarageCompanyStatus::Verloren->value],
            GarageCompanyStatus::Opgezegd->value => [],
            GarageCompanyStatus::Verloren->value => [],
        ];

        return in_array($to, $flow[$from] ?? [], true);
    }

    private function formatDateTime(?Carbon $date): ?string
    {
        return $date ? $date->format('Y-m-d\TH:i') : null;
    }

    /**
     * @return array<int, string>
     */
    private function statusErrors(GarageCompany $company): array
    {
        $hasActiveMandate = $company->mandates()->where('status', SepaMandateStatus::Actief)->exists();
        $statusErrors = [];

        if ($company->status->value === GarageCompanyStatus::DemoAangevraagd->value && ! $company->demo_aangevraagd_op) {
            $statusErrors[] = 'Status demo_aangevraagd vereist demo_aangevraagd_op.';
        }
        if ($company->status->value === GarageCompanyStatus::DemoGepland->value && (! $company->demo_aangevraagd_op || ! $company->demo_gepland_op)) {
            $statusErrors[] = 'Status demo_gepland vereist demo_aangevraagd_op en demo_gepland_op.';
        }
        if ($company->status->value === GarageCompanyStatus::Proefperiode->value && ! $company->proefperiode_start) {
            $statusErrors[] = 'Status proefperiode vereist proefperiode_start.';
        }
        if ($company->status->value === GarageCompanyStatus::Actief->value) {
            if (! $company->actief_vanaf) {
                $statusErrors[] = 'Status actief vereist actief_vanaf.';
            }
            if (! $hasActiveMandate) {
                $statusErrors[] = 'Status actief vereist een SEPA mandaat met status actief.';
            }
        }
        if ($company->status->value === GarageCompanyStatus::Opgezegd->value && ! $company->opgezegd_op) {
            $statusErrors[] = 'Status opgezegd vereist opgezegd_op.';
        }
        if ($company->status->value === GarageCompanyStatus::Verloren->value && ! $company->verloren_op) {
            $statusErrors[] = 'Status verloren vereist verloren_op.';
        }

        return $statusErrors;
    }

}
