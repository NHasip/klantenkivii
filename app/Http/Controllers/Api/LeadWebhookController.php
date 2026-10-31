<?php

namespace App\Http\Controllers\Api;

use App\Enums\GarageCompanySource;
use App\Services\Forms\FormPayloadNormalizer;
use App\Services\Leads\LeadIngestor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class LeadWebhookController extends Controller
{
    public function __invoke(Request $request)
    {
        $this->normalizeFormPayload($request);

        $data = $request->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'contactnaam' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'plaats' => ['nullable', 'string', 'max:255'],
            'bericht' => ['nullable', 'string', 'max:5000'],
            'bron' => ['nullable', Rule::enum(GarageCompanySource::class)],
        ], [
            'bedrijfsnaam.required' => 'Bedrijfsnaam ontbreekt.',
            'contactnaam.required' => 'Naam ontbreekt.',
            'email.required' => 'E-mailadres ontbreekt.',
            'email.email' => 'E-mailadres is ongeldig.',
            'bericht.max' => 'Het bericht is te lang (maximaal 5000 tekens).',
        ]);

        $company = app(LeadIngestor::class)->ingest($data, 'webhook');

        return response()->json([
            'message' => 'OK',
            'garage_company_id' => $company->id,
        ]);
    }

    /**
     * Maakt de payload van WordPress-formulieren bruikbaar:
     * - Elementor Pro "geavanceerd": fields[veld][value] / form_fields[veld]
     * - Elementor Pro "eenvoudig" en Contact Form 7: platte veldnamen
     * - Veelvoorkomende Nederlandse en Engelse veldnamen worden vertaald.
     */
    private function normalizeFormPayload(Request $request): void
    {
        $flat = FormPayloadNormalizer::flatten($request->all());

        $aliases = [
            'bedrijfsnaam' => ['bedrijfsnaam', 'bedrijf', 'company', 'company_name', 'companyname', 'organisatie', 'garage', 'garagenaam', 'your-company'],
            'contactnaam' => ['contactnaam', 'naam', 'name', 'full_name', 'fullname', 'volledige_naam', 'contactpersoon', 'your-name'],
            'email' => ['email', 'e-mail', 'e_mail', 'emailadres', 'e-mailadres', 'mail', 'your-email'],
            'telefoon' => ['telefoon', 'telefoonnummer', 'phone', 'tel', 'telephone', 'mobiel', 'your-phone'],
            'plaats' => ['plaats', 'woonplaats', 'stad', 'city', 'your-city'],
            'bericht' => ['bericht', 'message', 'opmerking', 'opmerkingen', 'vraag', 'your-message'],
        ];

        $merge = [];
        foreach ($aliases as $target => $names) {
            if (filled($request->input($target)) && ! is_array($request->input($target))) {
                continue;
            }
            $found = FormPayloadNormalizer::map($flat, [$target => $names]);
            if (array_key_exists($target, $found)) {
                $merge[$target] = $found[$target];
            }
        }

        // Geen bedrijfsnaam ingevuld: gebruik de naam, zodat de lead niet verloren gaat.
        if (! filled($merge['bedrijfsnaam'] ?? $request->input('bedrijfsnaam')) && filled($merge['contactnaam'] ?? $request->input('contactnaam'))) {
            $merge['bedrijfsnaam'] = $merge['contactnaam'] ?? $request->input('contactnaam');
        }
        if (! filled($request->input('bron'))) {
            $merge['bron'] = 'website_formulier';
        }

        $request->merge($merge);
    }
}
