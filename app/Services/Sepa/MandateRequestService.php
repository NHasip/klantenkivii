<?php

namespace App\Services\Sepa;

use App\Enums\ActivityType;
use App\Enums\SepaMandateStatus;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\EmailTemplate;
use App\Models\GarageCompany;
use App\Models\SepaMandate;
use App\Models\SepaMandateRequest;
use App\Models\User;
use App\Services\EmailTemplateRenderer;
use App\Services\Forms\FormPayloadNormalizer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Machtigingsverzoeken: aanmaken bij handmatig versturen, webhook-inzendingen opslaan en verwerken.
 * Bestaande mandaten worden nooit verwijderd (alleen ingetrokken). IBANs worden nooit gelogd.
 */
class MandateRequestService
{
    /** Formuliervelden op kivii.nl (id of label, genormaliseerd) => doelveld. */
    public const FIELD_ALIASES = [
        'ref' => ['ref', 'referentie', 'reference'],
        'kenmerk' => ['kenmerk', 'kenmerk_machtiging', 'mandaatkenmerk'],
        'bedrijfsnaam' => ['bedrijfsnaam', 'bedrijf', 'company', 'company_name', 'bedrijfsnaam_rekeninghouder'],
        'naam' => ['naam', 'voor_en_achternaam', 'voor_en_achter_naam', 'name', 'full_name', 'rekeninghouder', 'naam_rekeninghouder'],
        'adres' => ['adres', 'straat', 'straat_en_huisnummer', 'straatnaam_en_nummer', 'address'],
        'postcode' => ['postcode', 'zip', 'zipcode', 'postal_code'],
        'plaats' => ['plaats', 'woonplaats', 'city', 'vestigingsplaats'],
        'land' => ['land', 'country'],
        'iban' => ['iban', 'rekeningnummer', 'iban_rekeningnummer', 'bankrekeningnummer'],
        'bic' => ['bic', 'bic_optioneel', 'bic_code'],
        'email' => ['email', 'e_mailadres', 'emailadres', 'e_mail', 'mail'],
        'telefoon' => ['telefoon', 'telefoonnummer', 'phone', 'tel', 'mobiel'],
        'plaats_van_tekenen' => ['plaats_van_tekenen', 'ondertekend_te', 'plaats_ondertekening'],
        'datum_van_tekenen' => ['datum_van_tekenen', 'datum', 'datum_ondertekening', 'date'],
        'akkoord' => ['akkoord', 'consent', 'toestemming', 'machtiging', 'acceptance', 'ik_machtig_kivii'],
    ];

    public static function available(): bool
    {
        return Schema::hasTable('sepa_mandate_requests');
    }

    public static function validDays(): int
    {
        return max(1, (int) config('crm.mandate_valid_days', 30));
    }

    /** Nieuw verzoek aanmaken (alleen bij een expliciete klik van de beheerder). */
    public function create(GarageCompany $company, ?int $userId, string $via, ?string $email): SepaMandateRequest
    {
        do {
            $ref = Str::random(48);
        } while (SepaMandateRequest::query()->where('ref_token', $ref)->exists());

        return SepaMandateRequest::create([
            'garage_company_id' => $company->id,
            'ref_token' => $ref,
            'kenmerk' => SepaTools::generateKenmerk(),
            'status' => SepaMandateRequest::STATUS_OPEN,
            'expires_at' => now()->addDays(self::validDays())->endOfDay(),
            'recipient_email' => $email,
            'sent_at' => now(),
            'sent_by' => $userId,
            'sent_via' => $via,
        ]);
    }

    public function link(SepaMandateRequest $request): string
    {
        $company = $request->garageCompany;

        return EmailTemplateRenderer::mandateLink((string) $request->ref_token, (string) $request->kenmerk, (string) ($company?->bedrijfsnaam ?? ''));
    }

    /** @return array<string, string> */
    public function templateData(GarageCompany $company, SepaMandateRequest $request): array
    {
        $company->loadMissing('primaryPerson');
        $primary = $company->primaryPerson;
        $naam = $primary ? trim("{$primary->voornaam} {$primary->achternaam}") : '';

        return [
            'naam' => $naam !== '' ? $naam : (string) $company->bedrijfsnaam,
            'bedrijfsnaam' => (string) $company->bedrijfsnaam,
            'machtigingslink' => $this->link($request),
            'kenmerk' => (string) $request->kenmerk,
            'geldig_tot' => $request->expires_at?->format('d-m-Y') ?? '',
            'weblink' => 'https://web.kivii.nl/',
        ];
    }

    /**
     * Template renderen. $templateId null = ingebouwde standaardtekst "SEPA-machtiging".
     *
     * @return array{subject:string, html:string, text:string}
     */
    public function render(GarageCompany $company, SepaMandateRequest $request, ?int $templateId): array
    {
        $template = $templateId ? EmailTemplate::query()->find($templateId) : null;
        $default = EmailTemplateRenderer::defaultMandateTemplate();
        $subject = $template ? (string) $template->subject : $default['subject'];
        $html = $template ? (string) ($template->body_html ?? '') : $default['body_html'];

        $data = $this->templateData($company, $request);
        $escaped = array_map(fn ($v) => e($v), $data);
        $renderedHtml = EmailTemplateRenderer::renderString($html, $escaped);

        return [
            'subject' => EmailTemplateRenderer::renderString($subject, $data),
            'html' => $renderedHtml,
            'text' => self::htmlToText(EmailTemplateRenderer::renderString($html, $data)),
        ];
    }

    public static function htmlToText(string $html): string
    {
        // Links leesbaar houden in platte tekst (mailto / Outlook).
        $text = preg_replace_callback('~<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>~is', function ($m) {
            $label = trim(strip_tags($m[2]));
            $href = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');

            return $label !== '' && $label !== $href ? $label.': '.$href : $href;
        }, $html) ?? $html;
        $text = preg_replace('/<br\s*\/?>/i', "\n", $text) ?? $text;
        $text = preg_replace('/<\/p>\s*<p[^>]*>/i', "\n\n", $text) ?? $text;
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }

    // ------------------------------------------------------------------
    // Webhook
    // ------------------------------------------------------------------

    /**
     * Inzending van het formulier op kivii.nl opslaan en (indien mogelijk) direct verwerken.
     *
     * @return array{request: SepaMandateRequest, reason: string}
     */
    public function ingest(array $input): array
    {
        $fields = FormPayloadNormalizer::map(FormPayloadNormalizer::flatten($input), self::FIELD_ALIASES);
        $fields = array_map(fn ($v) => is_string($v) ? mb_substr(trim($v), 0, 255) : $v, $fields);

        $ibanRaw = (string) ($fields['iban'] ?? '');
        unset($fields['iban']);
        $iban = SepaTools::normalizeIban($ibanRaw);
        $payload = $fields + ['iban_laatste4' => SepaTools::lastFour($iban), 'ontvangen_op' => now()->toIso8601String()];

        $ref = (string) ($fields['ref'] ?? '');
        $formKenmerk = strtoupper((string) ($fields['kenmerk'] ?? ''));
        $note = null;

        return DB::transaction(function () use ($ref, $formKenmerk, $iban, $payload, $fields, &$note) {
            $request = null;

            if ($ref !== '') {
                $byRef = SepaMandateRequest::query()->where('ref_token', $ref)->lockForUpdate()->first();
                if ($byRef && $byRef->status === SepaMandateRequest::STATUS_OPEN && ! $byRef->isExpired()) {
                    $request = $byRef;
                } elseif ($byRef) {
                    $note = $byRef->isExpired() || $byRef->status === SepaMandateRequest::STATUS_VERLOPEN
                        ? 'Link was verlopen ('.$byRef->kenmerk.').'
                        : 'Verzoek '.$byRef->kenmerk.' had status '.$byRef->status.'.';
                    if ($byRef->status === SepaMandateRequest::STATUS_VERWERKT) {
                        $note = 'Dubbele inzending: verzoek '.$byRef->kenmerk.' is al verwerkt.';
                    }
                }
            }

            if ($request) {
                $request->fill([
                    'status' => SepaMandateRequest::STATUS_ONTVANGEN,
                    'completed_at' => now(),
                    'iban' => $iban !== '' ? $iban : null,
                    'payload' => $payload,
                    'error' => null,
                ])->save();
                $reason = 'gekoppeld via ref';
            } else {
                $companyId = isset($byRef) && $byRef ? $byRef->garage_company_id : $this->matchCompany($fields);
                $kenmerk = $formKenmerk !== '' && SepaTools::validKenmerk($formKenmerk) && ! SepaTools::kenmerkInUse($formKenmerk)
                    ? $formKenmerk
                    : SepaTools::generateKenmerk();

                $request = SepaMandateRequest::create([
                    'garage_company_id' => $companyId,
                    'ref_token' => $this->uniqueRef(),
                    'kenmerk' => $kenmerk,
                    'status' => SepaMandateRequest::STATUS_ONTVANGEN,
                    'recipient_email' => filter_var($fields['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $fields['email'] : null,
                    'completed_at' => now(),
                    'iban' => $iban !== '' ? $iban : null,
                    'payload' => $payload,
                    'error' => $note ?? ($companyId ? null : 'Geen klant gevonden: koppel handmatig.'),
                ]);
                $reason = $companyId ? 'gekoppeld via e-mail of naam' : 'niet gekoppeld';
            }

            // Een dubbele of verlopen inzending niet automatisch verwerken: eerst handmatig controleren.
            if ($request->garage_company_id && $note === null) {
                $result = $this->process($request, null);
                $reason .= $result['ok'] ? ', verwerkt' : ', fout: '.$result['reason'];
            }

            return ['request' => $request, 'reason' => $reason];
        });
    }

    private function uniqueRef(): string
    {
        do {
            $ref = Str::random(48);
        } while (SepaMandateRequest::query()->where('ref_token', $ref)->exists());

        return $ref;
    }

    /** Klant zoeken op e-mail (hoofd-e-mail of contactpersoon) of exacte genormaliseerde naam, alleen als uniek. */
    public function matchCompany(array $fields): ?int
    {
        $email = mb_strtolower(trim((string) ($fields['email'] ?? '')));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $ids = GarageCompany::query()->whereRaw('LOWER(hoofd_email) = ?', [$email])->pluck('id')
                ->merge(CustomerPerson::query()->whereRaw('LOWER(email) = ?', [$email])->pluck('garage_company_id'))
                ->unique()
                ->filter(fn ($id) => GarageCompany::query()->whereKey($id)->exists())
                ->values();
            if ($ids->count() === 1) {
                return (int) $ids->first();
            }
        }

        $name = SepaTools::normalizeName((string) ($fields['bedrijfsnaam'] ?? ''));
        if ($name !== '') {
            $matches = GarageCompany::query()->get(['id', 'bedrijfsnaam'])
                ->filter(fn (GarageCompany $c) => SepaTools::normalizeName((string) $c->bedrijfsnaam) === $name);
            if ($matches->count() === 1) {
                return (int) $matches->first()->id;
            }
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Verwerken
    // ------------------------------------------------------------------

    /**
     * Mandaat aanmaken uit een ontvangen verzoek. Ongeldige IBAN: status fout, versleutelde IBAN blijft bewaard.
     *
     * @return array{ok: bool, reason: ?string, mandate: ?SepaMandate}
     */
    public function process(SepaMandateRequest $request, ?int $actorId): array
    {
        if ($request->status === SepaMandateRequest::STATUS_VERWERKT) {
            return ['ok' => false, 'reason' => 'Dit verzoek is al verwerkt.', 'mandate' => null];
        }
        $company = $request->garage_company_id ? GarageCompany::query()->find($request->garage_company_id) : null;
        if (! $company) {
            return $this->fail($request, 'Geen klant gekoppeld.', SepaMandateRequest::STATUS_ONTVANGEN);
        }
        $payload = (array) ($request->payload ?? []);
        if ($payload === []) {
            return $this->fail($request, 'Het formulier is nog niet ingevuld.', $request->status);
        }

        $iban = SepaTools::normalizeIban((string) $request->iban);
        if ($iban === '') {
            return $this->fail($request, 'IBAN ontbreekt.');
        }
        if (! SepaTools::validIban($iban)) {
            return $this->fail($request, 'IBAN is ongeldig (controlegetal of lengte klopt niet).');
        }

        $kenmerk = (string) $request->kenmerk;
        if (! SepaTools::validKenmerk($kenmerk)) {
            return $this->fail($request, 'Kenmerk machtiging is ongeldig.');
        }

        $mandate = DB::transaction(function () use ($request, $company, $payload, $iban, $kenmerk, $actorId) {
            $company->loadMissing('primaryPerson');
            $person = $company->primaryPerson ?? $company->customerPersons()->orderBy('id')->first();
            $personName = $person ? trim(((string) $person->voornaam).' '.((string) $person->achternaam)) : '';
            $val = fn (string $key) => trim((string) ($payload[$key] ?? ''));
            $pick = fn (string $key, ?string $fallback) => $val($key) !== '' ? $val($key) : (string) ($fallback ?? '');

            $revoked = SepaMandate::query()
                ->where('garage_company_id', $company->id)
                ->where('status', SepaMandateStatus::Actief)
                ->update(['status' => SepaMandateStatus::Ingetrokken]);

            $akkoord = self::truthy($payload['akkoord'] ?? null);
            $datum = self::parseDate($val('datum_van_tekenen')) ?? now();
            $bic = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $val('bic')) ?? '');

            $mandate = SepaMandate::create([
                'garage_company_id' => $company->id,
                'bedrijfsnaam' => $pick('bedrijfsnaam', $company->bedrijfsnaam),
                'voor_en_achternaam' => $pick('naam', $personName !== '' ? $personName : $company->bedrijfsnaam),
                'straatnaam_en_nummer' => $pick('adres', $company->adres_straat_nummer),
                'postcode' => $pick('postcode', $company->postcode),
                'plaats' => $pick('plaats', $company->plaats),
                'land' => $pick('land', filled($company->land) ? $company->land : 'Nederland'),
                'iban' => $iban,
                'bic' => $bic !== '' ? mb_substr($bic, 0, 11) : null,
                'email' => $pick('email', $person?->email ?: $company->hoofd_email),
                'telefoonnummer' => $pick('telefoon', $person?->telefoon ?: $company->hoofd_telefoon),
                'plaats_van_tekenen' => $pick('plaats_van_tekenen', $val('plaats') !== '' ? $val('plaats') : $company->plaats),
                'datum_van_tekenen' => $datum->toDateString(),
                'ondertekenaar_naam' => $val('naam') !== '' ? $val('naam') : null,
                'akkoord_checkbox' => $akkoord,
                'akkoord_op' => $akkoord ? ($request->completed_at ?? now()) : null,
                'mandaat_id' => SepaTools::generateMandaatId($company->id),
                'status' => SepaMandateStatus::Actief->value,
                'ontvangen_op' => $request->completed_at ?? now(),
            ]);

            if (Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging')) {
                DB::table('garage_companies')->where('id', $company->id)->update([
                    'incasso_kenmerk_machtiging' => $kenmerk,
                    'updated_at' => now(),
                ]);
            }

            $request->forceFill([
                'status' => SepaMandateRequest::STATUS_VERWERKT,
                'sepa_mandate_id' => $mandate->id,
                'iban' => null,
                'error' => null,
                'completed_at' => $request->completed_at ?? now(),
            ])->save();

            $creator = $actorId ?? $request->sent_by ?? User::query()->where('role', 'admin')->orderBy('id')->value('id');
            if ($creator) {
                Activity::create([
                    'garage_company_id' => $company->id,
                    'type' => ActivityType::Mandate,
                    'titel' => 'SEPA-machtiging ontvangen via kivii.nl',
                    'inhoud' => 'Mandaat '.$mandate->mandaat_id.', IBAN eindigend op '.substr($iban, -4)
                        .', kenmerk '.$kenmerk.', machtigingsdatum '.$datum->format('d-m-Y').'.'
                        .($revoked ? ' Vorig actief mandaat ingetrokken.' : ''),
                    'created_by' => $creator,
                ]);
            }

            return $mandate;
        });

        return ['ok' => true, 'reason' => null, 'mandate' => $mandate];
    }

    /** @return array{ok: false, reason: string, mandate: null} */
    private function fail(SepaMandateRequest $request, string $reason, ?string $status = SepaMandateRequest::STATUS_FOUT): array
    {
        $request->forceFill(['status' => $status ?? SepaMandateRequest::STATUS_FOUT, 'error' => $reason])->save();

        return ['ok' => false, 'reason' => $reason, 'mandate' => null];
    }

    public static function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $v = mb_strtolower(trim((string) $value));

        return $v !== '' && ! in_array($v, ['0', 'false', 'nee', 'no', 'off', 'niet akkoord'], true);
    }

    public static function parseDate(string $value): ?Carbon
    {
        $value = trim($value);
        try {
            if (preg_match('~^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$~', $value, $m) && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
                return Carbon::create((int) $m[3], (int) $m[2], (int) $m[1])->startOfDay();
            }
            if (preg_match('~^(\d{4})-(\d{1,2})-(\d{1,2})~', $value, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return Carbon::create((int) $m[1], (int) $m[2], (int) $m[3])->startOfDay();
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Weergave (IBAN nooit volledig)
    // ------------------------------------------------------------------

    /** @return array<string, mixed> */
    public static function present(SepaMandateRequest $request, bool $withCompany = false): array
    {
        $payload = (array) ($request->payload ?? []);
        $last4 = $request->iban ? $request->ibanLastFour() : ($payload['iban_laatste4'] ?? null);
        $status = $request->effectiveStatus();

        $row = [
            'id' => $request->id,
            'kenmerk' => $request->kenmerk,
            'status' => $status,
            'garage_company_id' => $request->garage_company_id,
            'recipient_email' => $request->recipient_email,
            'sent_at' => $request->sent_at?->toIso8601String(),
            'sent_via' => $request->sent_via,
            'sent_by' => $request->sender?->name,
            'expires_at' => $request->expires_at?->toIso8601String(),
            'completed_at' => $request->completed_at?->toIso8601String(),
            'created_at' => $request->created_at?->toIso8601String(),
            'error' => $request->error,
            'iban_masked' => $last4 ? '**** '.$last4 : null,
            'has_iban' => filled($request->getRawOriginal('iban')),
            'mandaat_id' => $request->mandate?->mandaat_id,
            'form' => [
                'bedrijfsnaam' => $payload['bedrijfsnaam'] ?? null,
                'naam' => $payload['naam'] ?? null,
                'email' => $payload['email'] ?? null,
                'telefoon' => $payload['telefoon'] ?? null,
                'plaats' => $payload['plaats'] ?? null,
                'datum_van_tekenen' => $payload['datum_van_tekenen'] ?? null,
            ],
            'can_revoke' => in_array($status, [SepaMandateRequest::STATUS_OPEN, SepaMandateRequest::STATUS_ONTVANGEN, SepaMandateRequest::STATUS_FOUT, SepaMandateRequest::STATUS_VERLOPEN], true),
            'can_resend' => $request->garage_company_id !== null && in_array($status, [SepaMandateRequest::STATUS_OPEN, SepaMandateRequest::STATUS_VERLOPEN], true),
            'can_process' => $request->garage_company_id !== null && $payload !== [] && in_array($status, [SepaMandateRequest::STATUS_ONTVANGEN, SepaMandateRequest::STATUS_FOUT], true),
        ];

        if ($withCompany) {
            $row['company'] = $request->garageCompany ? [
                'id' => $request->garageCompany->id,
                'naam' => $request->garageCompany->bedrijfsnaam,
                'url' => route('crm.garage_companies.show', ['garageCompany' => $request->garageCompany->id, 'tab' => 'abonnement']),
            ] : null;
        }

        return $row;
    }
}
