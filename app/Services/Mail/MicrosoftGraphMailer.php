<?php

namespace App\Services\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Verstuurt e-mail via Microsoft Graph (sendMail) namens de ingestelde afzender (standaard info@kivii.nl).
 * Dit is de enige verzendroute van het CRM: ook Laravel Mail en notificaties lopen hierlangs
 * via App\Mail\Transport\MicrosoftGraphTransport. Er is geen SMTP-fallback.
 * Alleen de Laravel Http-client; het token wordt gecachet tot kort voor het verloopt.
 * Foutmeldingen zijn Nederlandstalig en bevatten nooit geheimen.
 */
class MicrosoftGraphMailer
{
    /** Weergavenaam van de afzender; alle uitgaande mail gaat als "Kivii <info@kivii.nl>". */
    public const SENDER_NAME = 'Kivii';

    public static function isConfigured(): bool
    {
        $c = (array) config('services.msgraph', []);

        return filled($c['tenant_id'] ?? null) && filled($c['client_id'] ?? null)
            && filled($c['client_secret'] ?? null) && filled($c['sender'] ?? null);
    }

    public static function sender(): string
    {
        return (string) (config('services.msgraph.sender') ?: 'info@kivii.nl');
    }

    public function send(string $to, string $subject, string $html, ?string $replyTo = null): void
    {
        $sender = self::sender();

        $this->sendMessage([
            'subject' => $subject,
            'body' => ['contentType' => 'HTML', 'content' => $html],
            'toRecipients' => [['emailAddress' => ['address' => $to]]],
            'replyTo' => [['emailAddress' => ['address' => $replyTo ?: $sender]]],
        ]);
    }

    /**
     * Verstuurt een volledig Graph-bericht (subject, body, ontvangers, bijlagen) vanuit de mailbox van de afzender.
     * De afzender wordt altijd geforceerd op {@see sender()}; een eventueel meegegeven 'from' wordt overschreven.
     * Gedeeld door {@see send()} en de Laravel-mailtransport (App\Mail\Transport\MicrosoftGraphTransport).
     *
     * @param  array<string, mixed>  $message
     */
    public function sendMessage(array $message): void
    {
        if (! self::isConfigured()) {
            throw new RuntimeException('De Microsoft-koppeling voor '.self::sender().' is nog niet ingesteld.');
        }

        $sender = self::sender();
        $message['from'] = ['emailAddress' => ['address' => $sender, 'name' => self::SENDER_NAME]];

        try {
            $response = Http::withToken($this->token())
                ->acceptJson()
                ->timeout(30)
                ->post('https://graph.microsoft.com/v1.0/users/'.rawurlencode($sender).'/sendMail', [
                    'message' => $message,
                    'saveToSentItems' => true,
                ]);
        } catch (\Illuminate\Http\Client\ConnectionException|\GuzzleHttp\Exception\TransferException) {
            throw new RuntimeException('Microsoft 365 is niet bereikbaar. Probeer het later opnieuw.');
        }

        if ($response->status() === 401) {
            Cache::forget($this->cacheKey());
        }
        if (! $response->successful()) {
            throw new RuntimeException($this->dutchError($response->status(), (string) $response->json('error.code', '')));
        }
    }

    private function token(): string
    {
        $cached = Cache::get($this->cacheKey());
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $c = (array) config('services.msgraph');
        try {
            $response = Http::asForm()->timeout(15)->post(
                'https://login.microsoftonline.com/'.rawurlencode((string) $c['tenant_id']).'/oauth2/v2.0/token',
                [
                    'client_id' => $c['client_id'],
                    'client_secret' => $c['client_secret'],
                    'scope' => 'https://graph.microsoft.com/.default',
                    'grant_type' => 'client_credentials',
                ]
            );
        } catch (\Illuminate\Http\Client\ConnectionException|\GuzzleHttp\Exception\TransferException) {
            throw new RuntimeException('Aanmelden bij Microsoft 365 mislukt: geen verbinding.');
        }

        $token = (string) $response->json('access_token', '');
        if (! $response->successful() || $token === '') {
            $code = (string) $response->json('error', '');
            throw new RuntimeException(match ($code) {
                'invalid_client' => 'Aanmelden bij Microsoft 365 mislukt: client-ID of client secret klopt niet (of het secret is verlopen).',
                'unauthorized_client', 'invalid_request' => 'Aanmelden bij Microsoft 365 mislukt: controleer tenant-ID en client-ID.',
                default => 'Aanmelden bij Microsoft 365 mislukt (HTTP '.$response->status().').',
            });
        }

        $ttl = max(60, (int) $response->json('expires_in', 3600) - 120);
        Cache::put($this->cacheKey(), $token, $ttl);

        return $token;
    }

    private function cacheKey(): string
    {
        return 'msgraph-token:'.sha1((string) config('services.msgraph.tenant_id').'|'.(string) config('services.msgraph.client_id'));
    }

    private function dutchError(int $status, string $code): string
    {
        return match (true) {
            $status === 401 => 'Microsoft 365 weigert de aanmelding. Controleer de app-registratie en het client secret.',
            $status === 403 || $code === 'ErrorAccessDenied' => 'Geen toestemming om te versturen namens '.self::sender().'. Controleer de Mail.Send-machtiging, de beheerderstoestemming en de toegangsbeperking voor deze mailbox.',
            $status === 404 || $code === 'ErrorInvalidUser' || $code === 'MailboxNotEnabledForRESTAPI' => 'Mailbox '.self::sender().' is niet gevonden in Microsoft 365.',
            $status === 429 => 'Microsoft 365 beperkt tijdelijk het aantal verzoeken. Probeer het over een paar minuten opnieuw.',
            $status === 413 => 'Microsoft 365 heeft de e-mail geweigerd: de e-mail of de bijlagen zijn te groot.',
            $status === 400 => 'Microsoft 365 heeft de e-mail geweigerd. Controleer het e-mailadres van de ontvanger.',
            default => 'Versturen via Microsoft 365 mislukt (HTTP '.$status.').',
        };
    }
}
