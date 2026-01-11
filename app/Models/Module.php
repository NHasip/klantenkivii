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
    ];

    protected function casts(): array
    {
        return [
            'default_visible' => 'boolean',
        ];
    }

    public function garageCompanies(): HasMany
    {
        return $this->hasMany(GarageCompanyModule::class);
    }
}

