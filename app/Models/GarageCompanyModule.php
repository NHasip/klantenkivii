<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class GarageCompanyModule extends Model
{
    private static ?bool $hasAantalColumn = null;

    protected $fillable = [
        'garage_company_id',
        'module_id',
        'aantal',
        'actief',
        'prijs_maand_excl',
        'startdatum',
        'einddatum',
        'btw_percentage',
    ];

    protected function casts(): array
    {
        return [
            'aantal' => 'integer',
            'actief' => 'boolean',
            'prijs_maand_excl' => 'decimal:2',
            'startdatum' => 'date',
            'einddatum' => 'date',
            'btw_percentage' => 'decimal:2',
        ];
    }

    public static function hasAantalColumn(): bool
    {
        return self::$hasAantalColumn ??= Schema::hasColumn('garage_company_modules', 'aantal');
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
