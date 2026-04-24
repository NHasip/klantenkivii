<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\Passkeys\WebAuthnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PasskeyLoginController extends Controller
{
    public function options(Request $request, WebAuthnService $webAuthn): JsonResponse
    {
        if (! Schema::hasTable('passkeys')) {
            throw ValidationException::withMessages([
                'email' => 'Passkeys zijn nog niet geactiveerd op de server.',
            ]);
        }

        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()
            ->where('email', $data['email'])
            ->where('active', true)
            ->with('passkeys')
            ->first();

        if (! $user || $user->passkeys->isEmpty()) {
            throw ValidationException::withMessages([
                'email' => 'Voor dit account is geen passkey beschikbaar.',
            ]);
        }

        return response()->json($webAuthn->authenticationOptions($request, $user));
    }

    public function verify(Request $request, WebAuthnService $webAuthn): JsonResponse
    {
        if (! Schema::hasTable('passkeys')) {
            throw ValidationException::withMessages([
                'email' => 'Passkeys zijn nog niet geactiveerd op de server.',
            ]);
        }

        $data = $request->validate([
            'email' => ['required', 'email'],
            'credential' => ['required', 'array'],
        ]);

        $user = User::query()
            ->where('email', $data['email'])
            ->where('active', true)
            ->with('passkeys')
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Gebruiker niet gevonden.',
            ]);
        }

        $webAuthn->verifyAuthentication($request, $user, $data['credential']);

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'status' => 'ok',
            'redirect' => route('dashboard'),
        ]);
    }
}
