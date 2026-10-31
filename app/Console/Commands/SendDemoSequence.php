<?php

namespace App\Console\Commands;

use App\Services\Crm\DemoMailSequenceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SendDemoSequence extends Command
{
    protected $signature = 'crm:demo-sequence {--test : Alleen reeksen in testmodus verwerken (mails na 2, 5 en 13 minuten)}';

    protected $description = 'Verstuur de demo-mails (dag 2, 5 en 13) die aan de beurt zijn via Microsoft Graph. Zonder --test alleen normale reeksen.';

    public function handle(DemoMailSequenceService $service): int
    {
        if (! DemoMailSequenceService::available()) {
            $this->warn('De migratie voor de demo-mailreeks is nog niet uitgevoerd.');

            return self::SUCCESS;
        }

        $test = (bool) $this->option('test');
        // De minuuttaak doet niets (en logt niets) zolang er geen actieve testreeks is.
        if ($test && ! DemoMailSequenceService::hasActiveTestSequences()) {
            return self::SUCCESS;
        }

        $lock = Cache::lock($test ? 'crm-demo-sequence-test' : 'crm-demo-sequence', $test ? 120 : 900);
        if (! $lock->get()) {
            $this->warn('Een andere run van de demo-mailreeks is nog bezig.');

            return self::SUCCESS;
        }

        try {
            $stats = $service->processDue(null, $test);
        } finally {
            $lock->release();
        }

        if ($stats['graph_missing'] && $stats['waiting'] > 0) {
            $message = ($test ? '[test] ' : '').'Demo-mailreeks: '.$stats['waiting'].' mail(s) wachten, de Microsoft-koppeling voor info@kivii.nl is niet ingesteld.';
            $this->warn($message);
            Log::warning($message);
        }

        $this->info(sprintf(
            ($test ? '[test] ' : '').'Demo-mailreeks: %d verstuurd, %d overgeslagen, %d mislukt, %d wachtend%s, %d gestopt.',
            $stats['sent'], $stats['skipped'], $stats['failed'], $stats['waiting'],
            $stats['outside_window'] && $stats['waiting'] > 0 ? ' (buiten verzendtijden 08:00-20:00)' : '',
            $stats['stopped'],
        ));

        return self::SUCCESS;
    }
}
