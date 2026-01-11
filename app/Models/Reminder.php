<?php

namespace App\Models;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    protected $fillable = [
        'user_id',
        'garage_company_id',
        'activity_id',
        'titel',
        'message',
        'remind_at',
        'channel',
        'status',
        'email_sent_at',
        'popup_dismissed_at',
    ];

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'channel' => ReminderChannel::class,
            'status' => ReminderStatus::class,
            'email_sent_at' => 'datetime',
            'popup_dismissed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}

