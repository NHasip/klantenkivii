<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Module;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $email = (string) env('KIVII_ADMIN_EMAIL', 'admin@kivii.local');
        $password = (string) env('KIVII_ADMIN_PASSWORD', 'Kivii12345!');

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('KIVII_ADMIN_NAME', 'Kivii Admin'),
                'password' => Hash::make($password),
                'role' => 'admin',
                'active' => true,
            ],
        );

        $modules = [
            ['naam' => 'Basis', 'omschrijving' => 'Basis abonnement', 'default_visible' => true, 'default_prijs_maand_excl' => 99.00, 'default_btw_percentage' => 21.00],
            ['naam' => 'Planning', 'omschrijving' => 'Afspraken en planning', 'default_visible' => true, 'default_prijs_maand_excl' => 49.00, 'default_btw_percentage' => 21.00],
            ['naam' => 'Rapportages', 'omschrijving' => 'Rapportages en inzichten', 'default_visible' => true, 'default_prijs_maand_excl' => 29.00, 'default_btw_percentage' => 21.00],
            ['naam' => 'SEPA Incasso', 'omschrijving' => 'SEPA incasso ondersteuning', 'default_visible' => true, 'default_prijs_maand_excl' => 19.00, 'default_btw_percentage' => 21.00],
            ['naam' => 'Koppelingen', 'omschrijving' => 'Externe koppelingen / API', 'default_visible' => false, 'default_prijs_maand_excl' => 39.00, 'default_btw_percentage' => 21.00],
        ];

        foreach ($modules as $module) {
            Module::query()->firstOrCreate(['naam' => $module['naam']], $module);
        }
    }
}
