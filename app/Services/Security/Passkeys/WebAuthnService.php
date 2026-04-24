<?php

namespace App\Services\Security\Passkeys;

use App\Models\Passkey;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use JsonException;

class WebAuthnService
{
    public function registrationOptions(Request $request, User $user): array
    {
        $challenge = Base64Url::encode(random_bytes(32));
        $request->session()->put($this->registrationChallengeKey($user->id), $challenge);

        return [
            'rp' => [
                'name' => $this->rpName(),
                'id' => $this->rpId($request),
            ],
            'user' => [
                'id' => Base64Url::encode((string) $user->id),
                'name' => (string) $user->email,
                'displayName' => (string) $user->name,
            ],
            'challenge' => $challenge,
            'pubKeyCredParams' => [
                ['type' => 'public-key', 'alg' => -7], // ES256
            ],
            'timeout' => 60000,
            'attestation' => 'none',
            'authenticatorSelection' => [
                'residentKey' => 'preferred',
                'userVerification' => $this->userVerification(),
            ],
            'excludeCredentials' => $user->passkeys
                ->map(fn (Passkey $passkey) => [
                    'type' => 'public-key',
                    'id' => $passkey->credential_id,
                    'transports' => $passkey->transports ?: [],
                ])
                ->values()
                ->all(),
        ];
    }

    public function registerCredential(Request $request, User $user, array $credential, ?string $name = null): Passkey
    {
        $expectedChallenge = (string) $request->session()->get($this->registrationChallengeKey($user->id), '');
        if ($expectedChallenge === '') {
            throw ValidationException::withMessages([
                'passkey' => 'Registratie challenge ontbreekt. Start opnieuw.',
            ]);
        }

        $clientDataJson = Base64Url::decode((string) Arr::get($credential, 'response.clientDataJSON', ''));
        $clientData = $this->parseClientData($clientDataJson, 'webauthn.create');
        $this->assertChallengeAndOrigin($request, $clientData, $expectedChallenge);

        $attestationObject = Base64Url::decode((string) Arr::get($credential, 'response.attestationObject', ''));
        $attestation = CborDecoder::decode($attestationObject);
        if (! is_array($attestation) || ! isset($attestation['authData']) || ! is_string($attestation['authData'])) {
            throw ValidationException::withMessages([
                'passkey' => 'Attestation payload is ongeldig.',
            ]);
        }

        $parsed = $this->parseRegistrationAuthData($attestation['authData'], $this->rpId($request));
        $credentialId = (string) Arr::get($credential, 'id', '');
        if ($credentialId === '') {
            $credentialId = Base64Url::encode($parsed['credential_id_raw']);
        }

        $existingPasskey = Passkey::query()->where('credential_id', $credentialId)->first();
        if ($existingPasskey && $existingPasskey->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'passkey' => 'Deze passkey is al gekoppeld aan een ander account.',
            ]);
        }

        $passkey = $existingPasskey ?: new Passkey(['credential_id' => $credentialId]);
        $passkey->fill([
            'user_id' => $user->id,
            'name' => filled($name) ? trim((string) $name) : ($passkey->name ?: 'Passkey'),
            'public_key_pem' => $parsed['public_key_pem'],
            'sign_count' => $parsed['sign_count'],
            'transports' => Arr::wrap(Arr::get($credential, 'response.transports', [])),
            'last_used_at' => now(),
        ]);
        $passkey->save();

        $request->session()->forget($this->registrationChallengeKey($user->id));

        return $passkey;
    }

    public function authenticationOptions(Request $request, User $user): array
    {
        $challenge = Base64Url::encode(random_bytes(32));
        $request->session()->put($this->authenticationChallengeKey($user->id), $challenge);

        return [
            'challenge' => $challenge,
            'timeout' => 60000,
            'rpId' => $this->rpId($request),
            'userVerification' => $this->userVerification(),
            'allowCredentials' => $user->passkeys
                ->map(fn (Passkey $passkey) => [
                    'type' => 'public-key',
                    'id' => $passkey->credential_id,
                    'transports' => $passkey->transports ?: [],
                ])
                ->values()
                ->all(),
        ];
    }

    public function verifyAuthentication(Request $request, User $user, array $credential): Passkey
    {
        $expectedChallenge = (string) $request->session()->get($this->authenticationChallengeKey($user->id), '');
        if ($expectedChallenge === '') {
            throw ValidationException::withMessages([
                'passkey' => 'Login challenge ontbreekt. Probeer opnieuw.',
            ]);
        }

        $credentialId = (string) Arr::get($credential, 'id', '');
        $passkey = $user->passkeys()->where('credential_id', $credentialId)->first();
        if (! $passkey) {
            throw ValidationException::withMessages([
                'email' => 'Geen geldige passkey gevonden voor deze gebruiker.',
            ]);
        }

        $clientDataJson = Base64Url::decode((string) Arr::get($credential, 'response.clientDataJSON', ''));
        $clientData = $this->parseClientData($clientDataJson, 'webauthn.get');
        $this->assertChallengeAndOrigin($request, $clientData, $expectedChallenge);

        $authenticatorData = Base64Url::decode((string) Arr::get($credential, 'response.authenticatorData', ''));
        $signature = Base64Url::decode((string) Arr::get($credential, 'response.signature', ''));

        $authData = $this->parseAuthenticationAuthData($authenticatorData, $this->rpId($request));
        $signedData = $authenticatorData.hash('sha256', $clientDataJson, true);
        $valid = openssl_verify($signedData, $signature, $passkey->public_key_pem, OPENSSL_ALGO_SHA256) === 1;

        if (! $valid) {
            throw ValidationException::withMessages([
                'email' => 'Passkey verificatie is mislukt.',
            ]);
        }

        if ($passkey->sign_count > 0 && $authData['sign_count'] > 0 && $authData['sign_count'] <= $passkey->sign_count) {
            throw ValidationException::withMessages([
                'email' => 'Passkey teller is ongeldig. Registreer de passkey opnieuw.',
            ]);
        }

        $passkey->forceFill([
            'sign_count' => max((int) $passkey->sign_count, $authData['sign_count']),
            'last_used_at' => now(),
        ])->save();

        $request->session()->forget($this->authenticationChallengeKey($user->id));

        return $passkey;
    }

    private function parseClientData(string $clientDataJson, string $expectedType): array
    {
        try {
            $clientData = json_decode($clientDataJson, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ValidationException::withMessages([
                'passkey' => 'clientDataJSON is ongeldig.',
            ]);
        }

        if (! is_array($clientData) || ($clientData['type'] ?? null) !== $expectedType) {
            throw ValidationException::withMessages([
                'passkey' => 'Onverwacht WebAuthn request type.',
            ]);
        }

        return $clientData;
    }

    private function assertChallengeAndOrigin(Request $request, array $clientData, string $expectedChallenge): void
    {
        if (($clientData['challenge'] ?? '') !== $expectedChallenge) {
            throw ValidationException::withMessages([
                'passkey' => 'Challenge komt niet overeen.',
            ]);
        }

        $origin = (string) ($clientData['origin'] ?? '');
        if (! in_array($origin, $this->allowedOrigins($request), true)) {
            throw ValidationException::withMessages([
                'passkey' => 'Origin is niet toegestaan.',
            ]);
        }
    }

    /**
     * @return array{credential_id_raw:string,public_key_pem:string,sign_count:int}
     */
    private function parseRegistrationAuthData(string $authData, string $rpId): array
    {
        if (strlen($authData) < 55) {
            throw ValidationException::withMessages(['passkey' => 'authData is te kort.']);
        }

        $this->assertRpIdHash($authData, $rpId);
        $flags = ord($authData[32]);

        if (($flags & 0x01) === 0) {
            throw ValidationException::withMessages(['passkey' => 'User Presence ontbreekt in authData.']);
        }

        if (($flags & 0x40) === 0) {
            throw ValidationException::withMessages(['passkey' => 'Attested credential data ontbreekt.']);
        }

        $signCount = unpack('N', substr($authData, 33, 4))[1];
        $offset = 37;
        $offset += 16; // aaguid

        if (! isset($authData[$offset + 1])) {
            throw ValidationException::withMessages(['passkey' => 'Credential lengte ontbreekt in authData.']);
        }

        $credentialIdLength = unpack('n', substr($authData, $offset, 2))[1];
        $offset += 2;
        if (strlen($authData) < $offset + $credentialIdLength) {
            throw ValidationException::withMessages(['passkey' => 'Credential ID ontbreekt of is beschadigd.']);
        }

        $credentialIdRaw = substr($authData, $offset, $credentialIdLength);
        $offset += $credentialIdLength;

        [$coseKey] = CborDecoder::decodeWithOffset(substr($authData, $offset));

        return [
            'credential_id_raw' => $credentialIdRaw,
            'public_key_pem' => $this->coseToPem($coseKey),
            'sign_count' => (int) $signCount,
        ];
    }

    /**
     * @return array{sign_count:int}
     */
    private function parseAuthenticationAuthData(string $authData, string $rpId): array
    {
        if (strlen($authData) < 37) {
            throw ValidationException::withMessages(['passkey' => 'authenticatorData is te kort.']);
        }

        $this->assertRpIdHash($authData, $rpId);
        $flags = ord($authData[32]);
        if (($flags & 0x01) === 0) {
            throw ValidationException::withMessages(['passkey' => 'User Presence ontbreekt in assertion.']);
        }

        $signCount = unpack('N', substr($authData, 33, 4))[1];

        return ['sign_count' => (int) $signCount];
    }

    private function assertRpIdHash(string $authData, string $rpId): void
    {
        $expected = hash('sha256', $rpId, true);
        $actual = substr($authData, 0, 32);

        if (! hash_equals($expected, $actual)) {
            throw ValidationException::withMessages(['passkey' => 'RP ID hash mismatch.']);
        }
    }

    /**
     * @param array<mixed> $coseKey
     */
    private function coseToPem(array $coseKey): string
    {
        $kty = $coseKey[1] ?? null;
        $alg = $coseKey[3] ?? null;
        $crv = $coseKey[-1] ?? null;
        $x = $coseKey[-2] ?? null;
        $y = $coseKey[-3] ?? null;

        if ($kty !== 2 || $alg !== -7 || $crv !== 1 || ! is_string($x) || ! is_string($y)) {
            throw ValidationException::withMessages([
                'passkey' => 'Alleen ES256 passkeys worden ondersteund.',
            ]);
        }

        $uncompressedKey = "\x04".$x.$y;
        $spkiPrefix = hex2bin('3059301306072A8648CE3D020106082A8648CE3D030107034200');
        $spki = $spkiPrefix.$uncompressedKey;

        return "-----BEGIN PUBLIC KEY-----\n"
            .chunk_split(base64_encode($spki), 64, "\n")
            ."-----END PUBLIC KEY-----\n";
    }

    private function rpName(): string
    {
        return (string) config('security.passkeys.rp_name', config('app.name', 'Kivii CRM'));
    }

    private function rpId(Request $request): string
    {
        $configured = trim((string) config('security.passkeys.rp_id', ''));
        if ($configured !== '') {
            return $configured;
        }

        $host = (string) parse_url($request->getSchemeAndHttpHost(), PHP_URL_HOST);
        if ($host !== '') {
            return $host;
        }

        return (string) parse_url((string) config('app.url', ''), PHP_URL_HOST);
    }

    /**
     * @return array<int, string>
     */
    private function allowedOrigins(Request $request): array
    {
        $configured = config('security.passkeys.origins', []);
        if (is_string($configured)) {
            $configured = array_filter(array_map('trim', explode(',', $configured)));
        }

        $origins = [];
        foreach ((array) $configured as $origin) {
            if (is_string($origin) && trim($origin) !== '') {
                $origins[] = trim($origin);
            }
        }

        $origins[] = rtrim($request->getSchemeAndHttpHost(), '/');
        $appUrl = trim((string) config('app.url', ''));
        if ($appUrl !== '') {
            $origins[] = rtrim($appUrl, '/');
        }

        return array_values(array_unique($origins));
    }

    private function userVerification(): string
    {
        $mode = (string) config('security.passkeys.user_verification', 'preferred');
        if (! in_array($mode, ['required', 'preferred', 'discouraged'], true)) {
            return 'preferred';
        }

        return $mode;
    }

    private function registrationChallengeKey(int $userId): string
    {
        return "passkeys.registration.{$userId}.challenge";
    }

    private function authenticationChallengeKey(int $userId): string
    {
        return "passkeys.authentication.{$userId}.challenge";
    }
}
