<?php

namespace App\Models;

use App\Services\Push\PushNotifier;
use Illuminate\Database\Eloquent\Model;

class OutboundEmail extends Model
{
    protected $fillable = [
        'garage_company_id',
        'template_id',
        'type',
        'to_email',
        'subject',
        'body_html',
        'body_text',
        'status',
        'sent_at',
        'last_error',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    /**
     * Centrale haak voor "E-mail niet verstuurd": elke welkomstmail, demo-mail of machtigingsmail die als
     * mislukt in het e-maillog komt, geeft een pushmelding aan admins (zonder e-mailadres in de melding).
     */
    protected static function booted(): void
    {
        static::saved(function (OutboundEmail $email) {
            if ($email->status !== 'failed' || (! $email->wasRecentlyCreated && ! $email->wasChanged('status'))) {
                return;
            }

            try {
                $label = match (true) {
                    $email->type === 'welcome_customer' => 'Welkomstmail',
                    $email->type === 'sepa_mandate' => 'Machtigingsmail',
                    str_starts_with((string) $email->type, 'demo') => 'Demo-mail',
                    default => 'E-mail',
                };
                $company = $email->garage_company_id
                    ? \Illuminate\Support\Facades\DB::table('garage_companies')->where('id', $email->garage_company_id)->value('bedrijfsnaam')
                    : null;

                app(PushNotifier::class)->notifyAdmins(
                    PushNotifier::TYPE_MAIL_FAILED,
                    'E-mail niet verstuurd',
                    $label.($company ? ' aan '.$company : '').' kon niet worden verstuurd. Bekijk de e-maillog.',
                    route('crm.email_log.index', [], false),
                    'mail-failed-'.$email->id,
                );
            } catch (\Throwable $e) {
                report($e);
            }
        });
    }
}
