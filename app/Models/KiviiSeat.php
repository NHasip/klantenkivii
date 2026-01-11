<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KiviiSeat extends Model
{
    protected $fillable = [
        'garage_company_id',
        'naam',
        'email',
        'rol_in_kivii',
        'actief',
        'aangemaakt_op',
    ];

    protected function casts(): array
    {
        return [
            'actief' => 'boolean',
            'aangemaakt_op' => 'date',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }
}

