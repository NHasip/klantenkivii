<?php

namespace App\Services\Sepa;

use App\Models\SepaMandate;
use App\Models\SepaMandateRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Gedeelde SEPA-hulpfuncties (IBAN-controle, kenmerk, mandaat-id). IBANs worden hier nooit gelogd.
 */
class SepaTools
{
    /** Leesbaar alfabet zonder verwarrende tekens (geen 0, O, 1, I, L). */
    public const KENMERK_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public const KENMERK_PREFIX = 'KIVII-';

    private const LEGAL_FORMS = ['bv', 'vof', 'nv', 'cv'];

    public static function normalizeIban(string $iban): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $iban) ?? '');
    }

    public static function validIban(string $iban): bool
    {
        if (! preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $iban)) {
            return false;
        }
        if (str_starts_with($iban, 'NL') && strlen($iban) !== 18) {
            return false;
        }

        $rearranged = substr($iban, 4).substr($iban, 0, 4);
        $remainder = 0;
        foreach (str_split($rearranged) as $char) {
            $digits = ctype_alpha($char) ? (string) (ord($char) - 55) : $char;
            foreach (str_split($digits) as $digit) {
                $remainder = ($remainder * 10 + (int) $digit) % 97;
            }
        }

        return $remainder === 1;
    }

    public static function maskIban(string $iban): string
    {
        if (strlen($iban) < 6) {
            return $iban === '' ? '' : '****';
        }

        return substr($iban, 0, 2).'** **** **** **** '.substr($iban, -4);
    }

    /**
     * Zoekbare, niet-omkeerbare vingerafdruk van een IBAN (HMAC-SHA256 met een sleutel afgeleid van APP_KEY).
     * Leeg resultaat bij lege IBAN.
     */
    public static function ibanHash(?string $iban): ?string
    {
        $iban = self::normalizeIban((string) $iban);
        if ($iban === '') {
            return null;
        }
        $key = hash_hmac('sha256', 'kivii-sepa-iban-hash-v1', (string) config('app.key'), true);

        return hash_hmac('sha256', $iban, $key);
    }

    /** Alleen de laatste 4 tekens tonen, bijvoorbeeld "IBAN eindigend op 4300". */
    public static function endingText(?string $iban): string
    {
        $last4 = self::lastFour($iban);

        return $last4 ? 'IBAN eindigend op '.$last4 : 'IBAN onbekend';
    }

    /**
     * Klant-ids van mandaten die bij een zoekterm horen: volledige IBAN via hash, 4 tekens via laatste 4.
     *
     * @return list<int>
     */
    public static function mandateCompanyIdsForSearch(string $term): array
    {
        if (! Schema::hasColumn('sepa_mandates', 'iban_hash')) {
            return [];
        }
        $compact = self::normalizeIban($term);
        if (preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/', $compact)) {
            return SepaMandate::query()->where('iban_hash', self::ibanHash($compact))
                ->pluck('garage_company_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        }
        if (preg_match('/^[0-9]{4}$/', $compact)) {
            return SepaMandate::query()->where('iban_last4', $compact)
                ->pluck('garage_company_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        }

        return [];
    }

    public static function lastFour(?string $iban): ?string
    {
        $iban = self::normalizeIban((string) $iban);

        return strlen($iban) >= 4 ? substr($iban, -4) : null;
    }

    public static function normalizeName(string $name): string
    {
        $name = mb_strtolower(Str::ascii($name));
        $name = str_replace(['.', "'", '`'], '', $name);
        $name = preg_replace('/[^a-z0-9]+/', ' ', $name) ?? $name;
        $tokens = array_filter(explode(' ', trim($name)), fn ($t) => $t !== '' && ! in_array($t, self::LEGAL_FORMS, true));

        return implode(' ', $tokens);
    }

    /** Geldig kenmerk machtiging: max 35 tekens en alleen de SEPA/ING-tekenset. */
    public static function kenmerkError(string $kenmerk): ?string
    {
        if ($kenmerk === '') {
            return 'Kenmerk machtiging ontbreekt.';
        }
        if (mb_strlen($kenmerk) > 35) {
            return 'Kenmerk machtiging is langer dan 35 tekens.';
        }
        if (! preg_match("~^[0-9A-Za-z /\\-?:().,'+]+$~", $kenmerk)) {
            return "Kenmerk machtiging bevat niet-toegestane tekens (toegestaan: letters, cijfers, spatie en / - ? : ( ) . , ' +).";
        }

        return null;
    }

    public static function validKenmerk(string $kenmerk): bool
    {
        return self::kenmerkError($kenmerk) === null;
    }

    public static function generateMandaatId(int $companyId): string
    {
        do {
            $mandaatId = 'KIVII-'.$companyId.'-'.Str::upper(Str::random(10));
        } while (SepaMandate::query()->where('mandaat_id', $mandaatId)->exists());

        return $mandaatId;
    }

    /** Uniek leesbaar kenmerk, bijvoorbeeld KIVII-7KQ4M9TX. */
    public static function generateKenmerk(): string
    {
        $max = strlen(self::KENMERK_ALPHABET) - 1;
        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= self::KENMERK_ALPHABET[random_int(0, $max)];
            }
            $kenmerk = self::KENMERK_PREFIX.$code;
        } while (self::kenmerkInUse($kenmerk));

        return $kenmerk;
    }

    /** Kenmerk al in gebruik bij een verzoek, een klant of een mandaat (indien die kolom bestaat). */
    public static function kenmerkInUse(string $kenmerk, ?int $ignoreRequestId = null): bool
    {
        if (Schema::hasTable('sepa_mandate_requests')) {
            $query = SepaMandateRequest::query()->where('kenmerk', $kenmerk);
            if ($ignoreRequestId) {
                $query->whereKeyNot($ignoreRequestId);
            }
            if ($query->exists()) {
                return true;
            }
        }
        if (Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging')
            && DB::table('garage_companies')->where('incasso_kenmerk_machtiging', $kenmerk)->exists()) {
            return true;
        }
        foreach (['kenmerk', 'kenmerk_machtiging'] as $column) {
            if (Schema::hasColumn('sepa_mandates', $column) && DB::table('sepa_mandates')->where($column, $kenmerk)->exists()) {
                return true;
            }
        }

        return SepaMandate::query()->where('mandaat_id', $kenmerk)->exists();
    }
}
