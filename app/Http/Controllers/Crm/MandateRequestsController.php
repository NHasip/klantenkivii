<?php

namespace App\Http\Controllers\Crm;

use App\Enums\ActivityType;
use App\Enums\GarageCompanyStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\EmailTemplate;
use App\Models\GarageCompany;
use App\Models\SepaMandateRequest;
use App\Services\EmailTemplateRenderer;
use App\Services\Mail\MicrosoftGraphMailer;
use App\Services\Sepa\MandateRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SEPA-machtigingsverzoeken via kivii.nl (alleen admin). Versturen gebeurt altijd handmatig en
 * uitsluitend namens info@kivii.nl: via Microsoft Graph, via de eigen Outlook (mailto) of als gekopieerde link.
 * Er is bewust geen SMTP-fallback.
 */
class MandateRequestsController extends Controller
{
    public function __construct(private readonly MandateRequestService $service) {}

    public function index(): Response
    {
        $available = MandateRequestService::available();
        if ($available) {
            SepaMandateRequest::expireOverdue();
        }

        $requests = $available
            ? SepaMandateRequest::query()
                ->with(['garageCompany:id,bedrijfsnaam,adres_straat_nummer,postcode,plaats,land,hoofd_email,hoofd_telefoon', 'garageCompany.primaryPerson', 'mandate:id,mandaat_id', 'sender:id,name'])
                ->latest('id')
                ->limit(500)
                ->get()
                ->map(fn (SepaMandateRequest $r) => MandateRequestService::present($r, true))
                ->values()
            : collect();

        $labels = GarageCompanyStatus::labelMap();

        return Inertia::render('Crm/MandateRequests/Index', [
            'available' => $available,
            'requests' => $requests,
            'customers' => GarageCompany::query()->orderBy('bedrijfsnaam')->get(['id', 'bedrijfsnaam', 'status'])
                ->map(fn (GarageCompany $c) => [
                    'id' => $c->id,
                    'naam' => (string) $c->bedrijfsnaam,
                    'status' => $labels[$c->status?->value] ?? (string) $c->status?->value,
                ])->values(),
            'urls' => [
                'revoke' => route('crm.mandate_requests.revoke', ['mandateRequest' => '__ID__']),
                'link' => route('crm.mandate_requests.link', ['mandateRequest' => '__ID__']),
                'process' => route('crm.mandate_requests.process', ['mandateRequest' => '__ID__']),
                'adopt' => route('crm.mandate_requests.adopt', ['mandateRequest' => '__ID__']),
            ],
        ]);
    }

    /** Props voor de klantpagina. */
    public static function forCompany(GarageCompany $company): array
    {
        $available = MandateRequestService::available();
        $requests = collect();
        $company->loadMissing('primaryPerson');
        if ($available) {
            SepaMandateRequest::expireOverdue();
            $requests = SepaMandateRequest::query()
                ->where('garage_company_id', $company->id)
                ->with(['mandate:id,mandaat_id', 'sender:id,name'])
                ->latest('id')
                ->limit(50)
                ->get()
                ->map(fn (SepaMandateRequest $r) => MandateRequestService::present($r->setRelation('garageCompany', $company)))
                ->values();
        }

        $primary = $company->primaryPerson;
        $naam = $primary ? trim("{$primary->voornaam} {$primary->achternaam}") : '';

        return [
            'requests' => $requests,
            'config' => [
                'available' => $available,
                'can_send' => (bool) auth()->user()?->isAdmin(),
                'graph_configured' => MicrosoftGraphMailer::isConfigured(),
                'sender' => MicrosoftGraphMailer::sender(),
                'default_email' => (string) ($company->hoofd_email ?: ($primary?->email ?? '')),
                'valid_days' => MandateRequestService::validDays(),
                'form_url' => (string) config('crm.mandate_form_url'),
                'data' => [
                    'naam' => $naam !== '' ? $naam : (string) $company->bedrijfsnaam,
                    'bedrijfsnaam' => (string) $company->bedrijfsnaam,
                ],
                'default_template' => EmailTemplateRenderer::defaultMandateTemplate(),
            ],
            'urls' => [
                'store' => route('crm.mandate_requests.store', ['garageCompany' => $company->id]),
                'resend' => route('crm.mandate_requests.resend', ['mandateRequest' => '__ID__']),
                'revoke' => route('crm.mandate_requests.revoke', ['mandateRequest' => '__ID__']),
                'process' => route('crm.mandate_requests.process', ['mandateRequest' => '__ID__']),
                'adopt' => route('crm.mandate_requests.adopt', ['mandateRequest' => '__ID__']),
                'templates_store' => route('crm.email_templates.store'),
                'overview' => route('crm.mandate_requests.index'),
            ],
        ];
    }

    public function store(Request $request, GarageCompany $garageCompany): JsonResponse
    {
        if (! MandateRequestService::available()) {
            return response()->json(['message' => 'De database-migratie voor machtigingsverzoeken ontbreekt nog.'], 422);
        }
        $data = $this->validateSend($request);
        if ($error = $this->transportError($data['via'])) {
            return response()->json(['message' => $error], 422);
        }

        $mandateRequest = $this->service->create($garageCompany, auth()->id(), $data['via'], $data['email'] ?? null);

        return $this->deliver($garageCompany, $mandateRequest, $data, true);
    }

    public function resend(Request $request, SepaMandateRequest $mandateRequest): JsonResponse
    {
        $company = $mandateRequest->garageCompany;
        $status = $mandateRequest->effectiveStatus();
        if (! $company || ! in_array($status, [SepaMandateRequest::STATUS_OPEN, SepaMandateRequest::STATUS_VERLOPEN], true)) {
            return response()->json(['message' => 'Dit verzoek kan niet opnieuw verstuurd worden.'], 422);
        }
        $data = $this->validateSend($request);
        if ($error = $this->transportError($data['via'])) {
            return response()->json(['message' => $error], 422);
        }

        $mandateRequest->forceFill([
            'status' => SepaMandateRequest::STATUS_OPEN,
            'expires_at' => now()->addDays(MandateRequestService::validDays())->endOfDay(),
            'recipient_email' => $data['email'] ?? $mandateRequest->recipient_email,
            'sent_at' => now(),
            'sent_by' => auth()->id(),
            'sent_via' => $data['via'],
        ])->save();

        return $this->deliver($company, $mandateRequest, $data, false);
    }

    public function revoke(SepaMandateRequest $mandateRequest): JsonResponse
    {
        if ($mandateRequest->status === SepaMandateRequest::STATUS_VERWERKT) {
            return response()->json(['message' => 'Een verwerkt verzoek kun je niet intrekken. Trek eventueel het mandaat zelf in.'], 422);
        }
        $mandateRequest->forceFill(['status' => SepaMandateRequest::STATUS_INGETROKKEN, 'iban' => null])->save();

        if ($mandateRequest->garage_company_id) {
            Activity::create([
                'garage_company_id' => $mandateRequest->garage_company_id,
                'type' => ActivityType::Mandate,
                'titel' => 'Machtigingsverzoek ingetrokken',
                'inhoud' => 'Kenmerk '.$mandateRequest->kenmerk.'. De link werkt niet meer.',
                'created_by' => auth()->id(),
            ]);
        }

        return response()->json(['message' => 'Verzoek ingetrokken.']);
    }

    public function link(Request $request, SepaMandateRequest $mandateRequest): JsonResponse
    {
        $data = $request->validate([
            'garage_company_id' => ['required', 'integer', Rule::exists('garage_companies', 'id')],
        ], ['garage_company_id.required' => 'Kies een klant.']);

        if ($mandateRequest->status === SepaMandateRequest::STATUS_VERWERKT) {
            return response()->json(['message' => 'Dit verzoek is al verwerkt.'], 422);
        }
        $company = GarageCompany::query()->findOrFail($data['garage_company_id']);
        $mandateRequest->forceFill([
            'garage_company_id' => $company->id,
            'error' => null,
        ])->save();

        return response()->json(['message' => 'Gekoppeld aan '.$company->bedrijfsnaam.'. Klik op Verwerken om het mandaat aan te maken.']);
    }

    public function process(SepaMandateRequest $mandateRequest): JsonResponse
    {
        $result = $this->service->process($mandateRequest, auth()->id());
        if (! $result['ok']) {
            return response()->json(['message' => 'Niet verwerkt: '.$result['reason']], 422);
        }

        return response()->json(['message' => 'Mandaat '.$result['mandate']->mandaat_id.' aangemaakt en actief gezet.']);
    }

    /** Geselecteerde klantgegevens uit het formulier overnemen; waarden komen alleen uit de opgeslagen payload. */
    public function adopt(Request $request, SepaMandateRequest $mandateRequest): JsonResponse
    {
        $data = $request->validate([
            'fields' => ['required', 'array', 'min:1'],
            'fields.*' => ['string', 'distinct', Rule::in(array_keys(MandateRequestService::ADOPT_FIELDS))],
        ], [
            'fields.required' => 'Selecteer minimaal één gegeven.',
            'fields.min' => 'Selecteer minimaal één gegeven.',
            'fields.*.in' => 'Onbekend veld geselecteerd.',
        ]);

        $company = $mandateRequest->garageCompany;
        if (! $company) {
            return response()->json(['message' => 'Koppel het verzoek eerst aan een klant.'], 422);
        }
        if (((array) ($mandateRequest->payload ?? [])) === [] || $mandateRequest->status === SepaMandateRequest::STATUS_INGETROKKEN) {
            return response()->json(['message' => 'Er zijn geen formuliergegevens om over te nemen.'], 422);
        }

        $result = $this->service->adopt($mandateRequest, $company, $data['fields'], auth()->id());
        if ($result['adopted'] === []) {
            return response()->json(['message' => $result['skipped'] !== []
                ? 'Niets overgenomen: '.implode(', ', $result['skipped']).'.'
                : 'Niets overgenomen: de geselecteerde gegevens zijn al gelijk.'], 422);
        }

        return response()->json([
            'message' => 'Overgenomen in klantprofiel: '.implode(', ', $result['adopted']).'.'
                .($result['skipped'] !== [] ? ' Niet overgenomen: '.implode(', ', $result['skipped']).'.' : ''),
        ]);
    }

    // ------------------------------------------------------------------

    private function validateSend(Request $request): array
    {
        $via = (string) $request->input('via');

        return $request->validate([
            'via' => ['required', Rule::in(['graph', 'outlook', 'link'])],
            'email' => [$via === 'link' ? 'nullable' : 'required', 'email', 'max:255'],
            'template_id' => ['nullable', 'integer', Rule::exists('email_templates', 'id')],
        ], [
            'email.required' => 'Vul het e-mailadres van de ontvanger in.',
            'email.email' => 'Het e-mailadres van de ontvanger is ongeldig.',
        ]);
    }

    private function transportError(string $via): ?string
    {
        if ($via === 'graph' && ! MicrosoftGraphMailer::isConfigured()) {
            return 'Stel eerst de Microsoft-koppeling voor '.MicrosoftGraphMailer::sender().' in. Gebruik tot die tijd "Openen in Outlook" of "Kopieer link".';
        }

        return null;
    }

    private function deliver(GarageCompany $company, SepaMandateRequest $mandateRequest, array $data, bool $isNew): JsonResponse
    {
        $mandateRequest->setRelation('garageCompany', $company);
        $templateId = isset($data['template_id']) ? (int) $data['template_id'] : null;
        $mail = $this->service->render($company, $mandateRequest, $templateId);
        $email = $data['email'] ?? null;
        $via = $data['via'];

        if ($via === 'graph') {
            try {
                app(MicrosoftGraphMailer::class)->send((string) $email, $mail['subject'], $mail['html'], MicrosoftGraphMailer::sender());
            } catch (\Throwable $e) {
                // Niets verstuurd: een nieuw verzoek weer weghalen, een bestaand verzoek terugzetten is niet nodig (link blijft geldig).
                if ($isNew) {
                    $mandateRequest->delete();
                }

                return response()->json(['message' => $e instanceof \RuntimeException ? $e->getMessage() : 'Versturen via Microsoft 365 mislukt.'], 422);
            }
        }

        $titel = match ($via) {
            'graph' => 'Machtigingsmail verstuurd naar '.$email,
            'outlook' => 'Machtigingsmail via Outlook naar '.$email,
            default => 'Machtigingslink gekopieerd',
        };
        Activity::create([
            'garage_company_id' => $company->id,
            'type' => ActivityType::Mandate,
            'titel' => $titel.' (kenmerk '.$mandateRequest->kenmerk.')',
            'inhoud' => ($isNew ? 'Nieuw machtigingsverzoek' : 'Machtigingsverzoek opnieuw verstuurd')
                .($via === 'graph' ? ' namens '.MicrosoftGraphMailer::sender() : '')
                .', geldig tot '.$mandateRequest->expires_at?->format('d-m-Y').'.',
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => match ($via) {
                'graph' => 'Machtigingsmail verstuurd naar '.$email.'.',
                'outlook' => 'Verzoek aangemaakt. Outlook wordt geopend; verstuur de mail vanuit info@kivii.nl.',
                default => 'Link gekopieerd. Het verzoek staat open.',
            },
            'request' => MandateRequestService::present($mandateRequest->fresh(['mandate', 'sender']) ?? $mandateRequest),
            'link' => $this->service->link($mandateRequest),
            'subject' => $mail['subject'],
            'text' => $mail['text'],
            'email' => $email,
        ]);
    }
}
