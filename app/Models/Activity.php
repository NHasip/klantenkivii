<?php

namespace App\Models;

use App\Enums\ActivityType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    protected $fillable = [
        'garage_company_id',
        'type',
        'titel',
        'inhoud',
        'due_at',
        'done_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => ActivityType::class,
            'due_at' => 'datetime',
            'done_at' => 'datetime',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

