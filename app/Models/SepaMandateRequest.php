<?php

namespace App\Models;

use App\Services\Sepa\SepaTools;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Machtigingsverzoek via het formulier op kivii.nl. De IBAN staat versleuteld opgeslagen en wordt
 * na verwerking gewist; de payload bevat nooit de IBAN.
 */
class SepaMandateRequest extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_ONTVANGEN = 'ontvangen';
    public const STATUS_VERWERKT = 'verwerkt';
    public const STATUS_FOUT = 'fout';
    public const STATUS_INGETROKKEN = 'ingetrokken';
    public const STATUS_VERLOPEN = 'verlopen';

    public const STATUSES = ['open', 'ontvangen', 'verwerkt', 'fout', 'ingetrokken', 'verlopen'];

    /** Alleen namens info@kivii.nl: Graph, eigen Outlook (mailto) of gekopieerde link. Geen SMTP. */
    public const VIA = ['graph', 'outlook', 'link'];

    protected $fillable = [
        'garage_company_id',
        'ref_token',
        'kenmerk',
        'status',
        'expires_at',
        'recipient_email',
        'sent_at',
        'sent_by',
        'sent_via',
        'completed_at',
        'sepa_mandate_id',
        'iban',
        'payload',
        'error',
    ];

    protected $hidden = ['iban', 'ref_token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'sent_at' => 'datetime',
            'completed_at' => 'datetime',
            'iban' => 'encrypted',
            'payload' => 'array',
        ];
    }

    public function garageCompany(): BelongsTo
    {
        return $this->belongsTo(GarageCompany::class);
    }

    public function mandate(): BelongsTo
    {
        return $this->belongsTo(SepaMandate::class, 'sepa_mandate_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function isExpired(): bool
    {
        return $this->status === self::STATUS_OPEN && $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function effectiveStatus(): string
    {
        return $this->isExpired() ? self::STATUS_VERLOPEN : (string) $this->status;
    }

    public function ibanLastFour(): ?string
    {
        try {
            return SepaTools::lastFour($this->iban);
        } catch (\Throwable) {
            return null;
        }
    }

    /** Markeer verlopen open verzoeken (alleen deze tabel). */
    public static function expireOverdue(): void
    {
        static::query()
            ->where('status', self::STATUS_OPEN)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => self::STATUS_VERLOPEN, 'updated_at' => now()]);
    }
}
