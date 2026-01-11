<?php

namespace Tests\Feature\Crm;

use App\Livewire\Crm\GarageCompanies\Create;
use App\Models\GarageCompany;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class CreateCustomerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_customer_with_primary_person_and_pending_mandate(): void
    {
        $user = User::factory()->create([
            'active' => true,
            'role' => 'admin',
        ]);

        $this->actingAs($user);

        Livewire::test(Create::class)
            ->set('bedrijfsnaam', 'Garage Test BV')
            ->set('land', 'Nederland')
            ->set('voor_en_achternaam', 'Jan Jansen')
            ->set('email', 'jan@example.test')
            ->set('telefoonnummer', '0612345678')
            ->set('straatnaam_en_nummer', 'Teststraat 1')
            ->set('postcode', '1234AB')
            ->set('plaats', 'Utrecht')
            ->set('iban', 'NL91ABNA0417164300')
            ->set('bic', 'ABNANL2A')
            ->set('plaats_van_tekenen', 'Utrecht')
            ->set('datum_van_tekenen', now()->toDateString())
            ->set('status', 'lead')
            ->set('bron', 'website_formulier')
            ->call('save')
            ->assertHasNoErrors();

        $company = GarageCompany::query()->where('bedrijfsnaam', 'Garage Test BV')->firstOrFail();

        $this->assertDatabaseHas('customer_persons', [
            'garage_company_id' => $company->id,
            'email' => 'jan@example.test',
            'is_primary' => 1,
        ]);

        $this->assertDatabaseHas('sepa_mandates', [
            'garage_company_id' => $company->id,
            'iban' => 'NL91ABNA0417164300',
            'status' => 'pending',
        ]);
    }
}

