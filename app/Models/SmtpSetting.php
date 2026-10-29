<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SmtpSetting extends Model
{
    protected $fillable = [
        'host',
        'port',
        'username',
        'password',
        'encryption',
        'from_address',
        'from_name',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'port' => 'integer',
            'password' => 'encrypted',
        ];
    }

    public function isComplete(): bool
    {
        return (bool) ($this->host && $this->port && $this->username && $this->password && $this->from_address);
    }

    public function applyToMailConfig(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $this->host,
            'mail.mailers.smtp.port' => $this->port,
            'mail.mailers.smtp.username' => $this->username,
            'mail.mailers.smtp.password' => $this->password,
            'mail.mailers.smtp.encryption' => $this->encryption ?: null,
            'mail.from.address' => $this->from_address,
            'mail.from.name' => $this->from_name ?: config('app.name'),
        ]);
    }

    /**
     * Use the SMTP settings managed in the CRM for all outgoing mail (password
     * resets, reminders, ...) when they are complete. Without complete settings
     * the mail config from .env stays in effect.
     */
    public static function applyStoredToMailConfig(): void
    {
        try {
            if (! Schema::hasTable((new static())->getTable())) {
                return;
            }

            $smtp = static::query()->first();
        } catch (Throwable) {
            return;
        }

        if ($smtp && $smtp->isComplete()) {
            $smtp->applyToMailConfig();
        }
    }
}
