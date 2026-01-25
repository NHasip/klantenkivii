<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadsWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_request_without_valid_token(): void
    {
        config()->set('services.leads_webhook.token', 'expected-token');

        $this->postJson('/api/leads/webhook', [
            'bedrijfsnaam' => 'Posthumuswinkel Test BV',
            'contactnaam' => 'Jan Jansen',
            'email' => 'jan@example.test',
        ])->assertStatus(401);
    }

    public function test_accepts_json_payload_and_creates_lead(): void
    {
        config()->set('services.leads_webhook.token', 'expected-token');

        User::factory()->create([
            'active' => true,
            'role' => 'admin',
        ]);

        $response = $this->withHeader('X-Webhook-Token', 'expected-token')
            ->postJson('/api/leads/webhook', [
                'bedrijfsnaam' => 'Posthumuswinkel Test BV',
                'contactnaam' => 'Jan Jansen',
                'email' => 'jan@example.test',
                'telefoon' => '0612345678',
                'plaats' => 'Utrecht',
                'bericht' => 'Demo aanvraag via website.',
                'bron' => 'website_formulier',
            ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'OK',
            ])
            ->assertJsonStructure([
                'garage_company_id',
            ]);

        $this->assertDatabaseHas('garage_companies', [
            'bedrijfsnaam' => 'Posthumuswinkel Test BV',
            'hoofd_email' => 'jan@example.test',
            'plaats' => 'Utrecht',
            'bron' => 'website_formulier',
        ]);

        $this->assertDatabaseHas('customer_persons', [
            'email' => 'jan@example.test',
            'is_primary' => 1,
            'active' => 1,
        ]);

        $this->assertDatabaseHas('activities', [
            'titel' => 'Demo aangevraagd (webhook)',
        ]);
    }
}

