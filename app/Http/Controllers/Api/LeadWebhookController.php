<?php

namespace App\Http\Controllers\Api;

use App\Enums\GarageCompanySource;
use App\Services\Leads\LeadIngestor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class LeadWebhookController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'bedrijfsnaam' => ['required', 'string', 'max:255'],
            'contactnaam' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'telefoon' => ['nullable', 'string', 'max:50'],
            'plaats' => ['nullable', 'string', 'max:255'],
            'bericht' => ['nullable', 'string'],
            'bron' => ['nullable', Rule::enum(GarageCompanySource::class)],
        ]);

        $company = app(LeadIngestor::class)->ingest($data, 'webhook');

        return response()->json([
            'message' => 'OK',
            'garage_company_id' => $company->id,
        ]);
    }
}
