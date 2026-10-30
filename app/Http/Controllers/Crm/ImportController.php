<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\GarageCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Eenmalige klantimport (alleen admin). Gegevens worden geplakt als JSON en nooit in de repo bewaard.
 * Bestaande klanten worden nooit gewijzigd: dubbelen worden overgeslagen.
 * Er worden geen e-mails, meldingen, modules, mandaten, logins of seats aangemaakt.
 */
class ImportController extends Controller
{
    private const MAX_ROWS = 200;

    private const FIELDS = [
        'bedrijfsnaam', 'status', 'contact_voornaam', 'contact_achternaam', 'email', 'telefoon',
        'adres', 'postcode', 'plaats', 'kvk', 'btw', 'startdatum', 'notitie', 'bron',
    ];

    private const LEGAL_FORMS = ['bv', 'vof', 'nv', 'cv'];

    public function index(): Response
    {
        return Inertia::render('Crm/Import/Index', [
            'maxRows' => self::MAX_ROWS,
            'fields' => self::FIELDS,
            'urls' => [
                'preview' => route('crm.import.preview'),
                'store' => route('crm.import.store'),
            ],
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $parsed = $this->parseInput($request);
        if ($parsed instanceof JsonResponse) {
            return $parsed;
        }

        $results = array_map(fn (array $r) => $this->publicResult($r), $this->analyse($parsed));

        return response()->json(['results' => $results, 'summary' => $this->summary($results)]);
    }

    public function store(Request $request): JsonResponse
    {
        $parsed = $this->parseInput($request);
        if ($parsed instanceof JsonResponse) {
            return $parsed;
        }

        $results = [];
        foreach ($this->analyse($parsed) as $row) {
            if ($row['status'] !== 'nieuw') {
                $results[] = $this->publicResult($row);

                continue;
            }

            try {
                $company = DB::transaction(fn () => $this->createCustomer($row['data']));
                $row['status'] = 'geimporteerd';
                $row['link'] = [
                    'label' => $company->bedrijfsnaam,
                    'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id]),
                ];
            } catch (\Throwable $e) {
                Log::warning('Klantimport: rij mislukt', ['rij' => $row['index'] + 1, 'fout' => $e->getMessage()]);
                $row['status'] = 'fout';
                $row['messages'] = ['Opslaan mislukt. Er is niets aangemaakt voor deze rij.'];
            }

            $results[] = $this->publicResult($row);
        }

        return response()->json(['results' => $results, 'summary' => $this->summary($results)]);
    }

    /**
     * @return list<array<string, mixed>>|JsonResponse
     */
    private function parseInput(Request $request): array|JsonResponse
    {
        $request->validate([
            'json' => ['required', 'string', 'max:1000000'],
        ], [
            'json.required' => 'Plak eerst de JSON.',
            'json.max' => 'De JSON is te groot.',
        ]);

        $decoded = json_decode((string) $request->input('json'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->inputError('Ongeldige JSON: '.json_last_error_msg().'.');
        }
        if (! is_array($decoded) || ! array_is_list($decoded)) {
            return $this->inputError('De JSON moet een lijst (array) van objecten zijn, bijvoorbeeld [ { ... }, { ... } ].');
        }
        if ($decoded === []) {
            return $this->inputError('De lijst is leeg.');
        }
        if (count($decoded) > self::MAX_ROWS) {
            return $this->inputError('Maximaal '.self::MAX_ROWS.' rijen per import, je plakte er '.count($decoded).'.');
        }

        return $decoded;
    }

    private function inputError(string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'errors' => ['json' => [$message]]], 422);
    }

    /**
     * Valideer, normaliseer en controleer op dubbelen. Wijzigt niets in de database.
     *
     * @param  list<mixed>  $rows
     * @return list<array<string, mixed>>
     */
    private function analyse(array $rows): array
    {
        $index = $this->existingIndex();
        $seen = ['naam' => [], 'email' => [], 'kvk' => []];
        $results = [];

        foreach ($rows as $i => $raw) {
            $result = [
                'index' => $i,
                'bedrijfsnaam' => is_array($raw) && is_scalar($raw['bedrijfsnaam'] ?? null) ? trim((string) $raw['bedrijfsnaam']) : '',
                'status' => 'nieuw',
                'messages' => [],
                'link' => null,
                'data' => null,
            ];

            [$data, $errors] = $this->normalizeRow($raw);
            if ($errors !== []) {
                $result['status'] = 'fout';
                $result['messages'] = $errors;
                $results[] = $result;

                continue;
            }

            $result['bedrijfsnaam'] = $data['bedrijfsnaam'];
            $naamKey = $this->normalizeName($data['bedrijfsnaam']);
            $kvkKey = $this->normalizeKvk($data['kvk']);
            $emailKey = $data['email'];

            // Dubbel met een bestaande klant (ook in de prullenbak)?
            $match = null;
            $reden = null;
            if ($naamKey !== '' && isset($index['naam'][$naamKey])) {
                [$match, $reden] = [$index['naam'][$naamKey], 'bedrijfsnaam'];
            } elseif ($emailKey !== null && isset($index['email'][$emailKey])) {
                [$match, $reden] = [$index['email'][$emailKey], 'e-mail'];
            } elseif ($kvkKey !== '' && isset($index['kvk'][$kvkKey])) {
                [$match, $reden] = [$index['kvk'][$kvkKey], 'KVK'];
            }

            if ($match) {
                $trashed = $match['trashed'];
                $result['status'] = 'overgeslagen';
                $result['messages'] = ['Bestaat al (zelfde '.$reden.')'.($trashed ? ', in prullenbak' : '').'.'];
                $result['link'] = [
                    'label' => $match['bedrijfsnaam'].($trashed ? ' (prullenbak)' : ''),
                    'url' => $trashed
                        ? route('crm.garage_companies.index', ['view' => 'prullenbak', 'search' => $match['bedrijfsnaam']])
                        : route('crm.garage_companies.show', ['garageCompany' => $match['id']]),
                ];
                $results[] = $result;

                continue;
            }

            // Dubbel binnen de geplakte lijst zelf?
            $dubbel = null;
            if ($naamKey !== '' && isset($seen['naam'][$naamKey])) {
                $dubbel = [$seen['naam'][$naamKey], 'bedrijfsnaam'];
            } elseif ($emailKey !== null && isset($seen['email'][$emailKey])) {
                $dubbel = [$seen['email'][$emailKey], 'e-mail'];
            } elseif ($kvkKey !== '' && isset($seen['kvk'][$kvkKey])) {
                $dubbel = [$seen['kvk'][$kvkKey], 'KVK'];
            }
            if ($dubbel) {
                $result['status'] = 'overgeslagen';
                $result['messages'] = ['Dubbel in de lijst: zelfde '.$dubbel[1].' als rij '.($dubbel[0] + 1).'.'];
                $results[] = $result;

                continue;
            }

            if ($naamKey !== '') {
                $seen['naam'][$naamKey] = $i;
            }
            if ($emailKey !== null) {
                $seen['email'][$emailKey] = $i;
            }
            if ($kvkKey !== '') {
                $seen['kvk'][$kvkKey] = $i;
            }

            $result['data'] = $data;
            $results[] = $result;
        }

        return $results;
    }

    /**
     * @return array{0: array<string, mixed>|null, 1: list<string>}
     */
    private function normalizeRow(mixed $raw): array
    {
        if (! is_array($raw) || ($raw !== [] && array_is_list($raw))) {
            return [null, ['Deze rij is geen object met velden.']];
        }

        $errors = [];
        $unknown = array_diff(array_keys($raw), self::FIELDS);
        if ($unknown !== []) {
            $errors[] = 'Onbekend veld: '.implode(', ', $unknown).'.';
        }

        $values = [];
        foreach (self::FIELDS as $field) {
            $value = $raw[$field] ?? null;
            if ($value !== null && ! is_scalar($value)) {
                $errors[] = "Veld {$field} moet tekst zijn.";
                $value = null;
            }
            $value = $value === null || is_bool($value) ? null : trim(preg_replace('/\s+/u', ' ', (string) $value) ?? (string) $value);
            $values[$field] = $value === '' ? null : $value;
        }

        if ($values['email'] !== null) {
            $values['email'] = mb_strtolower($values['email']);
        }
        if ($values['postcode'] !== null) {
            $pc = mb_strtoupper($values['postcode']);
            $values['postcode'] = preg_match('/^(\d{4})\s*([A-Z]{2})$/', $pc, $m) ? $m[1].' '.$m[2] : $pc;
        }
        if ($values['kvk'] !== null) {
            $values['kvk'] = str_replace(' ', '', $values['kvk']);
        }
        if ($values['btw'] !== null) {
            $values['btw'] = mb_strtoupper(str_replace([' ', '.'], '', $values['btw']));
        }

        $rawStatus = $values['status'];
        $values['status'] = $rawStatus !== null ? $this->mapStatus($rawStatus) : null;

        $validator = Validator::make($values, [
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(GarageCompanyStatus::selectableValues())],
            'contact_voornaam' => ['nullable', 'string', 'max:255'],
            'contact_achternaam' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'adres' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'plaats' => ['nullable', 'string', 'max:255'],
            'kvk' => ['nullable', 'string', 'max:50'],
            'btw' => ['nullable', 'string', 'max:50'],
            'startdatum' => ['nullable', 'string'],
            'notitie' => ['nullable', 'string', 'max:5000'],
            'bron' => ['nullable', 'string', 'max:100'],
        ], [
            'bedrijfsnaam.required' => 'Bedrijfsnaam ontbreekt.',
            'status.required' => 'Status ontbreekt.',
            'status.in' => 'Onbekende status "'.($rawStatus ?? '').'". Gebruik actief, proefperiode, demo_aangevraagd, opgezegd of verloren.',
            'email.email' => 'E-mailadres is ongeldig.',
            '*.max' => 'Veld :attribute is te lang (max :max tekens).',
        ]);
        foreach ($validator->errors()->all() as $message) {
            $errors[] = $message;
        }

        $start = null;
        if ($values['startdatum'] !== null) {
            $start = $this->parseDate($values['startdatum']);
            if (! $start) {
                $errors[] = 'Startdatum moet de vorm JJJJ-MM-DD of JJJJ-MM-DD UU:MM:SS hebben.';
            }
        }

        if ($errors !== []) {
            return [null, array_values(array_unique($errors))];
        }

        $values['bron_label'] = $values['bron'] ?? 'import';
        $values['startdatum'] = $start?->format('Y-m-d H:i:s');

        return [$values, []];
    }

    private function mapStatus(string $value): ?string
    {
        $key = str_replace([' ', '-'], '_', mb_strtolower(trim($value)));

        return match ($key) {
            'actief', 'active' => GarageCompanyStatus::Actief->value,
            'proefperiode', 'demo', 'demo_gepland', 'trial' => GarageCompanyStatus::Proefperiode->value,
            'demo_aangevraagd', 'lead' => GarageCompanyStatus::DemoAangevraagd->value,
            'gepauzeerd', 'pauze', 'paused' => GarageCompanyStatus::Gepauzeerd->value,
            'opgezegd' => GarageCompanyStatus::Opgezegd->value,
            'verloren' => GarageCompanyStatus::Verloren->value,
            default => $key,
        };
    }

    private function parseDate(string $value): ?Carbon
    {
        foreach (['Y-m-d H:i:s', 'Y-m-d'] as $format) {
            $date = \DateTime::createFromFormat('!'.$format, $value);
            $errors = \DateTime::getLastErrors();
            if ($date && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))) {
                return Carbon::instance($date);
            }
        }

        return null;
    }

    private function normalizeName(string $name): string
    {
        $name = mb_strtolower($name);
        $name = str_replace('.', '', $name);
        $name = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $name) ?? $name;
        $tokens = array_filter(explode(' ', trim($name)), fn ($t) => $t !== '' && ! in_array($t, self::LEGAL_FORMS, true));
        $normalized = implode(' ', $tokens);

        return $normalized !== '' ? $normalized : trim($name);
    }

    private function normalizeKvk(?string $kvk): string
    {
        $digits = preg_replace('/\D+/', '', (string) $kvk) ?? '';

        return mb_strlen($digits) >= 6 ? $digits : '';
    }

    /**
     * Index van alle bestaande klanten (ook prullenbak) op genormaliseerde naam, e-mail en KVK.
     *
     * @return array{naam: array<string, array>, email: array<string, array>, kvk: array<string, array>}
     */
    private function existingIndex(): array
    {
        $hasTrash = GarageCompany::hasTrashColumn();
        $columns = ['id', 'bedrijfsnaam', 'hoofd_email', 'kvk_nummer'];
        if ($hasTrash) {
            $columns[] = 'deleted_at';
        }

        $index = ['naam' => [], 'email' => [], 'kvk' => []];
        $byId = [];

        GarageCompany::query()->withDeleted()->select($columns)->orderBy('id')->chunk(500, function ($companies) use (&$index, &$byId, $hasTrash) {
            foreach ($companies as $company) {
                $info = [
                    'id' => $company->id,
                    'bedrijfsnaam' => (string) $company->bedrijfsnaam,
                    'trashed' => $hasTrash && $company->deleted_at !== null,
                ];
                $byId[$company->id] = $info;

                $naam = $this->normalizeName((string) $company->bedrijfsnaam);
                if ($naam !== '') {
                    $index['naam'][$naam] ??= $info;
                }
                $email = mb_strtolower(trim((string) $company->hoofd_email));
                if ($email !== '') {
                    $index['email'][$email] ??= $info;
                }
                $kvk = $this->normalizeKvk($company->kvk_nummer);
                if ($kvk !== '') {
                    $index['kvk'][$kvk] ??= $info;
                }
            }
        });

        CustomerPerson::query()->select(['id', 'garage_company_id', 'email'])->orderBy('id')->chunk(1000, function ($persons) use (&$index, $byId) {
            foreach ($persons as $person) {
                $email = mb_strtolower(trim((string) $person->email));
                if ($email !== '' && isset($byId[$person->garage_company_id])) {
                    $index['email'][$email] ??= $byId[$person->garage_company_id];
                }
            }
        });

        return $index;
    }

    /**
     * Maakt alleen de klant, optioneel een hoofdcontact en een tijdlijnnotitie aan.
     * Bewust geen modules, mandaten, logins, seats of welkomstmail (concept).
     *
     * @param  array<string, mixed>  $data
     */
    private function createCustomer(array $data): GarageCompany
    {
        $status = $data['status'];
        $start = $data['startdatum'] ? Carbon::parse($data['startdatum']) : null;
        $bron = in_array($data['bron'], array_map(fn ($c) => $c->value, GarageCompanySource::cases()), true)
            ? $data['bron']
            : GarageCompanySource::Anders->value;

        $companyData = [
            'bedrijfsnaam' => $data['bedrijfsnaam'],
            'kvk_nummer' => $data['kvk'],
            'btw_nummer' => $data['btw'],
            'adres_straat_nummer' => $data['adres'],
            'postcode' => $data['postcode'],
            // plaats, hoofd_email en hoofd_telefoon zijn NOT NULL: lege tekst, net als bij een lead in store().
            'plaats' => $data['plaats'] ?? '',
            'land' => 'Nederland',
            'hoofd_email' => $data['email'] ?? '',
            'hoofd_telefoon' => $data['telefoon'] ?? '',
            'status' => $status,
            'bron' => $bron,
            'tags' => 'import',
            'demo_aangevraagd_op' => null,
            'demo_duur_dagen' => null,
            'demo_eind_op' => null,
            'proefperiode_start' => null,
            'actief_vanaf' => null,
            'opgezegd_op' => null,
            'verloren_op' => null,
            'created_by' => auth()->id(),
        ];

        match ($status) {
            GarageCompanyStatus::Actief->value => $companyData['actief_vanaf'] = $start,
            GarageCompanyStatus::DemoAangevraagd->value => $companyData['demo_aangevraagd_op'] = $start ?? now(),
            GarageCompanyStatus::Opgezegd->value => $companyData['opgezegd_op'] = $start,
            GarageCompanyStatus::Verloren->value => $companyData['verloren_op'] = $start,
            default => null,
        };

        if ($status === GarageCompanyStatus::Gepauzeerd->value && GarageCompany::hasPauseColumns()) {
            $companyData['gepauzeerd_op'] = ($start ?? now())->toDateString();
        }

        if ($status === GarageCompanyStatus::Proefperiode->value) {
            $proefStart = $start ?? now();
            $companyData['proefperiode_start'] = $proefStart;
            $companyData['demo_duur_dagen'] = GarageCompany::DEFAULT_DEMO_DAYS;
            $companyData['demo_eind_op'] = $proefStart->copy()->startOfDay()->addDays(GarageCompany::DEFAULT_DEMO_DAYS);
        }

        $company = GarageCompany::create($companyData);

        if ($data['contact_voornaam'] !== null || $data['contact_achternaam'] !== null || $data['email'] !== null) {
            $voornaam = $data['contact_voornaam'];
            $achternaam = $data['contact_achternaam'];
            if ($voornaam !== null && $achternaam === null && str_contains($voornaam, ' ')) {
                $parts = explode(' ', $voornaam);
                $achternaam = array_pop($parts);
                $voornaam = implode(' ', $parts);
            }

            CustomerPerson::create([
                'garage_company_id' => $company->id,
                'voornaam' => $voornaam ?? '-',
                'achternaam' => $achternaam ?? '-',
                'email' => $data['email'] ?? '',
                'telefoon' => $data['telefoon'],
                'rol' => 'eigenaar',
                'is_primary' => true,
                'active' => true,
            ]);
        }

        $inhoud = 'Geimporteerd door '.(auth()->user()->name ?? 'onbekend').'. Bron: '.$data['bron_label'].'.';
        if ($data['notitie'] !== null) {
            $inhoud .= "\n\n".$data['notitie'];
        }

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Notitie,
            'titel' => 'Geimporteerd',
            'inhoud' => $inhoud,
            'created_by' => auth()->id(),
        ]);

        return $company;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function publicResult(array $row): array
    {
        return [
            'rij' => $row['index'] + 1,
            'bedrijfsnaam' => $row['bedrijfsnaam'],
            'status' => $row['status'],
            'messages' => $row['messages'],
            'link' => $row['link'],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $results
     * @return array<string, int>
     */
    private function summary(array $results): array
    {
        $summary = ['nieuw' => 0, 'geimporteerd' => 0, 'overgeslagen' => 0, 'fout' => 0];
        foreach ($results as $r) {
            $summary[$r['status']]++;
        }

        return $summary;
    }
}
