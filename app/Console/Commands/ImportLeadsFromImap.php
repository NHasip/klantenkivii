<?php

namespace App\Console\Commands;

use App\Services\Leads\LeadIngestor;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ImportLeadsFromImap extends Command
{
    protected $signature = 'leads:import-imap {--limit=20 : Max aantal mails per run}';

    protected $description = 'Importeer demo aanvragen vanuit IMAP (fallback).';

    public function handle(LeadIngestor $ingestor): int
    {
        if (! function_exists('imap_open')) {
            $this->error('PHP IMAP extensie ontbreekt (imap_open is niet beschikbaar).');
            return self::FAILURE;
        }

        $imap = config('services.imap');
        $host = (string) Arr::get($imap, 'host', '');
        $port = (int) Arr::get($imap, 'port', 993);
        $encryption = (string) Arr::get($imap, 'encryption', 'ssl');
        $username = (string) Arr::get($imap, 'username', '');
        $password = (string) Arr::get($imap, 'password', '');
        $folder = (string) Arr::get($imap, 'folder', 'INBOX');

        if ($host === '' || $username === '' || $password === '') {
            $this->error('IMAP env ontbreekt. Vul IMAP_HOST/IMAP_USERNAME/IMAP_PASSWORD in.');
            return self::FAILURE;
        }

        $flags = '/imap';
        if ($encryption === 'ssl') {
            $flags .= '/ssl';
        } elseif ($encryption === 'tls') {
            $flags .= '/tls';
        }

        $mailbox = sprintf('{%s:%d%s}%s', $host, $port, $flags, $folder);

        $stream = @imap_open($mailbox, $username, $password);
        if (! $stream) {
            $this->error('IMAP connectie mislukt: '.imap_last_error());
            return self::FAILURE;
        }

        try {
            $emails = imap_search($stream, 'UNSEEN') ?: [];
            $emails = array_slice($emails, 0, (int) $this->option('limit'));

            if (empty($emails)) {
                $this->info('Geen ongelezen mails.');
                return self::SUCCESS;
            }

            foreach ($emails as $emailNumber) {
                $overview = imap_fetch_overview($stream, (string) $emailNumber, 0);
                $subject = $overview[0]->subject ?? '';

                $body = (string) imap_fetchbody($stream, (string) $emailNumber, 1.2);
                if ($body === '') {
                    $body = (string) imap_fetchbody($stream, (string) $emailNumber, 1);
                }

                $raw = $this->decodeBody($body);
                $parsed = $this->parseLabels($raw);

                if (! isset($parsed['bedrijfsnaam'], $parsed['email'])) {
                    $this->warn("Mail #{$emailNumber} overgeslagen (labels missen). Subject: ".$subject);
                    imap_setflag_full($stream, (string) $emailNumber, "\\Seen");
                    continue;
                }

                $company = $ingestor->ingest([
                    'bedrijfsnaam' => $parsed['bedrijfsnaam'],
                    'contactnaam' => $parsed['contactnaam'] ?? ($parsed['naam'] ?? ''),
                    'email' => $parsed['email'],
                    'telefoon' => $parsed['telefoon'] ?? null,
                    'plaats' => $parsed['plaats'] ?? null,
                    'bericht' => $parsed['bericht'] ?? null,
                    'bron' => 'email',
                ], 'imap', $raw);

                $this->info("Ingested lead: {$company->id} {$company->bedrijfsnaam}");

                imap_setflag_full($stream, (string) $emailNumber, "\\Seen \\Flagged");
            }

            imap_expunge($stream);

            return self::SUCCESS;
        } finally {
            imap_close($stream);
        }
    }

    private function decodeBody(string $body): string
    {
        $decoded = quoted_printable_decode($body);
        $decoded = preg_replace("/\r\n|\r/", "\n", $decoded) ?? $decoded;
        return trim($decoded);
    }

    /**
     * Parse vaste labels uit platte tekst, bijv.:
     * Bedrijfsnaam: ...
     * Contactnaam: ...
     * Email: ...
     * Telefoon: ...
     * Plaats: ...
     * Bericht: ...
     *
     * @return array<string, string>
     */
    private function parseLabels(string $raw): array
    {
        $map = [];
        $lines = preg_split('/\n/', $raw) ?: [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || ! str_contains($line, ':')) {
                continue;
            }

            [$key, $value] = array_map('trim', explode(':', $line, 2));
            $key = Str::lower($key);

            $key = match ($key) {
                'bedrijfsnaam', 'bedrijf' => 'bedrijfsnaam',
                'contactnaam', 'naam' => 'contactnaam',
                'email', 'e-mail' => 'email',
                'telefoon', 'phone' => 'telefoon',
                'plaats', 'city' => 'plaats',
                'bericht', 'message' => 'bericht',
                default => null,
            };

            if ($key) {
                $map[$key] = $value;
            }
        }

        return $map;
    }
}

