<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\SepaMandateStatus;
use App\Mail\TemplateMail;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\EmailTemplate;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\KiviiSeat;
use App\Models\Module;
use App\Models\OutboundEmail;
use App\Models\Reminder;
use App\Models\SepaMandate;
use App\Models\SmtpSetting;
use App\Models\User;
use App\Services\EmailTemplateRenderer;
use App\Services\IncassoProrataCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class GarageCompaniesController
{
    private static ?array $incassoColumns = null;

    public function index(Request $request): Response
    {
        $view = (string) $request->query('view', 'actief');
        if (! in_array($view, ['actief', 'prullenbak'], true)) {
            $view = 'actief';
        }
        if ($view === 'prullenbak' && ! GarageCompany::hasTrashColumn()) {
            $view = 'actief';
        }

        $filters = [
            'view' => $view,
            'search' => (string) $request->query('search', ''),
            'status' => (string) $request->query('status', 'alle'),
            'tag' => (string) $request->query('tag', ''),
            'sort' => (string) $request->query('sort', 'updated_desc'),
            'perPage' => (int) $request->query('perPage', 15),
        ];

        $perPage = $filters['perPage'];

        $baseQuery = $view === 'prullenbak'
            ? GarageCompany::query()->onlyDeleted()
            : GarageCompany::query();

        if ($filters['status'] !== 'alle') {
            $baseQuery->where('status', $filters['status']);
        }

        if (! empty($filters['tag'])) {
            $baseQuery->where('tags', 'like', '%'.$filters['tag'].'%');
        }

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $baseQuery->where(function ($q) use ($search) {
                $q->where('bedrijfsnaam', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_email', 'like', '%'.$search.'%')
                    ->orWhere('hoofd_telefoon', 'like', '%'.$search.'%')
                    ->orWhere('status', 'like', '%'.$search.'%')
                    ->orWhereHas('customerPersons', fn ($p) => $p->where('email', 'like', '%'.$search.'%'))
                    ->orWhereHas('mandates', fn ($m) => $m->where('iban', 'like', '%'.$search.'%'));
            });
        }

        $query = (clone $baseQuery)
            ->withCount(['customerPersons as klantpersonen_aantal'])
            ->withCount(['seats as actieve_seats' => fn ($q) => $q->where('actief', true)])
            ->withSum(['modules as omzet_excl' => fn ($q) => $q->where('actief', true)], 'prijs_maand_excl');

        $query->when($filters['sort'] === 'actief_vanaf_desc', fn ($q) => $q->orderByDesc('actief_vanaf'))
            ->when($filters['sort'] === 'omzet_desc', fn ($q) => $q->orderByDesc('omzet_excl'))
            ->when($filters['sort'] === 'updated_desc', fn ($q) => $q->orderByDesc('updated_at'));

        $companies = $query->paginate($perPage)->withQueryString();

        $totals = [
            'bedrijven' => (int) (clone $baseQuery)->count(),
            'omzet_excl' => (float) ((clone $baseQuery)
                ->leftJoin('garage_company_modules as gcm', function ($join) {
                    $join->on('gcm.garage_company_id', '=', 'garage_companies.id')
                        ->where('gcm.actief', true);
                })
                ->sum('gcm.prijs_maand_excl')),
        ];

        $companies->through(fn (GarageCompany $company) => [
            'id' => $company->id,
            'bedrijfsnaam' => $company->bedrijfsnaam,
            'status' => GarageCompanyStatus::normalize($company->status?->value ?? ''),
            'hoofd_email' => $company->hoofd_email,
            'hoofd_telefoon' => $company->hoofd_telefoon,
            'plaats' => $company->plaats,
            'updated_at' => $company->updated_at?->toIso8601String(),
            'deleted_at' => $company->deleted_at?->toIso8601String(),
            'actieve_seats' => (int) ($company->actieve_seats ?? 0),
            'omzet_excl' => (float) ($company->omzet_excl ?? 0),
            'show_url' => $view === 'prullenbak'
                ? null
                : route('crm.garage_companies.show', ['garageCompany' => $company->id]),
            'delete_url' => $view === 'prullenbak'
                ? null
                : route('crm.garage_companies.destroy', ['garageCompany' => $company->id]),
            'restore_url' => $view === 'prullenbak'
                ? route('crm.garage_companies.restore', ['garageCompany' => $company->id])
                : null,
            'force_delete_url' => $view === 'prullenbak'
                ? route('crm.garage_companies.force_delete', ['garageCompany' => $company->id])
                : null,
        ]);

        return Inertia::render('Crm/GarageCompanies/Index', [
            'companies' => $companies,
            'totals' => $totals,
            'trashCount' => GarageCompany::hasTrashColumn()
                ? GarageCompany::query()->onlyDeleted()->count()
                : 0,
            'filters' => $filters,
            'statusOptions' => collect(GarageCompanyStatus::selectableValues())->values(),
            'statusLabels' => GarageCompanyStatus::labelMap(),
            'sourceOptions' => collect(GarageCompanySource::cases())->map(fn ($s) => $s->value)->values(),
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'create' => route('crm.garage_companies.create'),
                'purge_trash' => route('crm.garage_companies.purge_trash'),
                'export_incasso_batch' => route('crm.incasso.export'),
            ],
        ]);
    }

    public function create(): Response
    {
        $moduleRows = $this->defaultModuleRows();

        return Inertia::render('Crm/GarageCompanies/Create', [
            'statusOptions' => collect(GarageCompanyStatus::selectableValues())->values(),
            'statusLabels' => GarageCompanyStatus::labelMap(),
            'sourceOptions' => collect(GarageCompanySource::cases())->map(fn ($s) => $s->value)->values(),
            'moduleRows' => $moduleRows,
            'defaults' => [
                'land' => 'Nederland',
                'datum_van_tekenen' => now()->toDateString(),
                'proefperiode_start' => now()->toDateString(),
            ],
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'store' => route('crm.garage_companies.store'),
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
            'kvk_nummer' => ['nullable', 'string', 'max:50'],

            'iban' => ['nullable', 'string', 'max:34'],
            'bic' => ['nullable', 'string', 'max:11'],
            'plaats_van_tekenen' => ['nullable', 'string', 'max:255'],
            'datum_van_tekenen' => ['nullable', 'date'],

            'status' => ['required', Rule::in(GarageCompanyStatus::selectableValues())],
            'bron' => ['required', Rule::enum(GarageCompanySource::class)],
            'tags' => ['nullable', 'string'],
            'proefperiode_start' => ['nullable', 'date'],
            'actief_vanaf' => ['nullable', 'date'],
            'opgezegd_op' => ['nullable', 'date'],
            'opzegreden' => ['nullable', 'string', 'max:255'],
            'login_email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'login_password' => ['nullable', 'string', 'min:8'],
        ]);

        $data['login_email'] = $data['login_email'] ?: null;
        $data['login_password'] = $data['login_password'] ?: null;

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

        if ($data['status'] === GarageCompanyStatus::Opgezegd->value) {
            if (empty($data['opzegreden'])) {
                return back()->withErrors(['opzegreden' => 'Opzegreden is verplicht bij status opgezegd.'])->withInput();
            }
            if (empty($data['opgezegd_op'])) {
                return back()->withErrors(['opgezegd_op' => 'Opgezegd op is verplicht bij status opgezegd.'])->withInput();
            }
        }

        if (empty($data['login_email']) && ! empty($data['login_password'])) {
            return back()->withErrors(['login_email' => 'Vul een login e-mail in voordat je een wachtwoord zet.'])->withInput();
        }

        if (! empty($data['iban'])) {
            if (empty($data['plaats_van_tekenen']) || empty($data['datum_van_tekenen'])) {
                return back()
                    ->withErrors(['iban' => 'Vul plaats en datum van tekenen in voor het SEPA mandaat.'])
                    ->withInput();
            }
        }

        $company = DB::transaction(function () use ($data, $moduleRows) {
            [$voornaam, $achternaam] = $this->splitFullName($data['voor_en_achternaam']);

            $companyData = [
                'bedrijfsnaam' => $data['bedrijfsnaam'],
                'adres_straat_nummer' => $data['straatnaam_en_nummer'],
                'postcode' => $data['postcode'],
                'plaats' => $data['plaats'],
                'land' => $data['land'],
                'kvk_nummer' => $data['kvk_nummer'] ?? null,
                'hoofd_email' => $data['email'],
                'hoofd_telefoon' => $data['telefoonnummer'],
                'status' => $data['status'],
                'bron' => $data['bron'],
                'tags' => $data['tags'] ?? null,
                'proefperiode_start' => $data['proefperiode_start'] ?? null,
                'actief_vanaf' => $data['actief_vanaf'] ?? null,
                'opgezegd_op' => $data['opgezegd_op'] ?? null,
                'opzegreden' => $data['opzegreden'] ?? null,
                'created_by' => auth()->id(),
            ];

            if (Schema::hasColumn('garage_companies', 'login_email')) {
                $companyData['login_email'] = $data['login_email'] ?? null;
            }

            if (Schema::hasColumn('garage_companies', 'login_password')) {
                $companyData['login_password'] = $data['login_password'] ?? null;
            }

            $company = GarageCompany::create($companyData);

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

            $sepaMandate = null;
            if (! empty($data['iban'])) {
                $sepaMandate = SepaMandate::create([
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
            }

            if (! empty($data['login_email'])) {
                $password = $data['login_password'] ?: Str::random(24);
                $user = User::create([
                    'name' => $data['voor_en_achternaam'],
                    'email' => $data['login_email'],
                    'password' => $password,
                    'role' => \App\Enums\UserRole::Medewerker->value,
                    'phone' => $data['telefoonnummer'] ?? null,
                    'active' => true,
                ]);

                $company->update(['eigenaar_user_id' => $user->id]);

                KiviiSeat::create([
                    'garage_company_id' => $company->id,
                    'naam' => $data['voor_en_achternaam'],
                    'email' => $data['login_email'],
                    'rol_in_kivii' => 'eigenaar',
                    'actief' => true,
                    'aangemaakt_op' => now()->toDateString(),
                ]);
            }

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

            if ($sepaMandate) {
                Activity::create([
                    'garage_company_id' => $company->id,
                    'type' => ActivityType::Mandate,
                    'titel' => 'SEPA mandaat vastgelegd (pending)',
                    'inhoud' => "IBAN: {$data['iban']}",
                    'created_by' => auth()->id(),
                ]);
            }

            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Module,
                'titel' => 'Modules ingesteld',
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);

            return $company;
        });

        $this->ensureWelcomeDraft($company);

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
        $activeMandate = $garageCompany->mandates->firstWhere('status', SepaMandateStatus::Actief);
        [$incassoIsComplete, $incassoMissingFields] = $this->incassoCompleteness($garageCompany, $activeMandate);

        $this->ensureAssignmentsExist($garageCompany->id);

        $welcomeEmail = $this->ensureWelcomeDraft($garageCompany);
        $smtpConfigured = Schema::hasTable('smtp_settings')
            ? (SmtpSetting::query()->first()?->isComplete() ?? false)
            : false;

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

        $emailTemplates = collect();
        if (Schema::hasTable('email_templates')) {
            $templateData = $this->welcomeTemplateData($garageCompany);
            $templateQuery = EmailTemplate::query()->orderBy('name');
            if (Schema::hasColumn('email_templates', 'is_active')) {
                $templateQuery->where('is_active', true);
            }

            $emailTemplates = $templateQuery
                ->get()
                ->map(function (EmailTemplate $template) use ($templateData) {
                    $rendered = EmailTemplateRenderer::render($template, $templateData);

                    return [
                        'id' => $template->id,
                        'key' => $template->key,
                        'name' => $template->name,
                        'subject' => $rendered['subject'],
                        'body_html' => $rendered['html'],
                        'preview' => Str::limit(trim(strip_tags($rendered['html'] ?? '')), 140),
                    ];
                });
        }

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
                'login_email' => $garageCompany->login_email,
                'login_password' => '',
                'status' => GarageCompanyStatus::normalize($garageCompany->status->value),
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
            'welcomeEmail' => $welcomeEmail ? [
                'id' => $welcomeEmail->id,
                'template_id' => $welcomeEmail->template_id,
                'to_email' => $welcomeEmail->to_email,
                'subject' => $welcomeEmail->subject,
                'body_html' => $welcomeEmail->body_html,
                'body_text' => $welcomeEmail->body_text,
                'status' => $welcomeEmail->status,
                'sent_at' => optional($welcomeEmail->sent_at)->toIso8601String(),
            ] : null,
            'incasso' => [
                'kenmerk_machtiging' => $this->companyIncassoValue($garageCompany, 'incasso_kenmerk_machtiging'),
                'formulier_naam' => $this->companyIncassoValue($garageCompany, 'incasso_formulier_naam'),
                'formulier_url' => $this->companyIncassoValue($garageCompany, 'incasso_formulier_path')
                    ? Storage::disk('public')->url((string) $this->companyIncassoValue($garageCompany, 'incasso_formulier_path'))
                    : null,
                'formulier_uploaded_at' => $this->companyIncassoValue($garageCompany, 'incasso_formulier_uploaded_at')?->toIso8601String(),
                'kenmerk_available' => (bool) ($this->incassoColumns()['incasso_kenmerk_machtiging'] ?? false),
                'is_complete' => $incassoIsComplete,
                'missing_fields' => $incassoMissingFields,
            ],
            'emailTemplates' => $emailTemplates,
            'smtpConfigured' => $smtpConfigured,
            'tab' => $tab,
            'statusOptions' => collect(GarageCompanyStatus::selectableValues())->values(),
            'statusLabels' => GarageCompanyStatus::labelMap(),
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
            'hasActiveMandate' => $activeMandate !== null,
            'statusErrors' => $this->statusErrors($garageCompany),
            'urls' => [
                'index' => route('crm.garage_companies.index'),
                'show' => route('crm.garage_companies.show', ['garageCompany' => $garageCompany->id]),
                'delete_company' => route('crm.garage_companies.destroy', ['garageCompany' => $garageCompany->id]),
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
                'save_incasso_settings' => route('crm.garage_companies.incasso.settings', ['garageCompany' => $garageCompany->id]),
                'export_incasso_batch' => route('crm.incasso.export'),
                'set_mandate_status' => route('crm.garage_companies.mandates.status', ['garageCompany' => $garageCompany->id, 'mandate' => '__MANDATE__']),
                'add_note' => route('crm.garage_companies.timeline.add', ['garageCompany' => $garageCompany->id]),
                'add_task' => route('crm.garage_companies.tasks.add', ['garageCompany' => $garageCompany->id]),
                'mark_task_done' => route('crm.garage_companies.tasks.done', ['garageCompany' => $garageCompany->id, 'activity' => '__ACTIVITY__']),
                'refresh_welcome_email' => route('crm.garage_companies.welcome.refresh', ['garageCompany' => $garageCompany->id]),
                'update_welcome_email' => route('crm.garage_companies.welcome.update', ['garageCompany' => $garageCompany->id]),
                'send_welcome_email' => route('crm.garage_companies.welcome.send', ['garageCompany' => $garageCompany->id]),
            ],
        ]);
    }

    public function destroy(GarageCompany $garageCompany): RedirectResponse
    {
        $naam = $garageCompany->bedrijfsnaam;
        $garageCompany->moveToTrash();

        return redirect()
            ->route('crm.garage_companies.index')
            ->with('status', "Klant verplaatst naar prullenbak: {$naam}");
    }

    public function restore(int $garageCompany): RedirectResponse
    {
        if (! GarageCompany::hasTrashColumn()) {
            return redirect()
                ->route('crm.garage_companies.index')
                ->with('status', 'Prullenbak is nog niet beschikbaar. Draai eerst migraties.');
        }

        $company = GarageCompany::query()
            ->onlyDeleted()
            ->whereKey($garageCompany)
            ->firstOrFail();

        $naam = $company->bedrijfsnaam;
        $company->restoreFromTrash();

        return redirect()
            ->route('crm.garage_companies.index', ['view' => 'prullenbak'])
            ->with('status', "Klant hersteld: {$naam}");
    }

    public function forceDelete(int $garageCompany): RedirectResponse
    {
        if (! GarageCompany::hasTrashColumn()) {
            return redirect()
                ->route('crm.garage_companies.index')
                ->with('status', 'Prullenbak is nog niet beschikbaar. Draai eerst migraties.');
        }

        $company = GarageCompany::query()
            ->onlyDeleted()
            ->whereKey($garageCompany)
            ->firstOrFail();

        $naam = $company->bedrijfsnaam;
        $company->delete();

        return redirect()
            ->route('crm.garage_companies.index', ['view' => 'prullenbak'])
            ->with('status', "Klant definitief verwijderd: {$naam}");
    }

    public function purgeTrash(): RedirectResponse
    {
        if (! GarageCompany::hasTrashColumn()) {
            return redirect()
                ->route('crm.garage_companies.index')
                ->with('status', 'Prullenbak is nog niet beschikbaar. Draai eerst migraties.');
        }

        $ids = GarageCompany::query()
            ->onlyDeleted()
            ->pluck('id');

        if ($ids->isEmpty()) {
            return redirect()
                ->route('crm.garage_companies.index', ['view' => 'prullenbak'])
                ->with('status', 'Prullenbak is al leeg.');
        }

        $removed = GarageCompany::query()
            ->withoutGlobalScope('not_deleted')
            ->whereIn('id', $ids)
            ->delete();

        return redirect()
            ->route('crm.garage_companies.index', ['view' => 'prullenbak'])
            ->with('status', "{$removed} klant(en) definitief verwijderd uit prullenbak.");
    }


    public function updateOverview(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $garageCompany->load('primaryPerson');

        $data = $request->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'primary_voornaam' => ['required', 'string', 'max:255'],
            'primary_achternaam' => ['required', 'string', 'max:255'],
            'kvk_nummer' => ['nullable', 'string', 'max:50'],
            'btw_nummer' => ['nullable', 'string', 'max:50'],
            'adres_straat_nummer' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'plaats' => ['required', 'string', 'max:255'],
            'land' => ['required', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'hoofd_email' => ['required', 'email', 'max:255'],
            'hoofd_telefoon' => ['required', 'string', 'max:50'],
            'status' => ['required', Rule::in(GarageCompanyStatus::selectableValues())],
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
            'login_email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($garageCompany->eigenaar_user_id),
            ],
            'login_password' => ['nullable', 'string', 'min:8'],
        ]);

        $data['login_email'] = $data['login_email'] ?: null;
        $data['login_password'] = $data['login_password'] ?: null;
        if (empty($data['login_email']) && ! empty($data['login_password'])) {
            return back()->withErrors(['login_email' => 'Vul een login e-mail in voordat je een wachtwoord zet.'])->withInput();
        }

        $oldStatus = $garageCompany->status->value;
        $oldLoginEmail = $garageCompany->login_email;
        $oldHoofdEmail = $garageCompany->hoofd_email;
        $oldBedrijfsnaam = $garageCompany->bedrijfsnaam;
        $oldLoginPassword = $garageCompany->login_password;
        $oldPrimaryName = $garageCompany->primaryPerson
            ? trim("{$garageCompany->primaryPerson->voornaam} {$garageCompany->primaryPerson->achternaam}")
            : null;

        $loginPassword = $data['login_password'];
        unset($data['login_password']);

        $garageCompany->fill($data);
        if (Schema::hasColumn('garage_companies', 'login_password')) {
            if (! empty($loginPassword)) {
                $garageCompany->login_password = $loginPassword;
            } elseif (empty($data['login_email'])) {
                $garageCompany->login_password = null;
            }
        }
        $garageCompany->save();

        $primaryPayload = [
            'voornaam' => $data['primary_voornaam'],
            'achternaam' => $data['primary_achternaam'],
            'email' => $data['hoofd_email'],
            'telefoon' => $data['hoofd_telefoon'],
        ];

        if ($garageCompany->primaryPerson) {
            $garageCompany->primaryPerson->update($primaryPayload);
        } else {
            CustomerPerson::create([
                ...$primaryPayload,
                'garage_company_id' => $garageCompany->id,
                'rol' => 'eigenaar',
                'is_primary' => true,
                'active' => true,
            ]);
        }

        if (! empty($data['login_email'])) {
            if ($garageCompany->eigenaar_user_id) {
                User::query()
                    ->whereKey($garageCompany->eigenaar_user_id)
                    ->update(['email' => $data['login_email']]);
            } else {
                $ownerName = trim("{$data['primary_voornaam']} {$data['primary_achternaam']}");
                $password = $loginPassword ?: Str::random(24);
                $user = User::create([
                    'name' => $ownerName !== '' ? $ownerName : $garageCompany->bedrijfsnaam,
                    'email' => $data['login_email'],
                    'password' => $password,
                    'role' => \App\Enums\UserRole::Medewerker->value,
                    'phone' => $data['hoofd_telefoon'] ?? null,
                    'active' => true,
                ]);

                $garageCompany->update(['eigenaar_user_id' => $user->id]);

                if (! KiviiSeat::query()
                    ->where('garage_company_id', $garageCompany->id)
                    ->where('email', $data['login_email'])
                    ->exists()) {
                    KiviiSeat::create([
                        'garage_company_id' => $garageCompany->id,
                        'naam' => $user->name,
                        'email' => $user->email,
                        'rol_in_kivii' => 'eigenaar',
                        'actief' => true,
                        'aangemaakt_op' => now()->toDateString(),
                    ]);
                }
            }
        }

        if (! empty($loginPassword) && $garageCompany->eigenaar_user_id) {
            User::query()
                ->whereKey($garageCompany->eigenaar_user_id)
                ->update(['password' => $loginPassword]);
        }

        if ($oldStatus !== $garageCompany->status->value) {
            Activity::create([
                'garage_company_id' => $garageCompany->id,
                'type' => ActivityType::StatusWijziging,
                'titel' => "Status gewijzigd: {$oldStatus} -> {$garageCompany->status->value}",
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);
        }

        if (
            $oldLoginEmail !== $garageCompany->login_email
            || $oldHoofdEmail !== $garageCompany->hoofd_email
            || $oldBedrijfsnaam !== $garageCompany->bedrijfsnaam
            || $oldLoginPassword !== $garageCompany->login_password
            || $oldPrimaryName !== trim("{$data['primary_voornaam']} {$data['primary_achternaam']}")
        ) {
            $this->refreshWelcomeDraft($garageCompany, true);
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
        abort_unless($person->garage_company_id === $garageCompany->id, 404);

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
        abort_unless($person->garage_company_id === $garageCompany->id, 404);

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
        abort_unless($seat->garage_company_id === $garageCompany->id, 404);

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
        abort_unless($seat->garage_company_id === $garageCompany->id, 404);

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
            'status' => ['required', Rule::in(GarageCompanyStatus::selectableValues())],
        ]);

        $from = $garageCompany->status->value;
        $to = $data['status'];

        if ($to === GarageCompanyStatus::DemoAangevraagd->value && ! $garageCompany->demo_aangevraagd_op) {
            $garageCompany->demo_aangevraagd_op = now();
        }

        if ($to === GarageCompanyStatus::Proefperiode->value && ! $garageCompany->proefperiode_start) {
            $garageCompany->proefperiode_start = now();
        }

        if ($to === GarageCompanyStatus::Actief->value) {
            if (! $garageCompany->actief_vanaf) {
                $garageCompany->actief_vanaf = now();
            }
        }

        if ($to === GarageCompanyStatus::Opgezegd->value && ! $garageCompany->opgezegd_op) {
            $garageCompany->opgezegd_op = now();
        }

        if ($to === GarageCompanyStatus::Verloren->value && ! $garageCompany->verloren_op) {
            $garageCompany->verloren_op = now();
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
            'mandate_id' => [
                'nullable',
                'integer',
                Rule::exists('sepa_mandates', 'id')->where(
                    fn ($query) => $query->where('garage_company_id', $garageCompany->id)
                ),
            ],
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
            'incasso_kenmerk_machtiging' => ['nullable', 'string', 'max:255'],
            'incasso_formulier' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $hasIncassoKenmerkInput = $request->exists('incasso_kenmerk_machtiging');
        $incassoKenmerk = $data['incasso_kenmerk_machtiging'] ?? null;
        unset($data['incasso_kenmerk_machtiging']);
        $incassoFile = $request->file('incasso_formulier');

        $mandateId = $data['mandate_id'] ?? null;
        unset($data['mandate_id']);
        $existingMandate = null;

        if ($mandateId) {
            $existingMandate = SepaMandate::query()
                ->where('garage_company_id', $garageCompany->id)
                ->findOrFail($mandateId);
        }

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
                'mandaat_id' => $existingMandate?->mandaat_id ?? $this->generateMandaatId($garageCompany->id),
            ],
        );

        $incassoStatusExtra = null;
        $hasKenmerkColumn = $this->incassoColumns()['incasso_kenmerk_machtiging'] ?? false;
        $hasUploadColumns = $this->hasIncassoUploadColumns();

        if ($hasKenmerkColumn && $hasIncassoKenmerkInput) {
            $normalizedKenmerk = filled($incassoKenmerk)
                ? trim((string) $incassoKenmerk)
                : null;

            // Persist directly to avoid edge cases where model state is stale or casted unexpectedly.
            DB::table('garage_companies')
                ->where('id', $garageCompany->id)
                ->update([
                    'incasso_kenmerk_machtiging' => $normalizedKenmerk,
                    'updated_at' => now(),
                ]);

            $garageCompany->setAttribute('incasso_kenmerk_machtiging', $normalizedKenmerk);
        }

        if ($incassoFile && $hasUploadColumns) {
            if ($garageCompany->incasso_formulier_path) {
                Storage::disk('public')->delete($garageCompany->incasso_formulier_path);
            }

            $storedPath = $incassoFile->store("incasso-formulieren/{$garageCompany->id}", 'public');
            $garageCompany->incasso_formulier_path = $storedPath;
            $garageCompany->incasso_formulier_naam = $incassoFile->getClientOriginalName();
            $garageCompany->incasso_formulier_uploaded_at = now();
        } elseif ($incassoFile && ! $hasUploadColumns) {
            $incassoStatusExtra = 'Uploadformulier niet opgeslagen: database migraties ontbreken nog voor upload.';
        }

        if ($hasKenmerkColumn || ($incassoFile && $hasUploadColumns)) {
            $garageCompany->save();
        } elseif (! $hasKenmerkColumn && $hasIncassoKenmerkInput && filled($incassoKenmerk)) {
            $incassoStatusExtra = 'Kenmerk machtiging niet opgeslagen: database migratie ontbreekt nog.';
        }

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Mandate,
            'titel' => 'SEPA mandaat opgeslagen',
            'inhoud' => "Mandaat {$mandate->mandaat_id} ({$mandate->status->value})",
            'created_by' => auth()->id(),
        ]);

        $statusMessage = 'Mandaat opgeslagen.';
        if ($incassoStatusExtra) {
            $statusMessage .= ' '.$incassoStatusExtra;
        }

        return back()->with('status', $statusMessage);
    }

    public function setMandateStatus(Request $request, GarageCompany $garageCompany, SepaMandate $mandate): RedirectResponse
    {
        abort_unless($mandate->garage_company_id === $garageCompany->id, 404);

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

    public function updateIncassoSettings(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $hasKenmerkColumn = $this->incassoColumns()['incasso_kenmerk_machtiging'] ?? false;
        if (! $hasKenmerkColumn) {
            return back()->with('status', 'Kenmerk machtiging is nog niet beschikbaar. Draai eerst de nieuwste database migraties.');
        }

        $data = $request->validate([
            'incasso_kenmerk_machtiging' => ['nullable', 'string', 'max:255'],
            'incasso_formulier' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'remove_incasso_formulier' => ['nullable', 'boolean'],
        ]);

        $garageCompany->incasso_kenmerk_machtiging = filled($data['incasso_kenmerk_machtiging'] ?? null)
            ? trim((string) $data['incasso_kenmerk_machtiging'])
            : null;

        if (($data['remove_incasso_formulier'] ?? false) && $this->hasIncassoUploadColumns() && $garageCompany->incasso_formulier_path) {
            Storage::disk('public')->delete($garageCompany->incasso_formulier_path);
            $garageCompany->incasso_formulier_path = null;
            $garageCompany->incasso_formulier_naam = null;
            $garageCompany->incasso_formulier_uploaded_at = null;
        }

        if ($request->hasFile('incasso_formulier') && $this->hasIncassoUploadColumns()) {
            if ($garageCompany->incasso_formulier_path) {
                Storage::disk('public')->delete($garageCompany->incasso_formulier_path);
            }

            $file = $request->file('incasso_formulier');
            $storedPath = $file->store("incasso-formulieren/{$garageCompany->id}", 'public');
            $garageCompany->incasso_formulier_path = $storedPath;
            $garageCompany->incasso_formulier_naam = $file->getClientOriginalName();
            $garageCompany->incasso_formulier_uploaded_at = now();
        } elseif ($request->hasFile('incasso_formulier') && ! $this->hasIncassoUploadColumns()) {
            return back()->with('status', 'Uploadformulier kan nog niet opgeslagen worden. Draai eerst de nieuwste database migraties.');
        }

        $garageCompany->save();

        Activity::create([
            'garage_company_id' => $garageCompany->id,
            'type' => ActivityType::Mandate,
            'titel' => 'Incasso instellingen bijgewerkt',
            'inhoud' => null,
            'created_by' => auth()->id(),
        ]);

        return back()->with('status', 'Incasso-instellingen opgeslagen.');
    }

    public function exportIncassoBatch(Request $request): BinaryFileResponse|RedirectResponse
    {
        $data = $request->validate([
            'maand' => ['nullable', 'integer', 'min:1', 'max:12'],
            'jaar' => ['nullable', 'integer', 'min:2020', 'max:2100'],
            'uitvoerdatum' => ['nullable', 'date'],
        ]);

        $month = (int) ($data['maand'] ?? now()->month);
        $year = (int) ($data['jaar'] ?? now()->year);
        $executionDate = ! empty($data['uitvoerdatum'])
            ? Carbon::parse((string) $data['uitvoerdatum'])->startOfDay()
            : now()->startOfDay();

        $overview = $this->incassoExportOverview($month, $year);
        $records = $overview['eligible'];

        if ($records === []) {
            return back()->with(
                'status',
                'Geen export gemaakt: geen actieve klanten met complete SEPA + incasso-instellingen.'
            );
        }

        $templatePath = storage_path('app/templates/ing-incasso-template.xlsx');
        if (! is_file($templatePath)) {
            return back()->with(
                'status',
                'Incasso-template ontbreekt: plaats bestand op storage/app/templates/ing-incasso-template.xlsx'
            );
        }

        $tmpDir = storage_path('app/tmp');
        if (! is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }

        $outputPath = $tmpDir.'/incasso_batch_'.$year.'_'.str_pad((string) $month, 2, '0', STR_PAD_LEFT).'_'.Str::uuid().'.xlsx';
        copy($templatePath, $outputPath);

        $zip = new ZipArchive;
        if ($zip->open($outputPath) !== true) {
            return back()->with('status', 'Kon incasso-exportbestand niet openen.');
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (! is_string($sheetXml) || $sheetXml === '') {
            $zip->close();

            return back()->with('status', 'Kon worksheet in template niet lezen.');
        }

        $dom = new \DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = false;
        $dom->loadXML($sheetXml);

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $clearCell = function (string $coord) use ($xpath): void {
            $nodeList = $xpath->query("//x:c[@r='{$coord}']");
            if (! $nodeList || $nodeList->length === 0) {
                return;
            }
            /** @var \DOMElement $cell */
            $cell = $nodeList->item(0);
            while ($cell->firstChild) {
                $cell->removeChild($cell->firstChild);
            }
            $cell->removeAttribute('t');
        };

        $setString = function (string $coord, string $value) use ($xpath, $dom): void {
            $nodeList = $xpath->query("//x:c[@r='{$coord}']");
            if (! $nodeList || $nodeList->length === 0) {
                return;
            }
            /** @var \DOMElement $cell */
            $cell = $nodeList->item(0);
            while ($cell->firstChild) {
                $cell->removeChild($cell->firstChild);
            }
            $cell->setAttribute('t', 'inlineStr');

            $is = $dom->createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'is');
            $t = $dom->createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 't');
            $t->appendChild($dom->createTextNode($value));
            $is->appendChild($t);
            $cell->appendChild($is);
        };

        $setNumber = function (string $coord, float|int $value) use ($xpath, $dom): void {
            $nodeList = $xpath->query("//x:c[@r='{$coord}']");
            if (! $nodeList || $nodeList->length === 0) {
                return;
            }
            /** @var \DOMElement $cell */
            $cell = $nodeList->item(0);
            $formula = null;
            foreach ($cell->childNodes as $childNode) {
                if ($childNode instanceof \DOMElement && $childNode->localName === 'f') {
                    $formula = $childNode->cloneNode(true);
                    break;
                }
            }
            while ($cell->firstChild) {
                $cell->removeChild($cell->firstChild);
            }
            $cell->removeAttribute('t');
            if ($formula) {
                $cell->appendChild($formula);
            }
            $v = $dom->createElementNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'v', (string) $value);
            $cell->appendChild($v);
        };

        for ($row = 12; $row <= 1011; $row++) {
            foreach (['B', 'C', 'D', 'E', 'F', 'G'] as $col) {
                $clearCell($col.$row);
            }
        }

        $row = 12;
        $count = 0;
        $totalAmount = 0.0;
        foreach ($records as $record) {
            if ($row > 1011) {
                break;
            }

            $setString('B'.$row, (string) $record['naam_debiteur']);
            $setString('C'.$row, (string) $record['iban_debiteur']);
            $setString('D'.$row, (string) $record['kenmerk_machtiging']);
            $setNumber('E'.$row, (float) $record['bedrag']);
            $setString('F'.$row, (string) $record['omschrijving']);
            $setNumber('G'.$row, $this->excelDateSerial((string) $record['machtigingsdatum']));

            $count++;
            $totalAmount += (float) $record['bedrag'];
            $row++;
        }

        $setNumber('C4', $this->excelDateSerial($executionDate->toDateString()));
        $setNumber('C8', round($totalAmount, 2));
        $setNumber('C9', $count);

        $zip->deleteName('xl/worksheets/sheet1.xml');
        $zip->addFromString('xl/worksheets/sheet1.xml', $dom->saveXML());
        $zip->close();

        $filename = 'ING_Incasso_'.Str::lower($this->dutchMonthName($month)).'_'.$year.'.xlsx';

        return response()->download($outputPath, $filename)->deleteFileAfterSend(true);
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

    public function refreshWelcomeEmail(GarageCompany $garageCompany): RedirectResponse
    {
        $this->refreshWelcomeDraft($garageCompany, false);

        return back()->with('status', 'Welkomstmail concept ververst.');
    }

    public function updateWelcomeEmail(Request $request, GarageCompany $garageCompany): RedirectResponse
    {
        $data = $request->validate([
            'to_email' => ['nullable', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['nullable', 'string'],
            'template_id' => ['nullable', 'integer'],
        ]);

        $draft = $this->ensureWelcomeDraft($garageCompany);
        if (! $draft) {
            return back()->with('status', 'Welkomstmail is niet beschikbaar (migraties ontbreken).');
        }
        $draft->update([
            'template_id' => $data['template_id'] ?? $draft->template_id,
            'to_email' => $data['to_email'] ?? $draft->to_email,
            'subject' => $data['subject'],
            'body_html' => $data['body_html'] ?? '',
            'body_text' => $this->htmlToText($data['body_html'] ?? ''),
        ]);

        return back()->with('status', 'Welkomstmail concept opgeslagen.');
    }

    public function sendWelcomeEmail(GarageCompany $garageCompany): RedirectResponse
    {
        $draft = $this->ensureWelcomeDraft($garageCompany);
        if (! $draft) {
            return back()->with('status', 'Welkomstmail is niet beschikbaar (migraties ontbreken).');
        }
        if (! Schema::hasTable('smtp_settings')) {
            return back()->with('status', 'SMTP instellingen ontbreken. Voeg ze toe via profiel > systeem-instellingen.');
        }

        $smtp = SmtpSetting::query()->first();

        if (! $smtp || ! $smtp->isComplete()) {
            return back()->with('status', 'SMTP instellingen ontbreken. Voeg ze toe via profiel > systeem-instellingen.');
        }

        try {
            $this->applySmtpSettings($smtp);

            $templateData = $this->welcomeTemplateData($garageCompany, true);
            $subject = EmailTemplateRenderer::renderString((string) $draft->subject, $templateData);
            $bodyHtml = EmailTemplateRenderer::renderString((string) ($draft->body_html ?? ''), $templateData);
            $bodyText = EmailTemplateRenderer::renderString((string) ($draft->body_text ?? ''), $templateData);
            if (trim($bodyText) === '') {
                $bodyText = $this->htmlToText($bodyHtml);
            }

            Mail::to($draft->to_email)->send(new TemplateMail(
                $subject,
                $bodyHtml,
                $bodyText,
                $smtp->from_address,
                $smtp->from_name
            ));

            $draft->update([
                'status' => 'sent',
                'sent_at' => now(),
                'last_error' => null,
            ]);

            Activity::create([
                'garage_company_id' => $garageCompany->id,
                'type' => ActivityType::Systeem,
                'titel' => 'Welkomstmail verstuurd',
                'inhoud' => "Verstuurd naar {$draft->to_email}",
                'created_by' => auth()->id(),
            ]);

            return back()->with('status', 'Welkomstmail verstuurd.');
        } catch (\Throwable $e) {
            $draft->update([
                'status' => 'failed',
                'last_error' => $e->getMessage(),
            ]);

            return back()->with('status', 'Versturen mislukt: '.$e->getMessage());
        }
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

    private function htmlToText(string $html): string
    {
        $text = preg_replace('/<br\\s*\\/?>/i', "\n", $html) ?? $html;
        $text = preg_replace('/<\\/p>\\s*<p>/i', "\n\n", $text) ?? $text;
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/\\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }

    private function ensureWelcomeDraft(GarageCompany $garageCompany): ?OutboundEmail
    {
        if (! Schema::hasTable('outbound_emails') || ! Schema::hasTable('email_templates')) {
            return null;
        }

        $draft = OutboundEmail::query()
            ->where('garage_company_id', $garageCompany->id)
            ->where('type', 'welcome_customer')
            ->where('status', 'draft')
            ->orderByDesc('id')
            ->first();

        if ($draft) {
            return $draft;
        }

        return $this->refreshWelcomeDraft($garageCompany, true);
    }

    private function refreshWelcomeDraft(GarageCompany $garageCompany, bool $silent): ?OutboundEmail
    {
        if (! Schema::hasTable('outbound_emails') || ! Schema::hasTable('email_templates')) {
            return null;
        }

        $template = EmailTemplate::query()
            ->where('key', 'welcome_customer')
            ->first();

        if (! $template) {
            return null;
        }

        $data = $this->welcomeTemplateData($garageCompany);
        $rendered = EmailTemplateRenderer::render($template, $data);

        $draft = OutboundEmail::query()
            ->where('garage_company_id', $garageCompany->id)
            ->where('type', 'welcome_customer')
            ->where('status', 'draft')
            ->orderByDesc('id')
            ->first();

        if ($draft) {
            $draft->update([
                'template_id' => $template->id,
                'to_email' => $garageCompany->hoofd_email,
                'subject' => $rendered['subject'],
                'body_html' => $rendered['html'],
                'body_text' => $rendered['text'],
            ]);
        } else {
            $draft = OutboundEmail::create([
                'garage_company_id' => $garageCompany->id,
                'template_id' => $template->id,
                'type' => 'welcome_customer',
                'to_email' => $garageCompany->hoofd_email,
                'subject' => $rendered['subject'],
                'body_html' => $rendered['html'],
                'body_text' => $rendered['text'],
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);
        }

        if (! $silent) {
            Activity::create([
                'garage_company_id' => $garageCompany->id,
                'type' => ActivityType::Systeem,
                'titel' => 'Welkomstmail concept vernieuwd',
                'inhoud' => null,
                'created_by' => auth()->id(),
            ]);
        }

        return $draft;
    }

    /**
     * @return array<string, string>
     */
    private function welcomeTemplateData(GarageCompany $garageCompany, bool $issuePasswordResetToken = false): array
    {
        $primary = $garageCompany->primaryPerson;
        $naam = $primary ? trim("{$primary->voornaam} {$primary->achternaam}") : $garageCompany->bedrijfsnaam;
        $ownerUser = $garageCompany->eigenaar_user_id
            ? User::query()->find($garageCompany->eigenaar_user_id)
            : null;
        $passwordSetupLink = $this->passwordSetupLink($ownerUser, $issuePasswordResetToken);
        $storedLoginPassword = is_string($garageCompany->login_password) ? trim($garageCompany->login_password) : '';
        $welcomePassword = $storedLoginPassword !== ''
            ? $storedLoginPassword
            : 'Gebruik de activatielink om een wachtwoord te kiezen.';

        return [
            'naam' => $naam ?: $garageCompany->bedrijfsnaam,
            'bedrijfsnaam' => $garageCompany->bedrijfsnaam,
            'loginnaam' => $garageCompany->login_email ?: '-',
            'wachtwoord' => $welcomePassword,
            'reset_link' => $passwordSetupLink,
            'activatielink' => $passwordSetupLink,
            'weblink' => 'https://web.kivii.nl/',
        ];
    }

    private function passwordSetupLink(?User $user, bool $issueToken): string
    {
        if (! $user || ! filled($user->email)) {
            return url('/forgot-password');
        }

        if (! $issueToken) {
            return url('/forgot-password');
        }

        $token = Password::broker()->createToken($user);
        $baseUrl = rtrim(config('app.url') ?: url('/'), '/');

        return $baseUrl.'/reset-password/'.$token.'?email='.urlencode((string) $user->email);
    }

    private function applySmtpSettings(SmtpSetting $smtp): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $smtp->host,
            'mail.mailers.smtp.port' => $smtp->port,
            'mail.mailers.smtp.username' => $smtp->username,
            'mail.mailers.smtp.password' => $smtp->password,
            'mail.mailers.smtp.encryption' => $smtp->encryption ?: null,
            'mail.from.address' => $smtp->from_address,
            'mail.from.name' => $smtp->from_name ?: config('app.name'),
        ]);
    }

    private function ensureAssignmentsExist(int $garageCompanyId): void
    {
        $modules = Module::query()->get();
        $fallbackByModuleId = $this->modulePricingFallbacks();

        foreach ($modules as $module) {
            $resolvedDefaults = $this->resolveModulePricingDefaults($module, $fallbackByModuleId);

            GarageCompanyModule::firstOrCreate(
                [
                    'garage_company_id' => $garageCompanyId,
                    'module_id' => $module->id,
                ],
                [
                    'aantal' => 1,
                    'actief' => false,
                    'prijs_maand_excl' => $resolvedDefaults['prijs_maand_excl'],
                    'btw_percentage' => $resolvedDefaults['btw_percentage'],
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
        $fallbackByModuleId = $this->modulePricingFallbacks();

        return Module::query()
            ->orderBy('naam')
            ->get()
            ->map(function (Module $module) use ($fallbackByModuleId) {
                $resolvedDefaults = $this->resolveModulePricingDefaults($module, $fallbackByModuleId);

                return [
                    'module_id' => $module->id,
                    'naam' => $module->naam,
                    'aantal' => 1,
                    'actief' => false,
                    'prijs_maand_excl' => $resolvedDefaults['prijs_maand_excl'],
                    'btw_percentage' => $resolvedDefaults['btw_percentage'],
                ];
            })
            ->all();
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

    private function formatDateTime(?Carbon $date): ?string
    {
        return $date ? $date->format('Y-m-d\TH:i') : null;
    }

    /**
     * @return array{0:bool,1:array<int,string>}
     */
    private function incassoCompleteness(GarageCompany $company, ?SepaMandate $activeMandate): array
    {
        $missing = [];

        if (! filled($company->bedrijfsnaam)) {
            $missing[] = 'Bedrijfsnaam ontbreekt';
        }

        if (! $activeMandate) {
            $missing[] = 'Geen actief SEPA mandaat';
        } else {
            if (! filled($activeMandate->iban)) {
                $missing[] = 'IBAN debiteur ontbreekt';
            }
            if (! $activeMandate->datum_van_tekenen) {
                $missing[] = 'Machtigingsdatum ontbreekt';
            }
        }

        $kenmerk = $this->companyIncassoValue($company, 'incasso_kenmerk_machtiging');
        if (! filled($kenmerk)) {
            $missing[] = 'Kenmerk machtiging ontbreekt';
        }

        return [$missing === [], $missing];
    }

    /**
     * @return array{
     *   eligible: array<int, array{
     *      company_id:int,
     *      company_name:string,
     *      naam_debiteur:string,
     *      iban_debiteur:string,
     *      kenmerk_machtiging:string,
     *      bedrag:float,
     *      omschrijving:string,
     *      machtigingsdatum:string
     *   }>,
     *   missing: array<int, array{
     *      company_id:int,
     *      company_name:string,
     *      missing_fields:array<int,string>,
     *      url:string
     *   }>
     * }
     */
    private function incassoExportOverview(int $month, int $year): array
    {
        if (! $this->hasIncassoColumns()) {
            return [
                'eligible' => [],
                'missing' => [],
            ];
        }

        $companies = GarageCompany::query()
            ->where('status', GarageCompanyStatus::Actief->value)
            ->with([
                'mandates' => fn ($q) => $q->orderByDesc('created_at'),
                'modules',
            ])
            ->orderBy('bedrijfsnaam')
            ->get();

        $description = 'Kivii abonnement '.$this->dutchMonthName($month).' '.$year;

        $eligible = [];
        $missing = [];

        /** @var GarageCompany $company */
        foreach ($companies as $company) {
            $activeMandate = $company->mandates->first(
                fn (SepaMandate $mandate) => $mandate->status === SepaMandateStatus::Actief
            );
            [$isComplete, $missingFields] = $this->incassoCompleteness($company, $activeMandate);
            $incassoActiveFrom = $this->resolveIncassoActiveFrom($company, $activeMandate);
            $amountForMonth = $this->incassoAmountInclForMonth($company, $month, $year, $incassoActiveFrom);

            if ($amountForMonth <= 0) {
                $isComplete = false;
                $missingFields[] = 'Bedrag voor geselecteerde maand is 0 (of ongeldig)';
            }

            if (! $isComplete || ! $activeMandate) {
                $missing[] = [
                    'company_id' => $company->id,
                    'company_name' => (string) $company->bedrijfsnaam,
                    'missing_fields' => $missingFields,
                    'url' => route('crm.garage_companies.show', [
                        'garageCompany' => $company->id,
                        'tab' => 'incasso',
                    ]),
                ];
                continue;
            }

            $eligible[] = [
                'company_id' => $company->id,
                'company_name' => (string) $company->bedrijfsnaam,
                'naam_debiteur' => (string) $company->bedrijfsnaam,
                'iban_debiteur' => (string) $activeMandate->iban,
                'kenmerk_machtiging' => (string) $this->companyIncassoValue($company, 'incasso_kenmerk_machtiging'),
                'bedrag' => $amountForMonth,
                'omschrijving' => $description,
                'machtigingsdatum' => $activeMandate->datum_van_tekenen instanceof Carbon
                    ? $activeMandate->datum_van_tekenen->toDateString()
                    : (string) $activeMandate->datum_van_tekenen,
            ];
        }

        return [
            'eligible' => $eligible,
            'missing' => $missing,
        ];
    }

    private function incassoAmountInclForMonth(GarageCompany $company, int $month, int $year, ?Carbon $incassoActiveFrom = null): float
    {
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd = $monthStart->copy()->endOfMonth();

        $rows = $company->modules
            ->filter(function (GarageCompanyModule $row) use ($monthStart, $monthEnd) {
                if (! $row->actief) {
                    return false;
                }

                $start = $row->startdatum ? Carbon::parse($row->startdatum)->startOfDay() : null;
                $end = $row->einddatum ? Carbon::parse($row->einddatum)->endOfDay() : null;

                if ($start && $start->gt($monthEnd)) {
                    return false;
                }
                if ($end && $end->lt($monthStart)) {
                    return false;
                }

                return true;
            })
            ->values();

        $fullMonthIncl = 0.0;
        foreach ($rows as $row) {
            $aantal = GarageCompanyModule::hasAantalColumn() ? max(1, (int) ($row->aantal ?? 1)) : 1;
            $excl = max(0.0, (float) $row->prijs_maand_excl) * $aantal;
            $btwFactor = 1 + (max(0.0, (float) $row->btw_percentage) / 100);
            $fullMonthIncl += $excl * $btwFactor;
        }

        // Secondary fallback for historical exports:
        // if nothing matched the month range but there are active module rows, use those as monthly base.
        if ($fullMonthIncl <= 0) {
            $allActiveRows = $company->modules
                ->where('actief', true)
                ->values();

            foreach ($allActiveRows as $row) {
                $aantal = GarageCompanyModule::hasAantalColumn() ? max(1, (int) ($row->aantal ?? 1)) : 1;
                $excl = max(0.0, (float) $row->prijs_maand_excl) * $aantal;
                $btwFactor = 1 + (max(0.0, (float) $row->btw_percentage) / 100);
                $fullMonthIncl += $excl * $btwFactor;
            }
        }

        // Fallback: if module date windows cause 0 while the customer has a known active monthly total,
        // use that known total as base to prevent unintended exclusion from export.
        $knownMonthlyIncl = max(0.0, round((float) $company->active_mrr_incl, 2));
        if ($fullMonthIncl <= 0 && $knownMonthlyIncl > 0) {
            $fullMonthIncl = $knownMonthlyIncl;
        }

        return IncassoProrataCalculator::calculateForMonth($fullMonthIncl, $incassoActiveFrom, $month, $year);
    }

    private function resolveIncassoActiveFrom(GarageCompany $company, ?SepaMandate $activeMandate): ?Carbon
    {
        if ($company->actief_vanaf instanceof Carbon) {
            return $company->actief_vanaf->copy();
        }

        if ($activeMandate?->datum_van_tekenen instanceof Carbon) {
            return $activeMandate->datum_van_tekenen->copy();
        }

        return null;
    }

    private function excelDateSerial(string $date): int
    {
        $parsed = Carbon::parse($date)->startOfDay();
        $base = Carbon::create(1899, 12, 30, 0, 0, 0, $parsed->timezone)->startOfDay();

        return (int) $base->diffInDays($parsed, false);
    }

    private function dutchMonthName(int $month): string
    {
        return match ($month) {
            1 => 'januari',
            2 => 'februari',
            3 => 'maart',
            4 => 'april',
            5 => 'mei',
            6 => 'juni',
            7 => 'juli',
            8 => 'augustus',
            9 => 'september',
            10 => 'oktober',
            11 => 'november',
            12 => 'december',
            default => 'onbekend',
        };
    }

    private function hasIncassoColumns(): bool
    {
        $columns = $this->incassoColumns();

        return $columns['incasso_kenmerk_machtiging'];
    }

    private function hasIncassoUploadColumns(): bool
    {
        $columns = $this->incassoColumns();

        return $columns['incasso_formulier_path']
            && $columns['incasso_formulier_naam']
            && $columns['incasso_formulier_uploaded_at'];
    }

    /**
     * @return array{incasso_kenmerk_machtiging:bool,incasso_formulier_path:bool,incasso_formulier_naam:bool,incasso_formulier_uploaded_at:bool}
     */
    private function incassoColumns(): array
    {
        if (self::$incassoColumns !== null) {
            return self::$incassoColumns;
        }

        $table = 'garage_companies';
        self::$incassoColumns = [
            'incasso_kenmerk_machtiging' => Schema::hasColumn($table, 'incasso_kenmerk_machtiging'),
            'incasso_formulier_path' => Schema::hasColumn($table, 'incasso_formulier_path'),
            'incasso_formulier_naam' => Schema::hasColumn($table, 'incasso_formulier_naam'),
            'incasso_formulier_uploaded_at' => Schema::hasColumn($table, 'incasso_formulier_uploaded_at'),
        ];

        return self::$incassoColumns;
    }

    private function companyIncassoValue(GarageCompany $company, string $field): mixed
    {
        $columns = $this->incassoColumns();
        if (! ($columns[$field] ?? false)) {
            return null;
        }

        return $company->getAttribute($field);
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
        if ($company->status->value === GarageCompanyStatus::Proefperiode->value && ! $company->proefperiode_start) {
            $statusErrors[] = 'Status demo vereist proefperiode_start.';
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
