<?php

namespace App\Models;

use App\Casts\EncryptedIban;
use App\Enums\SepaMandateStatus;
use App\Services\Sepa\SepaTools;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

/**
 * SEPA-mandaat. De IBAN staat versleuteld in de database; iban_hash (HMAC) en iban_last4 dienen om te zoeken.
 */
class SepaMandate extends Model
{
    private static ?bool $hasLookupColumns = null;

    protected $hidden = ['iban', 'iban_hash'];

    protected $fillable = [
        'garage_company_id',
        'bedrijfsnaam',
        'voor_en_achternaam',
        'straatnaam_en_nummer',
        'postcode',
        'plaats',
        'land',
        'iban',
        'bic',
        'email',
        'telefoonnummer',
        'plaats_van_tekenen',
        'datum_van_tekenen',
        'ondertekenaar_naam',
        'akkoord_checkbox',
        'akkoord_op',
        'mandaat_id',
        'status',
        'ontvangen_op',
    ];

    protected function casts(): array
    {
        return [
            'iban' => EncryptedIban::class,
            'datum_van_tekenen' => 'date',
            'akkoord_checkbox' => 'boolean',
            'akkoord_op' => 'datetime',
            'ontvangen_op' => 'datetime',
            'status' => SepaMandateStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (SepaMandate $mandate) {
            if (! self::hasLookupColumns()) {
                return;
            }
            if ($mandate->isDirty('iban') || ! $mandate->exists || $mandate->getAttribute('iban_hash') === null) {
                $iban = (string) $mandate->iban;
                $mandate->setAttribute('iban_hash', SepaTools::ibanHash($iban));
                $mandate->setAttribute('iban_last4', SepaTools::lastFour($iban));
            }
        });
    }

    public static function hasLookupColumns(): bool
    {
        return self::$hasLookupColumns ??= Schema::hasColumn('sepa_mandates', 'iban_hash')
            && Schema::hasColumn('sepa_mandates', 'iban_last4');
    }

    public function maskedIban(): string
    {
        return SepaTools::maskIban(SepaTools::normalizeIban((string) $this->iban));
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }
}

