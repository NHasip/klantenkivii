<?php

namespace App\Services\Push;

use App\Enums\UserRole;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Verstuurt Web Push-meldingen naar de apparaten van CRM-gebruikers (iPhone-beginschermapp vanaf iOS 16.4, desktopbrowsers).
 *
 * - Gooit nooit een fout naar de aanroeper: alles wordt afgevangen en gelogd (zonder inhoud of adressen).
 * - Verstuurt pas na een geslaagde databasetransactie en bij webverzoeken pas nadat het antwoord is verstuurd.
 * - Verlopen abonnementen (404/410 van de pushdienst) worden direct verwijderd.
 * - Meldingen bevatten geen gevoelige gegevens: geen volledige IBAN, geen e-mailadressen.
 */
class PushNotifier
{
    public const TYPE_LEAD = 'lead';
    public const TYPE_MANDATE = 'mandate';
    public const TYPE_MAIL_FAILED = 'mail_failed';
    public const TYPE_TASK = 'task';
    public const TYPE_IBAN = 'iban';

    /** Typen met label, in de volgorde van het profielscherm. */
    public const TYPES = [
        self::TYPE_LEAD => ['label' => 'Nieuwe demo-aanvraag', 'hint' => 'Er is een lead binnengekomen via het websiteformulier of de mailbox.'],
        self::TYPE_MANDATE => ['label' => 'Machtiging ontvangen', 'hint' => 'Een klant heeft het machtigingsformulier ingevuld, eventueel met controle nodig.'],
        self::TYPE_MAIL_FAILED => ['label' => 'E-mail niet verstuurd', 'hint' => 'Een welkomstmail, demo-mail, machtigingsmail of andere mail kon niet worden verstuurd.'],
        self::TYPE_TASK => ['label' => 'Taak toegewezen of herinnering', 'hint' => 'Je bent aan een taak toegevoegd of een herinnering is aan de beurt.'],
        self::TYPE_IBAN => ['label' => 'IBAN gewijzigd', 'hint' => 'Een nieuw mandaat heeft een ander IBAN dan het vorige.'],
    ];

    /** Alleen voor admins. */
    public const ADMIN_TYPES = [self::TYPE_LEAD, self::TYPE_MANDATE, self::TYPE_MAIL_FAILED, self::TYPE_IBAN];

    /** Container-binding om in tests een eigen (nep) WebPush-client te gebruiken. */
    public const CLIENT_BINDING = 'webpush.client';

    public static function configured(): bool
    {
        return filled(config('webpush.public_key')) && filled(config('webpush.private_key'));
    }

    public static function available(): bool
    {
        try {
            return self::configured() && Schema::hasTable('push_subscriptions');
        } catch (Throwable) {
            return false;
        }
    }

    /** @return list<string> */
    public static function typesFor(User $user): array
    {
        return array_values(array_filter(
            array_keys(self::TYPES),
            fn (string $type) => $user->isAdmin() || ! in_array($type, self::ADMIN_TYPES, true),
        ));
    }

    /**
     * Melding naar alle actieve admins die dit type aan hebben staan.
     */
    public function notifyAdmins(string $type, string $title, string $body, ?string $url = null, ?string $tag = null): void
    {
        $this->defer(function () use ($type, $title, $body, $url, $tag) {
            $admins = User::query()
                ->where('role', UserRole::Admin->value)
                ->where('active', true)
                ->whereHas('pushSubscriptions')
                ->get();

            $this->sendToUsers($admins, $type, $title, $body, $url, $tag);
        });
    }

    /**
     * Melding naar specifieke gebruikers (bijvoorbeeld de toegewezen medewerkers van een taak).
     *
     * @param  iterable<User|int>  $users
     */
    public function notifyUsers(iterable $users, string $type, string $title, string $body, ?string $url = null, ?string $tag = null): void
    {
        $ids = [];
        foreach ($users as $user) {
            $id = $user instanceof User ? $user->getKey() : $user;
            if ($id) {
                $ids[] = (int) $id;
            }
        }
        if ($ids === []) {
            return;
        }

        $this->defer(function () use ($ids, $type, $title, $body, $url, $tag) {
            $users = User::query()->whereIn('id', array_unique($ids))->where('active', true)->get();
            $this->sendToUsers($users, $type, $title, $body, $url, $tag);
        });
    }

    /**
     * Direct versturen (zonder uitstel). Typecontrole alleen als $type is opgegeven; een testmelding gaat altijd.
     *
     * @param  iterable<User>  $users
     * @return array{sent:int, failed:int, removed:int}
     */
    public function sendToUsers(iterable $users, ?string $type, string $title, string $body, ?string $url = null, ?string $tag = null): array
    {
        $stats = ['sent' => 0, 'failed' => 0, 'removed' => 0];

        try {
            if (! self::available()) {
                return $stats;
            }

            $userIds = [];
            foreach ($users as $user) {
                if ($type === null || $user->wantsPush($type)) {
                    $userIds[] = $user->getKey();
                }
            }
            if ($userIds === []) {
                return $stats;
            }

            $subscriptions = PushSubscription::query()->whereIn('user_id', $userIds)->get();
            if ($subscriptions->isEmpty()) {
                return $stats;
            }

            $payload = json_encode([
                'title' => mb_substr($title, 0, 80),
                'body' => mb_substr($body, 0, 180),
                'url' => $this->safeUrl($url),
                'tag' => $tag ?? $type ?? 'kivii',
                'icon' => '/icons/icon-192.png',
                'badge' => '/icons/icon-192.png',
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $client = $this->client();
            $byEndpoint = [];
            foreach ($subscriptions as $subscription) {
                $byEndpoint[$subscription->endpoint] = $subscription;
                $client->queueNotification(Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh,
                    'authToken' => $subscription->auth,
                    'contentEncoding' => $subscription->content_encoding ?: 'aes128gcm',
                ]), $payload, ['TTL' => (int) config('webpush.ttl', 86400), 'urgency' => 'high', 'topic' => $this->topic($tag ?? $type)]);
            }

            foreach ($client->flush() as $report) {
                $subscription = $byEndpoint[$report->getEndpoint()] ?? null;
                if ($report->isSuccess()) {
                    $stats['sent']++;
                    $subscription?->forceFill(['last_used_at' => now()])->saveQuietly();

                    continue;
                }

                if ($report->isSubscriptionExpired()) {
                    $stats['removed']++;
                    $subscription?->delete();

                    continue;
                }

                $stats['failed']++;
                Log::warning('Pushmelding niet afgeleverd.', [
                    'subscription_id' => $subscription?->id,
                    'status' => $report->getResponse()?->getStatusCode(),
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('Pushmeldingen versturen mislukt.', ['type' => $type, 'error' => class_basename($e)]);
        }

        return $stats;
    }

    protected function client(): WebPush
    {
        if (app()->bound(self::CLIENT_BINDING)) {
            return app(self::CLIENT_BINDING);
        }

        $client = new WebPush([
            'VAPID' => [
                'subject' => (string) config('webpush.subject', 'mailto:info@kivii.nl'),
                'publicKey' => (string) config('webpush.public_key'),
                'privateKey' => (string) config('webpush.private_key'),
            ],
        ], [], (int) config('webpush.timeout', 5), [], $this->libraryLogger());
        $client->setReuseVAPIDHeaders(true);

        return $client;
    }

    /**
     * Logger voor de bibliotheek: zonder logger gebruikt die trigger_error(), wat Laravel als fout opvat
     * (bijv. de melding dat GMP of BCMath ontbreekt). Mededelingen worden genegeerd, waarschuwingen gelogd.
     */
    private function libraryLogger(): \Psr\Log\LoggerInterface
    {
        return new class extends \Psr\Log\AbstractLogger
        {
            public function log($level, string|\Stringable $message, array $context = []): void
            {
                if (in_array($level, ['debug', 'info', 'notice'], true)) {
                    return;
                }
                Log::warning('[webpush] '.$message);
            }
        };
    }

    /**
     * Na de lopende transactie uitvoeren; bij webverzoeken pas nadat het antwoord is verstuurd,
     * zodat een trage pushdienst een webhook of formulier nooit ophoudt.
     */
    protected function defer(callable $callback): void
    {
        try {
            if (! self::available()) {
                return;
            }

            $run = function () use ($callback) {
                try {
                    $callback();
                } catch (Throwable $e) {
                    Log::warning('Pushmeldingen versturen mislukt.', ['error' => class_basename($e)]);
                }
            };

            DB::afterCommit(function () use ($run) {
                if (app()->runningInConsole()) {
                    $run();
                } else {
                    app()->terminating($run);
                }
            });
        } catch (Throwable $e) {
            Log::warning('Pushmelding kon niet worden ingepland.', ['error' => class_basename($e)]);
        }
    }

    /** Alleen paden binnen het CRM; anders het dashboard. */
    private function safeUrl(?string $url): string
    {
        if (! filled($url)) {
            return '/dashboard';
        }

        // Absolute URL (route()): alleen pad en query gebruiken, de service worker opent die op de eigen origin.
        if (preg_match('~^https?://~i', $url)) {
            $parts = parse_url($url) ?: [];
            $url = ($parts['path'] ?? '/').(isset($parts['query']) ? '?'.$parts['query'] : '');
        }

        return str_starts_with($url, '/') && ! str_starts_with($url, '//') ? $url : '/dashboard';
    }

    /** Topic (max 32 tekens, url-veilig): een nieuwere melding met hetzelfde topic vervangt een nog niet afgeleverde. */
    private function topic(?string $tag): string
    {
        return substr(preg_replace('/[^A-Za-z0-9_-]/', '-', (string) ($tag ?: 'kivii')), 0, 32);
    }
}
