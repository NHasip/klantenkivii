<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Models\Passkey;
use App\Services\Security\Passkeys\WebAuthnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PasskeyController extends Controller
{
    public function options(Request $request, WebAuthnService $webAuthn): JsonResponse
    {
        if (! Schema::hasTable('passkeys')) {
            throw ValidationException::withMessages([
                'passkey' => 'Passkeys zijn nog niet geactiveerd op deze omgeving.',
            ]);
        }

        $user = $request->user()->load('passkeys');

        return response()->json($webAuthn->registrationOptions($request, $user));
    }

    public function store(Request $request, WebAuthnService $webAuthn): JsonResponse
    {
        if (! Schema::hasTable('passkeys')) {
            throw ValidationException::withMessages([
                'passkey' => 'Passkeys zijn nog niet geactiveerd op deze omgeving.',
            ]);
        }

        $data = $request->validate([
            'credential' => ['required', 'array'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $passkey = $webAuthn->registerCredential(
            $request,
            $request->user(),
            $data['credential'],
            $data['name'] ?? null,
        );

        return response()->json([
            'status' => 'ok',
            'passkey' => [
                'id' => $passkey->id,
                'name' => $passkey->name,
            ],
        ]);
    }

    public function destroy(Request $request, Passkey $passkey): RedirectResponse
    {
        if (! Schema::hasTable('passkeys')) {
            return back()->with('status', 'Passkeys zijn nog niet geactiveerd op deze omgeving.');
        }

        abort_unless($passkey->user_id === $request->user()->id, 404);

        $passkey->delete();

        return back()->with('status', 'Passkey verwijderd.');
    }
}
