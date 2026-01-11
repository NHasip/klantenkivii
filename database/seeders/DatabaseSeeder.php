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
            ['naam' => 'Basis', 'omschrijving' => 'Basis abonnement', 'default_visible' => true],
            ['naam' => 'Planning', 'omschrijving' => 'Afspraken en planning', 'default_visible' => true],
            ['naam' => 'Rapportages', 'omschrijving' => 'Rapportages en inzichten', 'default_visible' => true],
            ['naam' => 'SEPA Incasso', 'omschrijving' => 'SEPA incasso ondersteuning', 'default_visible' => true],
            ['naam' => 'Koppelingen', 'omschrijving' => 'Externe koppelingen / API', 'default_visible' => false],
        ];

        foreach ($modules as $module) {
            Module::query()->firstOrCreate(['naam' => $module['naam']], $module);
        }
    }
}
