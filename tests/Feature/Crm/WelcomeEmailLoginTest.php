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

    public function test_loginnaam_falls_back_to_demo_request_email(): void
    {
        [$user, $company] = $this->setUpCompany(['login_password' => 'Geheim123!']);

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', 'Welkomstmail verstuurd.');

        $sent = OutboundEmail::query()->where('garage_company_id', $company->id)->where('status', 'sent')->first();
        $this->assertStringContainsString('klant@example.test', $sent->body_html);
        $this->assertStringNotContainsString('Loginnaam:</strong> -', $sent->body_html);
    }

    public function test_stale_untouched_draft_is_rebuilt_with_current_data(): void
    {
        [$user, $company] = $this->setUpCompany(['login_password' => 'Geheim123!']);
        // Oud concept van voor de update, met verouderde tekst.
        OutboundEmail::create([
            'garage_company_id' => $company->id, 'type' => 'welcome_customer', 'to_email' => 'klant@example.test',
            'subject' => 'Welkom', 'body_html' => '<p>Loginnaam: -</p><p>Wachtwoord: Gebruik de activatielink om een wachtwoord te kiezen.</p>',
            'body_text' => '', 'status' => 'draft', 'created_by' => $user->id,
        ]);

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', 'Welkomstmail verstuurd.');

        $sent = OutboundEmail::query()->where('garage_company_id', $company->id)->where('status', 'sent')->first();
        $this->assertStringContainsString('klant@example.test', $sent->body_html);
        $this->assertStringContainsString('Geheim123!', $sent->body_html);
        $this->assertStringNotContainsString('activatielink', $sent->body_html);
    }

    public function test_manually_edited_draft_is_kept(): void
    {
        [$user, $company] = $this->setUpCompany(['login_password' => 'Geheim123!']);
        $this->actingAs($user)->post(route('crm.garage_companies.welcome.update', $company), [
            'subject' => 'Eigen onderwerp', 'body_html' => '<p>Eigen tekst</p>',
        ])->assertSessionHas('status', 'Welkomstmail concept opgeslagen.');

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', 'Welkomstmail verstuurd.');

        $sent = OutboundEmail::query()->where('garage_company_id', $company->id)->where('status', 'sent')->first();
        $this->assertSame('Eigen onderwerp', $sent->subject);
        $this->assertStringContainsString('Eigen tekst', $sent->body_html);
    }

    public function test_send_is_blocked_without_password(): void
    {
        [$user, $company] = $this->setUpCompany();

        $this->actingAs($user)->post(route('crm.garage_companies.welcome.send', $company))
            ->assertSessionHas('status', fn ($st) => str_contains($st, 'Niet verstuurd') && str_contains($st, 'wachtwoord') && ! str_contains($st, 'login e-mail'));
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
