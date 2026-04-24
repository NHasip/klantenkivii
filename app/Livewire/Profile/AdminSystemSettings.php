<?php

namespace App\Livewire\Profile;

use App\Mail\TemplateMail;
use App\Models\EmailTemplate;
use App\Models\SmtpSetting;
use App\Services\EmailTemplateRenderer;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Livewire\Component;
use Throwable;

class AdminSystemSettings extends Component
{
    private const SYSTEM_TEMPLATE_KEYS = [
        'welcome_customer',
        'general',
        'announcement',
    ];

    public array $smtp = [
        'host' => '',
        'port' => 587,
        'username' => '',
        'password' => '',
        'encryption' => 'tls',
        'from_address' => '',
        'from_name' => '',
    ];

    public array $templateForm = [
        'name' => '',
        'subject' => '',
        'body_text' => '',
        'is_active' => true,
    ];

    public array $templateItems = [];
    public ?int $editingTemplateId = null;
    public bool $editingTemplateIsSystem = false;
    public bool $smtpAvailable = true;
    public bool $templatesAvailable = true;
    public ?string $adminSettingsError = null;

    public string $testEmail = '';

    private ?int $smtpId = null;

    public function mount(): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        try {
            if (Schema::hasTable('smtp_settings')) {
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
            } else {
                $this->smtpAvailable = false;
            }
        } catch (Throwable $e) {
            report($e);
            $this->smtpAvailable = false;
            $this->adminSettingsError = 'SMTP instellingen konden niet geladen worden.';
        }

        try {
            $this->loadTemplateItems();
        } catch (Throwable $e) {
            report($e);
            $this->templatesAvailable = false;
            $this->templateItems = [];
            $this->newTemplate();
            $this->adminSettingsError = 'Email templates konden niet geladen worden.';
        }

        $this->testEmail = auth()->user()?->email ?? '';
    }

    public function saveSmtp(): void
    {
        if (! Schema::hasTable('smtp_settings')) {
            $this->smtpAvailable = false;
            $this->dispatch('notify', message: 'SMTP tabel ontbreekt. Draai migraties.');

            return;
        }

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

        $this->dispatch('smtp-saved');
        $this->dispatch('notify', message: 'SMTP instellingen opgeslagen.');
    }

    public function newTemplate(): void
    {
        $this->editingTemplateId = null;
        $this->editingTemplateIsSystem = false;
        $this->templateForm = [
            'name' => '',
            'subject' => '',
            'body_text' => '',
            'is_active' => true,
        ];
    }

    public function selectTemplate(int $templateId): void
    {
        $this->loadTemplateItems($templateId);
    }

    public function saveTemplate(): void
    {
        if (! Schema::hasTable('email_templates')) {
            $this->templatesAvailable = false;
            $this->dispatch('notify', message: 'Email template tabel ontbreekt. Draai migraties.');

            return;
        }

        $data = $this->validate([
            'templateForm.name' => ['required', 'string', 'max:120'],
            'templateForm.subject' => ['required', 'string', 'max:255'],
            'templateForm.body_text' => ['nullable', 'string'],
            'templateForm.is_active' => ['nullable', 'boolean'],
        ]);

        $bodyText = (string) ($data['templateForm']['body_text'] ?? '');
        $bodyHtml = $this->textToHtml($bodyText);
        $hasActiveColumn = Schema::hasColumn('email_templates', 'is_active');

        $payload = [
            'name' => $data['templateForm']['name'],
            'subject' => $data['templateForm']['subject'],
            'body_html' => $bodyHtml,
            'body_text' => $bodyText,
        ];

        if ($hasActiveColumn) {
            $payload['is_active'] = (bool) ($data['templateForm']['is_active'] ?? true);
        }

        $template = $this->editingTemplateId
            ? EmailTemplate::query()->find($this->editingTemplateId)
            : null;

        if ($template) {
            $template->update($payload);
            $message = 'Template opgeslagen.';
        } else {
            $template = EmailTemplate::query()->create(array_merge(
                $payload,
                ['key' => $this->makeTemplateKey($data['templateForm']['name'])]
            ));
            $message = 'Nieuwe template aangemaakt.';
        }

        $this->loadTemplateItems($template->id);

        $this->dispatch('template-saved');
        $this->dispatch('notify', message: $message);
    }

    public function deleteTemplate(): void
    {
        if (! Schema::hasTable('email_templates')) {
            $this->templatesAvailable = false;
            $this->newTemplate();
            $this->dispatch('notify', message: 'Email template tabel ontbreekt.');

            return;
        }

        if (! $this->editingTemplateId) {
            $this->dispatch('notify', message: 'Selecteer eerst een bestaande template.');

            return;
        }

        $template = EmailTemplate::query()->find($this->editingTemplateId);
        if (! $template) {
            $this->loadTemplateItems();
            $this->dispatch('notify', message: 'Template niet gevonden.');

            return;
        }

        if (in_array($template->key, self::SYSTEM_TEMPLATE_KEYS, true)) {
            $this->dispatch('notify', message: 'Standaard templates kun je hier niet verwijderen.');

            return;
        }

        $template->delete();
        $this->loadTemplateItems();

        $this->dispatch('template-deleted');
        $this->dispatch('notify', message: 'Template verwijderd.');
    }

    public function sendTestEmail(): void
    {
        if (! Schema::hasTable('smtp_settings')) {
            $this->smtpAvailable = false;
            $this->dispatch('notify', message: 'SMTP tabel ontbreekt. Draai migraties.');

            return;
        }

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

    private function loadTemplateItems(?int $preferredTemplateId = null): void
    {
        if (! Schema::hasTable('email_templates')) {
            $this->templatesAvailable = false;
            $this->templateItems = [];
            $this->newTemplate();

            return;
        }

        try {
            $hasActiveColumn = Schema::hasColumn('email_templates', 'is_active');

            $templates = EmailTemplate::query()
                ->orderByRaw("CASE WHEN `key` = 'welcome_customer' THEN 0 ELSE 1 END")
                ->orderBy('name')
                ->get();
        } catch (Throwable $e) {
            report($e);
            $this->templatesAvailable = false;
            $this->templateItems = [];
            $this->newTemplate();

            return;
        }

        $this->templatesAvailable = true;

        $this->templateItems = $templates->map(function (EmailTemplate $template) use ($hasActiveColumn): array {
            return [
                'id' => $template->id,
                'key' => $template->key,
                'name' => $template->name,
                'subject' => $template->subject,
                'is_active' => $hasActiveColumn ? (bool) $template->is_active : true,
                'is_system' => in_array($template->key, self::SYSTEM_TEMPLATE_KEYS, true),
            ];
        })->values()->all();

        if ($templates->isEmpty()) {
            $this->newTemplate();

            return;
        }

        $selected = null;
        if ($preferredTemplateId) {
            $selected = $templates->firstWhere('id', $preferredTemplateId);
        }
        if (! $selected && $this->editingTemplateId) {
            $selected = $templates->firstWhere('id', $this->editingTemplateId);
        }
        if (! $selected) {
            $selected = $templates->firstWhere('key', 'welcome_customer') ?: $templates->first();
        }

        $this->editingTemplateId = $selected->id;
        $this->editingTemplateIsSystem = in_array($selected->key, self::SYSTEM_TEMPLATE_KEYS, true);
        $this->templateForm = [
            'name' => $selected->name ?? '',
            'subject' => $selected->subject ?? '',
            'body_text' => $selected->body_text ?: strip_tags((string) $selected->body_html),
            'is_active' => $hasActiveColumn ? (bool) $selected->is_active : true,
        ];
    }

    private function makeTemplateKey(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'template';
        }

        $key = $base;
        $suffix = 1;

        while (EmailTemplate::query()->where('key', $key)->exists()) {
            $suffix++;
            $key = $base.'-'.$suffix;
        }

        return $key;
    }

    private function textToHtml(string $text): string
    {
        $safe = e($text);
        $safe = str_replace(["\r\n", "\r"], "\n", $safe);

        return nl2br($safe);
    }

    public function render()
    {
        return view('livewire.profile.admin-system-settings', [
            'placeholders' => [
                '{{naam}}',
                '{{bedrijfsnaam}}',
                '{{loginnaam}}',
                '{{activatielink}}',
                '{{reset_link}}',
                '{{weblink}}',
            ],
            'advancedTemplatesUrl' => Route::has('crm.email_templates.index')
                ? route('crm.email_templates.index')
                : null,
        ]);
    }
}
