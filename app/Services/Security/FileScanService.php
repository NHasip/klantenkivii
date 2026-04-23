<?php

namespace App\Services\Security;

use Illuminate\Validation\ValidationException;
use RuntimeException;

class FileScanService
{
    public function scanOrFail(string $absolutePath): void
    {
        if (! (bool) config('security.attachments.virus_scan', false)) {
            return;
        }

        if (! is_file($absolutePath)) {
            throw new RuntimeException('Virusscan mislukt: bestand niet gevonden.');
        }

        $host = (string) config('security.attachments.clamav.host', '127.0.0.1');
        $port = (int) config('security.attachments.clamav.port', 3310);
        $timeout = (int) config('security.attachments.clamav.timeout', 5);

        $errno = 0;
        $errstr = '';
        $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);

        if (! $socket) {
            throw new RuntimeException("Virusscanner niet bereikbaar ({$host}:{$port}).");
        }

        stream_set_timeout($socket, max(1, $timeout));

        $handle = fopen($absolutePath, 'rb');
        if (! $handle) {
            fclose($socket);
            throw new RuntimeException('Virusscan mislukt: bestand niet leesbaar.');
        }

        try {
            fwrite($socket, "zINSTREAM\0");

            while (! feof($handle)) {
                $chunk = fread($handle, 8192);
                if ($chunk === false) {
                    throw new RuntimeException('Virusscan mislukt: lezen van uploadbestand faalde.');
                }

                if ($chunk === '') {
                    continue;
                }

                fwrite($socket, pack('N', strlen($chunk)));
                fwrite($socket, $chunk);
            }

            fwrite($socket, pack('N', 0));

            $response = stream_get_contents($socket) ?: '';
            if (str_contains($response, 'OK')) {
                return;
            }

            if (str_contains($response, 'FOUND')) {
                throw ValidationException::withMessages([
                    'file' => 'Upload geblokkeerd: mogelijk malware gevonden.',
                ]);
            }

            throw new RuntimeException('Virusscan mislukt: '.$response);
        } finally {
            fclose($handle);
            fclose($socket);
        }
    }
}

