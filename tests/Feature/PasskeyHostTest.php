<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasskeyHostTest extends TestCase
{
    use RefreshDatabase;

    private const HOST = 'https://klanten.necmardemo.nl';

    public function test_passkey_config_is_locked_to_klanten_necmardemo(): void
    {
        $this->assertSame('klanten.necmardemo.nl', config('security.passkeys.host'));
        $this->assertSame('klanten.necmardemo.nl', config('security.passkeys.rp_id'));
        $this->assertSame(['https://klanten.necmardemo.nl'], config('security.passkeys.origins'));
    }

    public function test_login_page_shows_passkey_button_only_on_allowed_host(): void
    {
        $this->get(self::HOST.'/login')->assertOk()->assertSee('Inloggen met passkey');
        $this->get('https://kiviidemo.nl/login')->assertOk()->assertDontSee('Inloggen met passkey');
        $this->get('http://localhost/login')->assertOk()->assertDontSee('Inloggen met passkey');
    }

    public function test_passkey_login_endpoints_are_404_on_other_hosts(): void
    {
        $this->postJson('https://kiviidemo.nl/auth/passkey/options', ['email' => 'a@b.nl'])->assertNotFound();
        $this->postJson('https://kiviidemo.nl/auth/passkey/verify', ['email' => 'a@b.nl', 'credential' => ['x' => 1]])->assertNotFound();
    }

    public function test_passkey_options_use_fixed_rp_id_on_allowed_host(): void
    {
        $response = $this->postJson(self::HOST.'/auth/passkey/options', ['email' => 'onbekend@voorbeeld.nl']);

        $response->assertOk();
        $this->assertSame('klanten.necmardemo.nl', $response->json('rpId') ?? $response->json('publicKey.rpId'));
    }

    public function test_profile_passkey_endpoints_are_404_on_other_hosts(): void
    {
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)->postJson('https://kiviidemo.nl/user/profile/passkeys/options')->assertNotFound();
    }
}
