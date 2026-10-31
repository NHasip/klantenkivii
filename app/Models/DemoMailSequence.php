<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DemoMailSequence extends Model
{
    public const STATUS_ACTIEF = 'actief';

    public const STATUS_GESTOPT = 'gestopt';

    public const STATUS_AFGEROND = 'afgerond';

    protected $fillable = [
        'garage_company_id',
        'active_company_id',
        'status',
        'started_at',
        'stopped_at',
        'stop_reason',
        'stopped_by',
        'created_by',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stopped_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(DemoMailStep::class)->orderBy('day_offset');
    }

    public function stopper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'stopped_by');
    }
}
