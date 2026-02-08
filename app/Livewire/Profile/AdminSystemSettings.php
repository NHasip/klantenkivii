<?php

namespace App\Livewire\Profile;

use App\Mail\TemplateMail;
use App\Models\EmailTemplate;
use App\Models\SmtpSetting;
use App\Services\EmailTemplateRenderer;
use Illuminate\Support\Facades\Mail;
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

    public array $template = [
        'subject' => '',
        'body_html' => '',
        'body_text' => '',
    ];

    public string $testEmail = '';

    private ?int $smtpId = null;
    private ?int $templateId = null;

    public function mount(): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $smtp = SmtpSetting::query()->first();
        if ($smtp) {
            $this->smtpId = $smtp->id;
            $this->smtp = [
                'host' => $smtp->host ?? '',
                'port' => $smtp->port ?? 587,
                'username' => $smtp->username ?? '',
                'password' => $smtp->password ?? '',
                'encryption' => $smtp->encryption ?? 'tls',
                'from_address' => $smtp->from_address ?? '',
                'from_name' => $smtp->from_name ?? '',
            ];
        }

        $template = EmailTemplate::query()
            ->where('key', 'welcome_customer')
            ->first();

        if ($template) {
            $this->templateId = $template->id;
            $this->template = [
                'subject' => $template->subject ?? '',
                'body_html' => $template->body_html ?? '',
                'body_text' => $template->body_text ?? '',
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

        $smtp = SmtpSetting::query()->updateOrCreate(
            ['id' => $this->smtpId],
            [
                'host' => $data['smtp']['host'] ?? null,
                'port' => $data['smtp']['port'] ?? null,
                'username' => $data['smtp']['username'] ?? null,
                'password' => $data['smtp']['password'] ?? null,
                'encryption' => $data['smtp']['encryption'] ?? null,
                'from_address' => $data['smtp']['from_address'] ?? null,
                'from_name' => $data['smtp']['from_name'] ?? null,
                'updated_by' => auth()->id(),
            ]
        );

        $this->smtpId = $smtp->id;

        $this->dispatch('saved');
        $this->dispatch('notify', message: 'SMTP instellingen opgeslagen.');
    }

    public function saveTemplate(): void
    {
        $data = $this->validate([
            'template.subject' => ['required', 'string', 'max:255'],
            'template.body_html' => ['nullable', 'string'],
            'template.body_text' => ['nullable', 'string'],
        ]);

        $template = EmailTemplate::query()->updateOrCreate(
            ['id' => $this->templateId],
            [
                'key' => 'welcome_customer',
                'name' => 'Welkomstmail nieuwe klant',
                'subject' => $data['template']['subject'],
                'body_html' => $data['template']['body_html'] ?? '',
                'body_text' => $data['template']['body_text'] ?? '',
                'is_active' => true,
            ]
        );

        $this->templateId = $template->id;

        $this->dispatch('saved');
        $this->dispatch('notify', message: 'Template opgeslagen.');
    }

    public function sendTestEmail(): void
    {
        $this->validate([
            'testEmail' => ['required', 'email'],
            'smtp.host' => ['required', 'string'],
            'smtp.port' => ['required', 'integer', 'min:1', 'max:65535'],
            'smtp.username' => ['required', 'string'],
            'smtp.password' => ['required', 'string'],
            'smtp.from_address' => ['required', 'email'],
        ]);

        $this->applySmtpConfig();

        $rendered = EmailTemplateRenderer::renderString(
            'Dit is een testmail van Kivii CRM.',
            EmailTemplateRenderer::sampleData()
        );

        Mail::to($this->testEmail)->send(new TemplateMail(
            'Kivii CRM SMTP test',
            '<p>'.$rendered.'</p>',
            $rendered,
            $this->smtp['from_address'] ?? null,
            $this->smtp['from_name'] ?? null
        ));

        $this->dispatch('notify', message: 'Testmail verstuurd.');
    }

    public function getPreviewHtmlProperty(): string
    {
        return EmailTemplateRenderer::renderString($this->template['body_html'] ?? '', EmailTemplateRenderer::sampleData());
    }

    public function getPreviewTextProperty(): string
    {
        return EmailTemplateRenderer::renderString($this->template['body_text'] ?? '', EmailTemplateRenderer::sampleData());
    }

    private function applySmtpConfig(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $this->smtp['host'] ?? null,
            'mail.mailers.smtp.port' => $this->smtp['port'] ?? null,
            'mail.mailers.smtp.username' => $this->smtp['username'] ?? null,
            'mail.mailers.smtp.password' => $this->smtp['password'] ?? null,
            'mail.mailers.smtp.encryption' => $this->smtp['encryption'] ?: null,
            'mail.from.address' => $this->smtp['from_address'] ?? null,
            'mail.from.name' => $this->smtp['from_name'] ?? config('app.name'),
        ]);
    }

    public function render()
    {
        return view('livewire.profile.admin-system-settings', [
            'placeholders' => [
                '{{naam}}',
                '{{bedrijfsnaam}}',
                '{{loginnaam}}',
                '{{wachtwoord}}',
                '{{weblink}}',
            ],
        ]);
    }
}
