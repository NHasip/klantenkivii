<?php

namespace App\Models;

use App\Enums\SepaMandateStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SepaMandate extends Model
{
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
            'datum_van_tekenen' => 'date',
            'akkoord_checkbox' => 'boolean',
            'akkoord_op' => 'datetime',
            'ontvangen_op' => 'datetime',
            'status' => SepaMandateStatus::class,
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }
}

