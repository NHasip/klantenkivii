<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoMailStep extends Model
{
    public const STATUS_GEPLAND = 'gepland';

    /** Tijdelijk geclaimd door de verzendtaak; voorkomt dubbel versturen. */
    public const STATUS_BEZIG = 'bezig';

    public const STATUS_VERSTUURD = 'verstuurd';

    public const STATUS_OVERGESLAGEN = 'overgeslagen';

    public const STATUS_GESTOPT = 'gestopt';

    public const STATUS_MISLUKT = 'mislukt';

    protected $fillable = [
        'demo_mail_sequence_id',
        'garage_company_id',
        'step_key',
        'day_offset',
        'due_at',
        'status',
        'attempts',
        'sent_at',
        'recipient_email',
        'subject',
        'reason',
        'last_error',
        'outbound_email_id',
    ];

    protected function casts(): array
    {
        return [
            'day_offset' => 'integer',
            'attempts' => 'integer',
            'due_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function sequence(): BelongsTo
    {
        return $this->belongsTo(DemoMailSequence::class, 'demo_mail_sequence_id');
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }
}
