<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    protected $fillable = [
        'naam',
        'omschrijving',
        'default_visible',
        'default_prijs_maand_excl',
        'default_btw_percentage',
    ];

    protected function casts(): array
    {
        return [
            'default_visible' => 'boolean',
            'default_prijs_maand_excl' => 'decimal:2',
            'default_btw_percentage' => 'decimal:2',
        ];
    }

    public function garageCompanies(): HasMany
    {
        return $this->hasMany(GarageCompanyModule::class);
    }
}
