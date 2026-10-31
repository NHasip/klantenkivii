<?php

namespace App\Console\Commands;

use App\Services\Crm\DemoMailSequenceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SendDemoSequence extends Command
{
    protected $signature = 'crm:demo-sequence';

    protected $description = 'Verstuur de demo-mails (dag 2, 5 en 13) die aan de beurt zijn via Microsoft Graph.';

    public function handle(DemoMailSequenceService $service): int
    {
        if (! DemoMailSequenceService::available()) {
            $this->warn('De migratie voor de demo-mailreeks is nog niet uitgevoerd.');

            return self::SUCCESS;
        }

        $lock = Cache::lock('crm-demo-sequence', 900);
        if (! $lock->get()) {
            $this->warn('Een andere run van de demo-mailreeks is nog bezig.');

            return self::SUCCESS;
        }

        try {
            $stats = $service->processDue();
        } finally {
            $lock->release();
        }

        if ($stats['graph_missing'] && $stats['waiting'] > 0) {
            $message = 'Demo-mailreeks: '.$stats['waiting'].' mail(s) wachten, de Microsoft-koppeling voor info@kivii.nl is niet ingesteld.';
            $this->warn($message);
            Log::warning($message);
        }

        $this->info(sprintf(
            'Demo-mailreeks: %d verstuurd, %d overgeslagen, %d mislukt, %d wachtend%s, %d gestopt.',
            $stats['sent'], $stats['skipped'], $stats['failed'], $stats['waiting'],
            $stats['outside_window'] && $stats['waiting'] > 0 ? ' (buiten verzendtijden 08:00-20:00)' : '',
            $stats['stopped'],
        ));

        return self::SUCCESS;
    }
}
