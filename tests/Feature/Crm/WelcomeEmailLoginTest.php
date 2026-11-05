<?php

namespace Tests\Feature\Crm;

use App\Models\GarageCompany;
use App\Models\OutboundEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class WelcomeEmailLoginTest extends TestCase
{
    use RefreshDatabase;

    private function setUpCompany(array $attrs = []): array
    {
        config([
            'crm.require_admin_2fa' => false,
            'services.msgraph.tenant_id' => 't', 'services.msgraph.client_id' => 'c',
            'services.msgraph.client_secret' => 's', 'services.msgraph.sender' => 'info@kivii.nl',
        ]);
        Mail::fake();

        $user = User::factory()->create(['role' => 'admin', 'active' => true]);
        $company = GarageCompany::create(array_merge([
            'bedrijfsnaam' => 'AKCA Test',
            'plaats' => 'Almere',
            'land' => 'Nederland',
            'hoofd_email' => 'klant@example.test',
            'hoofd_telefoon' => '0612345678',
            'status' => 'lead',
            'bron' => 'website_formulier',
            'created_by' => $user->id,
        ], $attrs));

        return [$user, $company];
    }

    public function test_send_is_blocked_without_login_data(): void
    {
        [$user, $company] = $this->setUpCompany();

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', fn ($s) => str_contains($s, 'Niet verstuurd') && str_contains($s, 'login e-mail') && str_contains($s, 'wachtwoord'));

        $this->assertFalse(OutboundEmail::query()->where('garage_company_id', $company->id)->where('status', 'sent')->exists());
    }

    public function test_send_works_with_login_data_and_mail_contains_it(): void
    {
        [$user, $company] = $this->setUpCompany(['login_email' => 'login@akca.test', 'login_password' => 'Geheim123!']);

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', 'Welkomstmail verstuurd.');

        $sent = OutboundEmail::query()->where('garage_company_id', $company->id)->where('status', 'sent')->first();
        $this->assertNotNull($sent);
        $this->assertStringContainsString('login@akca.test', $sent->body_html);
        $this->assertStringContainsString('Geheim123!', $sent->body_html);
    }
}
