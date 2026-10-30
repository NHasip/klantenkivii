<?php

namespace App\Livewire\Profile;

use App\Mail\TemplateMail;
use App\Models\SmtpSetting;
use App\Services\EmailTemplateRenderer;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Livewire\Component;

class AdminSystemSettings extends Component
{
    public array $smtp = [
        'host' => '',
        'port' => 587,
        'username' => '',
        'password' => '',
        'encryption' => 'tls',
        'from_address' => '',
        'from_name' => '',
    ];

    public string $testEmail = '';

    private ?int $smtpId = null;

    public bool $hasSmtpPassword = false;

    /**
     * Draait bij elke request (ook Livewire-acties), niet alleen bij mount:
     * zo kan een gedegradeerde gebruiker geen oude snapshot meer gebruiken.
     */
    public function boot(): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
    }

    public function mount(): void
    {
        $smtp = SmtpSetting::query()->first();
        if ($smtp) {
            $this->smtpId = $smtp->id;
            $this->hasSmtpPassword = filled($smtp->password);
            $this->smtp = [
                'host' => $smtp->host ?? '',
                'port' => $smtp->port ?? 587,
                'username' => $smtp->username ?? '',
                'password' => '',
                'encryption' => $smtp->encryption ?? 'tls',
                'from_address' => $smtp->from_address ?? '',
                'from_name' => $smtp->from_name ?? '',
            ];
        }

        $this->testEmail = auth()->user()?->email ?? '';
    }

    public function saveSmtp(): void
    {
        $data = $this->validate([
            'smtp.host' => ['nullable', 'string', 'max:255'],
            'smtp.port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp.username' => ['nullable', 'string', 'max:255'],
            'smtp.password' => ['nullable', 'string'],
            'smtp.encryption' => ['nullable', 'string', 'max:20'],
            'smtp.from_address' => ['nullable', 'email', 'max:255'],
            'smtp.from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $existingSmtp = $this->smtpId
            ? SmtpSetting::query()->find($this->smtpId)
            : SmtpSetting::query()->first();

        $payload = [
            'host' => $data['smtp']['host'] ?? null,
            'port' => $data['smtp']['port'] ?? null,
            'username' => $data['smtp']['username'] ?? null,
            'password' => $data['smtp']['password'] ?? null,
            'encryption' => $data['smtp']['encryption'] ?? null,
            'from_address' => $data['smtp']['from_address'] ?? null,
            'from_name' => $data['smtp']['from_name'] ?? null,
            'updated_by' => auth()->id(),
        ];

        if (! Schema::hasColumn('smtp_settings', 'updated_by')) {
            unset($payload['updated_by']);
        }

        if (! filled($data['smtp']['password'] ?? null) && $existingSmtp) {
            unset($payload['password']);
        }

        $smtp = SmtpSetting::query()->updateOrCreate(
            ['id' => $existingSmtp?->id],
            $payload
        );

        $this->smtpId = $smtp->id;
        $this->hasSmtpPassword = filled($smtp->password);
        $this->smtp['password'] = '';

        $this->dispatch('smtp-saved');
        $this->dispatch('notify', message: 'SMTP instellingen opgeslagen.');
    }

    public function sendTestEmail(): void
    {
        $this->validate([
            'testEmail' => ['required', 'email'],
            'smtp.host' => ['required', 'string'],
            'smtp.port' => ['required', 'integer', 'min:1', 'max:65535'],
            'smtp.username' => ['required', 'string'],
            'smtp.password' => [$this->hasSmtpPassword ? 'nullable' : 'required', 'string'],
            'smtp.from_address' => ['required', 'email'],
        ]);

        $this->applySmtpConfig();

        $rendered = EmailTemplateRenderer::renderString(
            'Dit is een testmail van Kivii CRM.',
            EmailTemplateRenderer::sampleData()
        );

        try {
            Mail::to($this->testEmail)->send(new TemplateMail(
                'Kivii CRM SMTP test',
                '<p>'.$rendered.'</p>',
                $rendered,
                $this->smtp['from_address'] ?? null,
                $this->smtp['from_name'] ?? null
            ));
        } catch (\Throwable $e) {
            report($e);
            $this->addError('testEmail', 'Testmail versturen mislukt. Controleer de SMTP instellingen.');

            return;
        }

        $this->dispatch('test-mail-sent');
        $this->dispatch('notify', message: 'Testmail verstuurd.');
    }

    private function resolveSmtpPassword(): ?string
    {
        if (filled($this->smtp['password'] ?? null)) {
            return $this->smtp['password'];
        }

        // Wachtwoord nooit naar de browser sturen: bij een leeg veld het opgeslagen wachtwoord gebruiken.
        return SmtpSetting::query()->first()?->password;
    }

    private function applySmtpConfig(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $this->smtp['host'] ?? null,
            'mail.mailers.smtp.port' => $this->smtp['port'] ?? null,
            'mail.mailers.smtp.username' => $this->smtp['username'] ?? null,
            'mail.mailers.smtp.password' => $this->resolveSmtpPassword(),
            'mail.mailers.smtp.encryption' => $this->smtp['encryption'] ?: null,
            'mail.from.address' => $this->smtp['from_address'] ?? null,
            'mail.from.name' => $this->smtp['from_name'] ?: config('app.name'),
        ]);

        // Een eerder (met oude config) opgebouwde smtp-mailer niet hergebruiken.
        Mail::purge('smtp');
    }

    public function render()
    {
        // Templatebeheer staat op /email-templates (CRM-pagina); hier alleen SMTP.
        return view('livewire.profile.admin-system-settings', [
            'templatesUrl' => route('crm.email_templates.index'),
        ]);
    }
}
