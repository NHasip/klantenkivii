<?php

namespace App\Services\Leads;

use App\Enums\ActivityType;
use App\Enums\GarageCompanySource;
use App\Enums\GarageCompanyStatus;
use App\Models\Activity;
use App\Models\CustomerPerson;
use App\Models\GarageCompany;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LeadIngestor
{
    /**
     * @param  array{bedrijfsnaam:string,contactnaam?:string,email:string,telefoon?:string,plaats?:string,bericht?:string,bron?:string}  $data
     */
    public function ingest(array $data, string $kanaal, ?string $raw = null): GarageCompany
    {
        $admin = User::query()
            ->where('role', 'admin')
            ->orderBy('id')
            ->firstOrFail();

        return DB::transaction(function () use ($data, $kanaal, $raw, $admin) {
            $company = GarageCompany::query()
                ->where('bedrijfsnaam', $data['bedrijfsnaam'])
                ->where('hoofd_email', $data['email'])
                ->first();

            $bron = isset($data['bron'])
                ? GarageCompanySource::from($data['bron'])
                : ($company?->bron ?? GarageCompanySource::WebsiteFormulier);

            $attributes = [
                'bedrijfsnaam' => $data['bedrijfsnaam'],
                'hoofd_email' => $data['email'],
                'hoofd_telefoon' => $data['telefoon'] ?? ($company?->hoofd_telefoon ?? 'Onbekend'),
                'plaats' => $data['plaats'] ?? ($company?->plaats ?? 'Onbekend'),
                'bron' => $bron,
                'status' => GarageCompanyStatus::DemoAangevraagd,
                'demo_aangevraagd_op' => now(),
            ];

            if ($company) {
                $company->fill($attributes)->save();
            } else {
                $company = GarageCompany::create([
                    ...$attributes,
                    'created_by' => $admin->id,
                ]);
            }

            $contactnaam = trim((string) ($data['contactnaam'] ?? ''));
            if ($contactnaam !== '') {
                [$voornaam, $achternaam] = $this->splitName($contactnaam);

                $person = CustomerPerson::query()
                    ->where('garage_company_id', $company->id)
                    ->where('email', $data['email'])
                    ->first();

                $personAttributes = [
                    'garage_company_id' => $company->id,
                    'voornaam' => $voornaam,
                    'achternaam' => $achternaam,
                    'email' => $data['email'],
                    'telefoon' => $data['telefoon'] ?? $person?->telefoon,
                    'is_primary' => true,
                    'active' => true,
                ];

                if ($person) {
                    $person->fill($personAttributes)->save();
                } else {
                    $newPerson = CustomerPerson::create($personAttributes);

                    CustomerPerson::query()
                        ->where('garage_company_id', $company->id)
                        ->whereKeyNot($newPerson->id)
                        ->update(['is_primary' => false]);
                }
            }

            $inhoud = $data['bericht'] ?? null;
            if ($raw) {
                $inhoud = trim(($inhoud ? $inhoud."\n\n" : '')."--- RAW ---\n".$raw);
            }

            Activity::create([
                'garage_company_id' => $company->id,
                'type' => ActivityType::Demo,
                'titel' => "Demo aangevraagd ({$kanaal})",
                'inhoud' => $inhoud,
                'created_by' => $admin->id,
            ]);

            return $company;
        });
    }

    /**
     * @return array{0:string,1:string}
     */
    private function splitName(string $fullName): array
    {
        $name = trim(preg_replace('/\s+/', ' ', $fullName) ?? $fullName);
        if ($name === '') {
            return ['Onbekend', ''];
        }

        $parts = explode(' ', $name);
        if (count($parts) === 1) {
            return [$parts[0], ''];
        }

        $voornaam = array_shift($parts);
        $achternaam = implode(' ', $parts);

        return [$voornaam, $achternaam];
    }
}
