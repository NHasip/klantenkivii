<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Enums\SepaMandateStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\GarageCompany;
use App\Models\GarageCompanyModule;
use App\Models\SepaMandate;
use App\Services\Sepa\SepaTools;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SEPA-machtigingen importeren (alleen admin). De gebruiker plakt rijen uit Excel en importeert zelf.
 * Bankgegevens worden nooit gelogd en nooit volledig teruggestuurd (IBAN altijd gemaskeerd).
 * Alleen een nieuw mandaat + kenmerk machtiging + tijdlijnnotitie; modules, prijzen, status en
 * overige klantgegevens blijven ongewijzigd en er worden geen e-mails verstuurd.
 */
class SepaImportController extends Controller
{
    private const MAX_ROWS = 200;

    private const FUZZY_THRESHOLD = 0.8;

    /** Vaste aliassen: genormaliseerde naam zonder spaties => mogelijke doelnamen (idem genormaliseerd). */
    private const ALIASES = [
        '4x4camperverhuur' => ['dreamcampers', 'dreamcamper'],
    ];

    public function index(): Response
    {
        $labels = GarageCompanyStatus::labelMap();

        $customers = GarageCompany::query()
            ->orderBy('bedrijfsnaam')
            ->get(['id', 'bedrijfsnaam', 'status'])
            ->map(fn (GarageCompany $c) => [
                'id' => $c->id,
                'naam' => (string) $c->bedrijfsnaam,
                'status' => $labels[$c->status?->value] ?? (string) $c->status?->value,
            ])
            ->values();

        return Inertia::render('Crm/SepaImport/Index', [
            'maxRows' => self::MAX_ROWS,
            'customers' => $customers,
            'urls' => [
                'preview' => route('crm.sepa_import.preview'),
                'store' => route('crm.sepa_import.store'),
            ],
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $rows = $this->parseInput($request);
        if ($rows instanceof JsonResponse) {
            return $rows;
        }

        $companies = $this->loadCompanies();
        $index = $this->nameIndex($companies);

        $results = [];
        foreach ($rows as $row) {
            [$match, $candidates, $certain] = $this->matchCustomer($row['klantnaam'], $index);
            $messages = $row['errors'];
            $warnings = $row['warnings'];
            if ($match && ! $certain) {
                $warnings[] = 'Klant gevonden via gelijkenis ('.round($match['score'] * 100).'%). Controleer de keuze.';
            }

            $results[] = [
                'rij' => $row['rij'],
                'klantnaam' => $row['klantnaam'],
                'iban' => self::maskIban($row['iban']),
                'kenmerk' => $row['kenmerk'],
                'bedrag' => $row['bedrag'],
                'bedrag_raw' => $row['bedrag_raw'],
                'omschrijving' => $row['omschrijving'],
                'machtigingsdatum' => $row['datum']?->toDateString(),
                'status' => $messages !== [] ? 'fout' : ($match ? 'match' : 'geen_match'),
                'zeker' => $match !== null && $certain,
                'match' => $match ? ['id' => $match['id'], 'score' => $match['score']] : null,
                'candidates' => $match && $certain ? [] : $candidates,
                'messages' => $messages,
                'warnings' => $warnings,
            ];
        }

        return response()->json([
            'results' => $results,
            'customers' => $this->customerInfo($companies),
            'summary' => $this->countBy($results),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $rows = $this->parseInput($request);
        if ($rows instanceof JsonResponse) {
            return $rows;
        }

        $request->validate([
            'choices' => ['present', 'array', 'max:'.self::MAX_ROWS],
            'choices.*.rij' => ['required', 'integer', 'min:1'],
            'choices.*.customer_id' => ['nullable', 'integer'],
            'choices.*.replace' => ['nullable', 'boolean'],
        ]);

        $choices = collect($request->input('choices', []))->keyBy(fn ($c) => (int) $c['rij']);
        $hasKenmerkColumn = Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging');
        $usedCustomers = [];
        $results = [];

        foreach ($rows as $row) {
            $base = [
                'rij' => $row['rij'],
                'klantnaam' => $row['klantnaam'],
                'iban' => self::maskIban($row['iban']),
                'kenmerk' => $row['kenmerk'],
                'klant' => null,
                'messages' => [],
            ];

            $choice = $choices->get($row['rij']);
            $customerId = isset($choice['customer_id']) ? (int) $choice['customer_id'] : 0;
            $replace = (bool) ($choice['replace'] ?? false);

            if ($customerId <= 0) {
                $results[] = [...$base, 'status' => 'overgeslagen', 'messages' => ['Overgeslagen door keuze.']];

                continue;
            }
            if ($row['errors'] !== []) {
                $results[] = [...$base, 'status' => 'fout', 'messages' => $row['errors']];

                continue;
            }

            $company = GarageCompany::query()->find($customerId);
            if (! $company) {
                $results[] = [...$base, 'status' => 'fout', 'messages' => ['Gekozen klant bestaat niet (meer).']];

                continue;
            }
            $base['klant'] = [
                'id' => $company->id,
                'naam' => (string) $company->bedrijfsnaam,
                'url' => route('crm.garage_companies.show', ['garageCompany' => $company->id, 'tab' => 'incasso']),
            ];

            if (isset($usedCustomers[$company->id])) {
                $results[] = [...$base, 'status' => 'fout', 'messages' => ['Deze klant is al gekozen in rij '.$usedCustomers[$company->id].'.']];

                continue;
            }
            $usedCustomers[$company->id] = $row['rij'];

            $hasActive = SepaMandate::query()
                ->where('garage_company_id', $company->id)
                ->where('status', SepaMandateStatus::Actief)
                ->exists();
            if ($hasActive && ! $replace) {
                $results[] = [...$base, 'status' => 'overgeslagen', 'messages' => ['Klant heeft al een actief mandaat (niet vervangen).']];

                continue;
            }

            try {
                $mandate = DB::transaction(fn () => $this->createMandate($company, $row, $replace && $hasActive, $hasKenmerkColumn));
                $results[] = [...$base, 'status' => 'opgeslagen', 'messages' => [
                    'Mandaat '.$mandate->mandaat_id.' aangemaakt.'.($replace && $hasActive ? ' Vorig actief mandaat ingetrokken.' : ''),
                ]];
            } catch (\Throwable $e) {
                // Bewust geen exception-bericht loggen: daar kunnen query-bindings (IBAN) in staan.
                Log::warning('SEPA-import: rij mislukt', ['rij' => $row['rij'], 'fout' => get_class($e)]);
                $results[] = [...$base, 'status' => 'fout', 'messages' => ['Opslaan mislukt. Er is niets gewijzigd voor deze rij.']];
            }
        }

        return response()->json(['results' => $results, 'summary' => $this->countBy($results)]);
    }

    private function createMandate(GarageCompany $company, array $row, bool $revokeExisting, bool $hasKenmerkColumn): SepaMandate
    {
        if ($revokeExisting) {
            SepaMandate::query()
                ->where('garage_company_id', $company->id)
                ->where('status', SepaMandateStatus::Actief)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);
        }

        $person = $company->primaryPerson()->first() ?? $company->customerPersons()->orderBy('id')->first();
        $personName = $person ? trim(((string) $person->voornaam).' '.((string) $person->achternaam)) : '';

        $mandaatId = SepaTools::generateMandaatId($company->id);

        $mandate = SepaMandate::create([
            'garage_company_id' => $company->id,
            'bedrijfsnaam' => (string) $company->bedrijfsnaam,
            'voor_en_achternaam' => $personName !== '' ? $personName : (string) $company->bedrijfsnaam,
            'straatnaam_en_nummer' => (string) ($company->adres_straat_nummer ?? ''),
            'postcode' => (string) ($company->postcode ?? ''),
            'plaats' => (string) ($company->plaats ?? ''),
            'land' => filled($company->land) ? (string) $company->land : 'Nederland',
            'iban' => $row['iban'],
            'bic' => null,
            'email' => (string) ($person?->email ?: ($company->hoofd_email ?? '')),
            'telefoonnummer' => (string) ($person?->telefoon ?: ($company->hoofd_telefoon ?? '')),
            'plaats_van_tekenen' => (string) ($company->plaats ?? ''),
            'datum_van_tekenen' => $row['datum']->toDateString(),
            'akkoord_checkbox' => false,
            'mandaat_id' => $mandaatId,
            'status' => SepaMandateStatus::Actief->value,
            'ontvangen_op' => now(),
        ]);

        if ($hasKenmerkColumn) {
            DB::table('garage_companies')->where('id', $company->id)->update([
                'incasso_kenmerk_machtiging' => $row['kenmerk'],
                'updated_at' => now(),
            ]);
        }

        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Mandate,
            'titel' => 'SEPA-machtiging geimporteerd',
            'inhoud' => 'Mandaat '.$mandaatId.' via SEPA-import, IBAN eindigend op '.substr($row['iban'], -4)
                .', kenmerk '.$row['kenmerk'].', machtigingsdatum '.$row['datum']->format('d-m-Y').'.'
                .($revokeExisting ? ' Vorig actief mandaat ingetrokken.' : ''),
            'created_by' => auth()->id(),
        ]);

        return $mandate;
    }

    /**
     * @return list<array<string, mixed>>|JsonResponse
     */
    private function parseInput(Request $request): array|JsonResponse
    {
        $request->validate([
            'tekst' => ['required', 'string', 'max:500000'],
        ], [
            'tekst.required' => 'Plak eerst de rijen uit Excel.',
            'tekst.max' => 'De geplakte tekst is te groot.',
        ]);

        $lines = preg_split('/\r\n|\r|\n/', (string) $request->input('tekst')) ?: [];
        $rows = [];
        $rij = 0;
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $cols = $this->splitLine($line);
            if ($rows === [] && $rij === 0 && preg_match('/iban/i', $cols[1] ?? '')) {
                continue; // kopregel
            }
            $rij++;
            $rows[] = $this->normalizeRow($rij, $cols);
        }

        if ($rows === []) {
            return $this->inputError('Er zijn geen rijen gevonden.');
        }
        if (count($rows) > self::MAX_ROWS) {
            return $this->inputError('Maximaal '.self::MAX_ROWS.' rijen per import, je plakte er '.count($rows).'.');
        }

        return $rows;
    }

    /** @return list<string> */
    private function splitLine(string $line): array
    {
        $line = str_replace("\u{00A0}", ' ', $line);
        if (str_contains($line, "\t")) {
            $parts = explode("\t", $line);
        } elseif (str_contains($line, ';')) {
            $parts = explode(';', $line);
        } else {
            $parts = preg_split('/\s{2,}/', trim($line)) ?: [];
        }

        return array_map(fn ($p) => trim((string) $p, " \t\"'"), $parts);
    }

    private function normalizeRow(int $rij, array $cols): array
    {
        $cols = array_pad($cols, 6, '');
        [$naam, $ibanRaw, $kenmerk, $bedragRaw, $omschrijving, $datumRaw] = array_slice($cols, 0, 6);
        $errors = [];
        $warnings = [];

        if (count(array_filter($cols, fn ($c) => $c !== '')) < 4) {
            $errors[] = 'Te weinig kolommen. Verwacht: klantnaam, IBAN, kenmerk, bedrag, omschrijving, machtigingsdatum.';
        }
        if ($naam === '') {
            $errors[] = 'Klantnaam ontbreekt.';
        }

        $iban = self::normalizeIban($ibanRaw);
        if ($iban === '') {
            $errors[] = 'IBAN ontbreekt.';
        } elseif (! self::validIban($iban)) {
            $errors[] = 'IBAN is ongeldig (controlegetal of lengte klopt niet).';
        }

        if ($kenmerkError = SepaTools::kenmerkError($kenmerk)) {
            $errors[] = $kenmerkError;
        }

        $datum = $this->parseDate($datumRaw);
        if ($datumRaw === '') {
            $errors[] = 'Machtigingsdatum ontbreekt.';
        } elseif (! $datum) {
            $errors[] = 'Machtigingsdatum is ongeldig (gebruik dd/mm/jjjj of jjjj-mm-dd).';
        } elseif ($datum->gt(now()->startOfDay())) {
            $errors[] = 'Machtigingsdatum ligt in de toekomst.';
        }

        $bedrag = $this->parseAmount($bedragRaw);
        if ($bedragRaw !== '' && $bedrag === null) {
            $warnings[] = 'Bedrag kon niet gelezen worden (alleen ter vergelijking, wordt niet opgeslagen).';
        }

        return [
            'rij' => $rij,
            'klantnaam' => mb_substr($naam, 0, 255),
            'iban' => $iban,
            'kenmerk' => $kenmerk,
            'bedrag' => $bedrag,
            'bedrag_raw' => mb_substr($bedragRaw, 0, 50),
            'omschrijving' => mb_substr($omschrijving, 0, 255),
            'datum' => $datum,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    private function parseDate(string $value): ?Carbon
    {
        $value = trim($value);
        if (preg_match('~^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$~', $value, $m)) {
            [$d, $mo, $y] = [(int) $m[1], (int) $m[2], (int) $m[3]];
        } elseif (preg_match('~^(\d{4})-(\d{1,2})-(\d{1,2})$~', $value, $m)) {
            [$y, $mo, $d] = [(int) $m[1], (int) $m[2], (int) $m[3]];
        } else {
            return null;
        }

        return checkdate($mo, $d, $y) ? Carbon::create($y, $mo, $d)->startOfDay() : null;
    }

    private function parseAmount(string $value): ?float
    {
        $v = preg_replace('/[€\s]|EUR/iu', '', $value) ?? '';
        if ($v === '') {
            return null;
        }
        if (str_contains($v, ',')) {
            $v = str_replace(['.', ','], ['', '.'], $v);
        }

        return is_numeric($v) ? round((float) $v, 2) : null;
    }

    public static function normalizeIban(string $iban): string
    {
        return SepaTools::normalizeIban($iban);
    }

    public static function validIban(string $iban): bool
    {
        return SepaTools::validIban($iban);
    }

    public static function maskIban(string $iban): string
    {
        return SepaTools::maskIban($iban);
    }

    public static function normalizeName(string $name): string
    {
        return SepaTools::normalizeName($name);
    }

    private function loadCompanies(): Collection
    {
        $columns = ['id', 'bedrijfsnaam', 'status', 'actief_vanaf'];
        if (Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging')) {
            $columns[] = 'incasso_kenmerk_machtiging';
        }

        return GarageCompany::query()
            ->with(['modules', 'mandates' => fn ($q) => $q->select(['id', 'garage_company_id', 'status'])])
            ->orderBy('bedrijfsnaam')
            ->get($columns);
    }

    /** @return list<array{id:int, naam:string, compact:string}> */
    private function nameIndex(Collection $companies): array
    {
        return $companies->map(fn (GarageCompany $c) => [
            'id' => $c->id,
            'naam' => (string) $c->bedrijfsnaam,
            'compact' => str_replace(' ', '', self::normalizeName((string) $c->bedrijfsnaam)),
        ])->filter(fn ($c) => $c['compact'] !== '')->values()->all();
    }

    /**
     * Exact op genormaliseerde naam zonder spaties, daarna vaste aliassen, daarna fuzzy (similar_text/levenshtein).
     *
     * @return array{0: ?array{id:int, score:float}, 1: list<array{id:int, naam:string, score:float}>, 2: bool}
     */
    private function matchCustomer(string $naam, array $index): array
    {
        $compact = str_replace(' ', '', self::normalizeName($naam));
        if ($compact === '') {
            return [null, [], false];
        }

        $targets = self::ALIASES[$compact] ?? null;
        $scored = [];
        foreach ($index as $c) {
            if ($c['compact'] === $compact || ($targets && in_array($c['compact'], $targets, true))) {
                $score = 1.0;
            } else {
                similar_text($compact, $c['compact'], $pct);
                $max = max(strlen($compact), strlen($c['compact']));
                $lev = $max > 0 ? 1 - levenshtein($compact, $c['compact']) / $max : 0;
                $score = max($pct / 100, $lev);
            }
            $scored[] = ['id' => $c['id'], 'naam' => $c['naam'], 'score' => round($score, 3)];
        }
        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);
        $top = array_slice($scored, 0, 3);
        $best = $top[0] ?? null;

        if (! $best || $best['score'] < self::FUZZY_THRESHOLD) {
            return [null, $top, false];
        }

        $exactCount = count(array_filter($scored, fn ($s) => $s['score'] >= 1.0));
        $second = $top[1]['score'] ?? 0;
        $certain = $best['score'] >= 1.0
            ? $exactCount === 1
            : ($best['score'] >= 0.9 && $best['score'] - $second >= 0.05);

        return [['id' => $best['id'], 'score' => $best['score']], $top, $certain];
    }

    /** @return array<int, array{actief_mandaat:bool, kenmerk:?string, crm_bedrag:float}> */
    private function customerInfo(Collection $companies): array
    {
        $info = [];
        foreach ($companies as $company) {
            $info[$company->id] = [
                'actief_mandaat' => $company->mandates->contains(fn ($m) => $m->status === SepaMandateStatus::Actief),
                'kenmerk' => filled($company->getAttribute('incasso_kenmerk_machtiging'))
                    ? (string) $company->getAttribute('incasso_kenmerk_machtiging')
                    : null,
                'crm_bedrag' => round($this->monthlyAmountIncl($company), 2),
            ];
        }

        return $info;
    }

    /**
     * Volledig maandbedrag incl. btw voor de huidige maand, met dezelfde module-regels en fallbacks als de
     * incasso-export (zonder pro rata voor een startmaand).
     */
    private function monthlyAmountIncl(GarageCompany $company): float
    {
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();
        $hasAantal = GarageCompanyModule::hasAantalColumn();
        $sum = function ($rows) use ($hasAantal): float {
            $total = 0.0;
            foreach ($rows as $row) {
                $aantal = $hasAantal ? max(1, (int) ($row->aantal ?? 1)) : 1;
                $total += max(0.0, (float) $row->prijs_maand_excl) * $aantal * (1 + max(0.0, (float) $row->btw_percentage) / 100);
            }

            return $total;
        };

        $active = $company->modules->filter(fn ($m) => (bool) $m->actief);
        $inMonth = $active->filter(function ($m) use ($monthStart, $monthEnd) {
            $start = $m->startdatum ? Carbon::parse($m->startdatum)->startOfDay() : null;
            $end = $m->einddatum ? Carbon::parse($m->einddatum)->endOfDay() : null;

            return ! ($start && $start->gt($monthEnd)) && ! ($end && $end->lt($monthStart));
        });

        $total = $sum($inMonth);
        if ($total <= 0) {
            $total = $sum($active);
        }

        return $total;
    }

    private function countBy(array $results): array
    {
        $summary = [];
        foreach ($results as $r) {
            $summary[$r['status']] = ($summary[$r['status']] ?? 0) + 1;
        }

        return $summary;
    }

    private function inputError(string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'errors' => ['tekst' => [$message]]], 422);
    }
}
