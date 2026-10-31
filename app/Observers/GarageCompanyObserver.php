<?php

namespace App\Observers;

use App\Models\GarageCompany;
use App\Services\Crm\DemoMailSequenceService;

/**
 * Vangt elke opgeslagen statuswijziging op (klantpagina, snelle statusknoppen, pauzeren, hervatten, ...)
 * en start of stopt de demo-mailreeks. Een fout hier mag het opslaan van de klant nooit blokkeren.
 */
class GarageCompanyObserver
{
    public function updated(GarageCompany $company): void
    {
        if (! $company->wasChanged('status')) {
            return;
        }

        try {
            app(DemoMailSequenceService::class)->handleStatusChange(
                $company,
                (string) $company->getRawOriginal('status'),
                (string) $company->status?->value,
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
