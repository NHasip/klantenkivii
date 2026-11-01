<?php

namespace App\Models;

use App\Enums\ActivityType;
use App\Services\Push\PushNotifier;
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

    /**
     * Centrale haak voor het signaal "IBAN gewijzigd" (zelfde titel als de bel voor beheerders gebruikt).
     * De melding noemt alleen de klant, geen IBAN-cijfers.
     */
    protected static function booted(): void
    {
        static::created(function (Activity $activity) {
            if ($activity->titel !== 'IBAN gewijzigd' || ! $activity->garage_company_id) {
                return;
            }

            try {
                $company = \Illuminate\Support\Facades\DB::table('garage_companies')->where('id', $activity->garage_company_id)->value('bedrijfsnaam');

                app(PushNotifier::class)->notifyAdmins(
                    PushNotifier::TYPE_IBAN,
                    'IBAN gewijzigd',
                    ($company ?: 'Een klant').' heeft een nieuw mandaat met een ander IBAN. Controleer de wijziging.',
                    route('crm.garage_companies.show', ['garageCompany' => $activity->garage_company_id], false),
                    'iban-'.$activity->garage_company_id,
                );
            } catch (\Throwable $e) {
                report($e);
            }
        });
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

