<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\Push\PushNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pushmeldingen op dit apparaat: abonnement opslaan of verwijderen, testmelding en voorkeuren per type.
 */
class PushSubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if ($response = $this->unavailable()) {
            return $response;
        }

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url:https', 'max:2048'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'contentEncoding' => ['nullable', 'string', 'in:aes128gcm,aesgcm'],
        ], [
            'endpoint.*' => 'Het pushadres van dit apparaat is ongeldig.',
            'keys.*' => 'De sleutels van dit apparaat ontbreken.',
        ]);

        $hash = PushSubscription::hashEndpoint($data['endpoint']);

        // Een apparaat hoort bij een gebruiker: wie hier inlogt en meldingen aanzet, neemt het abonnement over.
        PushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => $hash],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            ],
        );

        return response()->json([
            'message' => 'Meldingen staan aan op dit apparaat.',
            'count' => $request->user()->pushSubscriptions()->count(),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        if ($response = $this->unavailable(requireKeys: false)) {
            return $response;
        }

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048'],
        ]);

        $request->user()->pushSubscriptions()
            ->where('endpoint_hash', PushSubscription::hashEndpoint($data['endpoint']))
            ->delete();

        return response()->json([
            'message' => 'Meldingen staan uit op dit apparaat.',
            'count' => $request->user()->pushSubscriptions()->count(),
        ]);
    }

    public function test(Request $request, PushNotifier $notifier): JsonResponse
    {
        if ($response = $this->unavailable()) {
            return $response;
        }

        $user = $request->user();
        if (! $user->pushSubscriptions()->exists()) {
            return response()->json(['message' => 'Er is nog geen apparaat aangemeld. Zet eerst meldingen aan.'], 422);
        }

        $stats = $notifier->sendToUsers([$user], null, 'Testmelding Kivii CRM', 'Pushmeldingen werken op dit apparaat.', route('profile.show', [], false).'#push-notifications', 'test');

        if ($stats['sent'] > 0) {
            $message = $stats['sent'] === 1 ? 'Testmelding verstuurd naar 1 apparaat.' : 'Testmelding verstuurd naar '.$stats['sent'].' apparaten.';
        } else {
            $message = 'De testmelding kon niet worden afgeleverd.';
        }
        if ($stats['removed'] > 0) {
            $message .= ' Verlopen aanmeldingen verwijderd: '.$stats['removed'].'. Zet meldingen op dit apparaat zo nodig opnieuw aan.';
        }

        return response()->json(['message' => $message, 'stats' => $stats], $stats['sent'] > 0 ? 200 : 422);
    }

    public function preferences(Request $request): JsonResponse
    {
        if ($response = $this->unavailable(requireKeys: false)) {
            return $response;
        }

        $user = $request->user();
        $allowed = PushNotifier::typesFor($user);

        $data = $request->validate([
            'types' => ['required', 'array'],
            'types.*' => ['boolean'],
        ]);

        $prefs = is_array($user->push_preferences) ? $user->push_preferences : [];
        foreach ($data['types'] as $type => $enabled) {
            if (in_array($type, $allowed, true)) {
                $prefs[$type] = (bool) $enabled;
            }
        }
        $user->forceFill(['push_preferences' => $prefs])->save();

        return response()->json(['message' => 'Voorkeuren opgeslagen.']);
    }

    private function unavailable(bool $requireKeys = true): ?JsonResponse
    {
        try {
            $hasTable = \Illuminate\Support\Facades\Schema::hasTable('push_subscriptions');
        } catch (\Throwable) {
            $hasTable = false;
        }

        if (! $hasTable) {
            return response()->json(['message' => 'Pushmeldingen zijn nog niet geactiveerd: de databasemigratie ontbreekt.'], 503);
        }
        if ($requireKeys && ! PushNotifier::configured()) {
            return response()->json(['message' => 'Pushmeldingen zijn nog niet ingesteld (admin: draai crm:webpush-keys).'], 503);
        }

        return null;
    }
}
