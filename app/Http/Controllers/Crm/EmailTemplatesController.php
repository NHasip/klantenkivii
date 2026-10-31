<?php

namespace App\Http\Controllers\Crm;

use App\Models\EmailTemplate;
use App\Models\GarageCompany;
use App\Services\EmailTemplateRenderer;
use Illuminate\Http\JsonResponse;
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
        'sepa_machtiging',
        'demo_dag_2',
        'demo_dag_5',
        'demo_dag_13',
    ];

    public function index(): Response
    {
        if (! Schema::hasTable('email_templates')) {
            return Inertia::render('Crm/EmailTemplates/Index', [
                'templates' => [],
                'variables' => $this->orderedVariables(),
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
        if ($hasActiveColumn) {
            $templates = $templates->reject(fn ($template) => $template['is_system'] && ! $template['is_active'])->values();
        }

        return Inertia::render('Crm/EmailTemplates/Index', [
            'templates' => $templates,
            'variables' => $this->orderedVariables(),
            'urls' => [
                'back' => route('dashboard'),
                'store' => route('crm.email_templates.store'),
                'update' => route('crm.email_templates.update', ['emailTemplate' => '__TEMPLATE__']),
                'update_post' => route('crm.email_templates.update_post', ['emailTemplate' => '__TEMPLATE__']),
                'delete' => route('crm.email_templates.delete', ['emailTemplate' => '__TEMPLATE__']),
                'delete_post' => route('crm.email_templates.delete_post', ['emailTemplate' => '__TEMPLATE__']),
                'preview' => route('crm.email_templates.preview'),
            ],
            'previewCustomers' => GarageCompany::query()
                ->orderBy('bedrijfsnaam')
                ->limit(1000)
                ->get(['id', 'bedrijfsnaam', 'plaats'])
                ->map(fn (GarageCompany $company) => [
                    'id' => $company->id,
                    'label' => $company->bedrijfsnaam.($company->plaats ? ' ('.$company->plaats.')' : ''),
                ])
                ->values(),
        ]);
    }

    /**
     * Alleen-lezen voorbeeld: rendert het (niet opgeslagen) onderwerp en de inhoud met
     * gegevens van een echte klant. Er wordt niets opgeslagen en geen token aangemaakt.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'garage_company_id' => ['required', 'integer'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body_html' => ['nullable', 'string', 'max:200000'],
        ]);

        $company = GarageCompany::query()->with('primaryPerson')->findOrFail($data['garage_company_id']);
        $primary = $company->primaryPerson;
        $naam = $primary ? trim("{$primary->voornaam} {$primary->achternaam}") : '';
        // Activatielink wordt pas bij verzenden aangemaakt; hier een niet-werkende voorbeeldlink.
        $activatielink = rtrim(config('app.url') ?: url('/'), '/').'/reset-password/VOORBEELD-TOKEN?email='.urlencode((string) ($company->login_email ?: $company->hoofd_email));

        $values = [
            'naam' => $naam !== '' ? $naam : (string) $company->bedrijfsnaam,
            'bedrijfsnaam' => (string) $company->bedrijfsnaam,
            'loginnaam' => $company->login_email ?: '-',
            'wachtwoord' => '(verborgen in voorbeeld)',
            'activatielink' => $activatielink,
            'reset_link' => $activatielink,
            'weblink' => 'https://web.kivii.nl/',
            // Machtigingslink en kenmerk worden pas bij versturen aangemaakt; hier voorbeeldwaarden.
            'machtigingslink' => EmailTemplateRenderer::mandateLink('VOORBEELDREF', 'KIVII-VOORBEELD', (string) $company->bedrijfsnaam),
            'kenmerk' => 'KIVII-VOORBEELD',
            'geldig_tot' => now()->addDays((int) config('crm.mandate_valid_days', 30))->format('d-m-Y'),
            'modules' => \App\Services\Crm\DemoMailSequenceService::moduleNames($company),
        ];
        $escaped = array_map(fn ($value) => e($value), $values);

        return response()->json([
            'subject' => EmailTemplateRenderer::renderString((string) ($data['subject'] ?? ''), $values),
            'html' => EmailTemplateRenderer::renderString((string) ($data['body_html'] ?? ''), $escaped),
            'to' => $company->hoofd_email,
        ]);
    }

    /**
     * Variabelen met de activatielink bovenaan (meest gebruikt in welkomstmails).
     *
     * @return array<string, string>
     */
    private function orderedVariables(): array
    {
        $variables = EmailTemplateRenderer::sampleData();
        $first = array_intersect_key($variables, array_flip(['activatielink']));

        return $first + $variables;
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ], $this->validationMessages(), $this->validationAttributes());

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
        ], $this->validationMessages(), $this->validationAttributes());

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

    public function destroy(Request $request, EmailTemplate $emailTemplate): RedirectResponse
    {
        $isSystem = in_array($emailTemplate->key, self::SYSTEM_KEYS, true);
        $hasActive = Schema::hasColumn('email_templates', 'is_active');
        $isActive = $hasActive ? (bool) $emailTemplate->is_active : true;
        $requestedInactive = $request->boolean('is_active') === false;
        if ($isSystem) {
            if ($isActive && ! $requestedInactive) {
                return back()->with('status', 'Standaard templates kun je niet verwijderen zolang ze actief zijn.');
            }
            if ($hasActive) {
                $emailTemplate->update(['is_active' => false]);
            }
            return back()->with('status', 'Template verborgen.');
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
                'body_html' => '<p>Hallo {{ naam }},</p><p>Welkom bij Kivii.</p><p>Stel je wachtwoord in via: <a href="{{ activatielink }}">{{ activatielink }}</a></p><p>Weblink: {{ weblink }}</p>',
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
        $mandate = \App\Services\EmailTemplateRenderer::defaultMandateTemplate();
        $defaults[$mandate['key']] = ['name' => $mandate['name'], 'subject' => $mandate['subject'], 'body_html' => $mandate['body_html']];
        $defaults += \App\Services\EmailTemplateRenderer::defaultDemoTemplates();

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

    /**
     * Nederlandstalige validatieberichten (de app heeft geen lang/nl bestanden).
     *
     * @return array<string, mixed>
     */
    private function validationMessages(): array
    {
        return [
            'required' => ':Attribute is verplicht.',
            'string' => ':Attribute moet tekst zijn.',
            'boolean' => ':Attribute moet aan of uit zijn.',
            'max' => [
                'string' => ':Attribute mag niet langer zijn dan :max tekens.',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function validationAttributes(): array
    {
        return [
            'name' => 'naam',
            'subject' => 'onderwerp',
            'body_html' => 'inhoud',
            'is_active' => 'actief',
        ];
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
        // Blokelementen scheiden, anders plakt bijv. een kop direct aan de volgende alinea.
        $text = preg_replace('/<li(\s[^>]*)?>/i', '- ', $text) ?? $text;
        $text = preg_replace('/<\/(p|h[1-6]|ul|ol|blockquote|div)>/i', "\n\n", $text) ?? $text;
        $text = preg_replace('/<\/li>/i', "\n", $text) ?? $text;
        $text = strip_tags($text);
        $text = preg_replace("/[ \t]+\n/", "\n", $text) ?? $text;
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }
}
