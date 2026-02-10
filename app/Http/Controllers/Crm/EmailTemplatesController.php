<?php

namespace App\Http\Controllers\Crm;

use App\Models\EmailTemplate;
use App\Services\EmailTemplateRenderer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EmailTemplatesController
{
    private const SYSTEM_KEYS = [
        'welcome_customer',
        'general',
        'announcement',
    ];

    public function index(): Response
    {
        if (! Schema::hasTable('email_templates')) {
            return Inertia::render('Crm/EmailTemplates/Index', [
                'templates' => [],
                'variables' => EmailTemplateRenderer::sampleData(),
                'urls' => [
                    'back' => route('dashboard'),
                    'store' => route('crm.email_templates.store'),
                ],
            ]);
        }

        $this->ensureDefaults();
        $hasActiveColumn = Schema::hasColumn('email_templates', 'is_active');

        $templates = EmailTemplate::query()
            ->orderBy('name')
            ->get()
            ->map(fn (EmailTemplate $template) => [
                'id' => $template->id,
                'key' => $template->key,
                'name' => $template->name,
                'subject' => $template->subject,
                'body_html' => $template->body_html,
                'is_active' => $hasActiveColumn ? (bool) $template->is_active : true,
                'is_system' => in_array($template->key, self::SYSTEM_KEYS, true),
            ]);

        return Inertia::render('Crm/EmailTemplates/Index', [
            'templates' => $templates,
            'variables' => EmailTemplateRenderer::sampleData(),
            'urls' => [
                'back' => route('dashboard'),
                'store' => route('crm.email_templates.store'),
                'update' => route('crm.email_templates.update', ['emailTemplate' => '__TEMPLATE__']),
                'delete' => route('crm.email_templates.delete', ['emailTemplate' => '__TEMPLATE__']),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $key = $this->makeKey($data['name']);
        $bodyHtml = $data['body_html'] ?? '';
        $hasBodyText = Schema::hasColumn('email_templates', 'body_text');
        $hasActiveColumn = Schema::hasColumn('email_templates', 'is_active');

        $payload = [
            'key' => $key,
            'name' => $data['name'],
            'subject' => $data['subject'],
        ];

        if (Schema::hasColumn('email_templates', 'body_html')) {
            $payload['body_html'] = $bodyHtml;
        }
        if ($hasBodyText) {
            $payload['body_text'] = $this->htmlToText($bodyHtml);
        }
        if ($hasActiveColumn) {
            $payload['is_active'] = (bool) ($data['is_active'] ?? true);
        }

        EmailTemplate::create($payload);

        return back()->with('status', 'Template toegevoegd.');
    }

    public function update(Request $request, EmailTemplate $emailTemplate): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $bodyHtml = $data['body_html'] ?? '';
        $payload = [
            'name' => $data['name'],
            'subject' => $data['subject'],
        ];

        if (Schema::hasColumn('email_templates', 'body_html')) {
            $payload['body_html'] = $bodyHtml;
        }
        if (Schema::hasColumn('email_templates', 'body_text')) {
            $payload['body_text'] = $this->htmlToText($bodyHtml);
        }
        if (Schema::hasColumn('email_templates', 'is_active')) {
            $payload['is_active'] = (bool) ($data['is_active'] ?? true);
        }

        $emailTemplate->update($payload);

        return back()->with('status', 'Template opgeslagen.');
    }

    public function destroy(EmailTemplate $emailTemplate): RedirectResponse
    {
        if (in_array($emailTemplate->key, self::SYSTEM_KEYS, true)) {
            return back()->with('status', 'Standaard templates kun je niet verwijderen.');
        }

        $emailTemplate->delete();

        return back()->with('status', 'Template verwijderd.');
    }

    private function ensureDefaults(): void
    {
        $hasBodyHtml = Schema::hasColumn('email_templates', 'body_html');
        $hasBodyText = Schema::hasColumn('email_templates', 'body_text');
        $hasActiveColumn = Schema::hasColumn('email_templates', 'is_active');
        $defaults = [
            'welcome_customer' => [
                'name' => 'Welkomstmail',
                'subject' => 'Welkom bij Kivii',
                'body_html' => '<p>Hallo {{ naam }},</p><p>Welkom bij Kivii.</p><p>Weblink: {{ weblink }}</p>',
            ],
            'general' => [
                'name' => 'Algemeen',
                'subject' => 'Bericht van Kivii',
                'body_html' => '<p>Hallo {{ naam }},</p><p>...</p>',
            ],
            'announcement' => [
                'name' => 'Aankondiging',
                'subject' => 'Kivii update',
                'body_html' => '<p>Hallo {{ naam }},</p><p>...</p>',
            ],
        ];

        foreach ($defaults as $key => $payload) {
            $create = [
                'name' => $payload['name'],
                'subject' => $payload['subject'],
            ];

            if ($hasBodyHtml) {
                $create['body_html'] = $payload['body_html'];
            }
            if ($hasBodyText) {
                $create['body_text'] = $this->htmlToText($payload['body_html']);
            }
            if ($hasActiveColumn) {
                $create['is_active'] = true;
            }

            EmailTemplate::query()->firstOrCreate(
                ['key' => $key],
                $create
            );
        }
    }

    private function makeKey(string $name): string
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

    private function htmlToText(string $html): string
    {
        $text = preg_replace('/<br\s*\/?>/i', "\n", $html) ?? $html;
        $text = preg_replace('/<\/p>\s*<p>/i', "\n\n", $text) ?? $text;
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }
}
