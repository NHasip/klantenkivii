<?php

namespace App\Http\Controllers\Api;

use App\Services\Sepa\MandateRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

/**
 * Webhook voor het Elementor-formulier op kivii.nl/incasso-machtiging.
 * Antwoordt altijd 200 {ok:true}, zodat het publieke formulier nooit een fout toont.
 * Er wordt alleen het verzoek-id en de reden gelogd, nooit formuliergegevens of IBAN.
 */
class MandateWebhookController extends Controller
{
    public function __invoke(Request $request, MandateRequestService $service): JsonResponse
    {
        try {
            if (! MandateRequestService::available()) {
                Log::warning('Machtiging webhook: tabel sepa_mandate_requests ontbreekt (migratie nog niet gedraaid).');
            } else {
                $result = $service->ingest($request->except(['token']));
                Log::info('Machtiging webhook ontvangen', [
                    'request_id' => $result['request']->id,
                    'reason' => $result['reason'],
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Machtiging webhook mislukt', ['reason' => class_basename($e)]);
        }

        return response()->json(['ok' => true]);
    }
}
