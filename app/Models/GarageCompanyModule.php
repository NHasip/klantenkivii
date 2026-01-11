<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GarageCompanyModule extends Model
{
    protected $fillable = [
        'garage_company_id',
        'module_id',
        'actief',
        'prijs_maand_excl',
        'startdatum',
        'einddatum',
        'btw_percentage',
    ];

    protected function casts(): array
    {
        return [
            'actief' => 'boolean',
            'prijs_maand_excl' => 'decimal:2',
            'startdatum' => 'date',
            'einddatum' => 'date',
            'btw_percentage' => 'decimal:2',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}

