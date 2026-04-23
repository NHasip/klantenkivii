<?php

namespace Tests\Feature\Crm;

use App\Models\GarageCompany;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GarageCompanyDemoStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_set_status_to_active_without_active_mandate(): void
    {
        config(['crm.require_admin_2fa' => false]);

        $user = User::factory()->create([
            'role' => 'admin',
            'active' => true,
        ]);

        $company = GarageCompany::create([
            'bedrijfsnaam' => 'Test Garage BV',
            'plaats' => 'Utrecht',
            'land' => 'Nederland',
            'hoofd_email' => 'garage@example.test',
            'hoofd_telefoon' => '0612345678',
            'status' => 'lead',
            'bron' => 'website_formulier',
            'created_by' => $user->id,
        ]);

        $showUrl = route('crm.garage_companies.show', [
            'garageCompany' => $company->id,
            'tab' => 'demo_status',
        ]);

        $response = $this->actingAs($user)
            ->from($showUrl)
            ->patch(route('crm.garage_companies.demo.status', ['garageCompany' => $company->id]), [
                'status' => 'actief',
            ]);

        $response->assertRedirect($showUrl);

        $company->refresh();
        $this->assertSame('actief', $company->status->value);
        $this->assertNotNull($company->actief_vanaf);
    }
}

