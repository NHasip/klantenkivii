<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPerson extends Model
{
    protected $table = 'customer_persons';

    protected $fillable = [
        'garage_company_id',
        'voornaam',
        'achternaam',
        'rol',
        'email',
        'telefoon',
        'is_primary',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }
}
