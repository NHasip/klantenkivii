<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;
use Throwable;

/**
 * Maakt een VAPID-sleutelpaar voor pushmeldingen en schrijft het in de .env van deze server.
 * Bestaande sleutels worden nooit overschreven (anders werken bestaande abonnementen niet meer).
 * De privésleutel wordt nooit getoond.
 */
class CrmWebpushKeys extends Command
{
    protected $signature = 'crm:webpush-keys';

    protected $description = 'Maak VAPID-sleutels voor pushmeldingen aan en zet ze in .env (alleen als ze nog ontbreken).';

    public function handle(): int
    {
        $path = app()->environmentFilePath();
        if (! is_file($path) || ! is_writable($path)) {
            $this->error('Het .env-bestand is niet gevonden of niet schrijfbaar: '.$path);

            return self::FAILURE;
        }

        $contents = (string) file_get_contents($path);
        $public = $this->value($contents, 'WEBPUSH_PUBLIC_KEY');
        $private = $this->value($contents, 'WEBPUSH_PRIVATE_KEY');

        if ($public !== '' && $private !== '') {
            if ($this->value($contents, 'WEBPUSH_SUBJECT') === '') {
                $contents = $this->set($contents, 'WEBPUSH_SUBJECT', 'mailto:info@kivii.nl');
                file_put_contents($path, $contents, LOCK_EX);
            }
            $this->info('Sleutels bestaan al, niets gewijzigd.');
            $this->line('Publieke sleutel: '.$public);

            return self::SUCCESS;
        }

        try {
            $keys = VAPID::createVapidKeys();
        } catch (Throwable $e) {
            $this->error('Sleutels aanmaken mislukt: '.class_basename($e).'. Controleer of PHP OpenSSL met elliptische curves ondersteunt.');

            return self::FAILURE;
        }

        $contents = $this->set($contents, 'WEBPUSH_PUBLIC_KEY', $keys['publicKey']);
        $contents = $this->set($contents, 'WEBPUSH_PRIVATE_KEY', $keys['privateKey']);
        if ($this->value($contents, 'WEBPUSH_SUBJECT') === '') {
            $contents = $this->set($contents, 'WEBPUSH_SUBJECT', 'mailto:info@kivii.nl');
        }

        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            $this->error('Het .env-bestand kon niet worden bijgewerkt.');

            return self::FAILURE;
        }

        // Een gecachte configuratie zou de nieuwe sleutels negeren.
        if (app()->configurationIsCached()) {
            $this->callSilently('config:clear');
        }

        $this->info('sleutels aangemaakt');
        $this->line('Publieke sleutel: '.$keys['publicKey']);

        return self::SUCCESS;
    }

    private function value(string $contents, string $key): string
    {
        if (preg_match('/^'.preg_quote($key, '/').'=(.*)$/m', $contents, $m)) {
            return trim(trim($m[1]), '"\'');
        }

        return '';
    }

    private function set(string $contents, string $key, string $value): string
    {
        $line = $key.'='.$value;
        $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
        if (preg_match($pattern, $contents)) {
            return (string) preg_replace_callback($pattern, fn () => $line, $contents, 1);
        }

        return rtrim($contents, "\r\n")."\n".$line."\n";
    }
}
