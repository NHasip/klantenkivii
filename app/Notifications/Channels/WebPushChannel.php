<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Services\Push\PushNotifier;
use Illuminate\Notifications\Notification;
use Throwable;

/**
 * Notificatiekanaal voor pushmeldingen. De notificatie levert via toWebPush() een array met
 * type, title, body en optioneel url en tag. Gooit nooit een fout, zodat andere kanalen (mail) doorgaan.
 */
class WebPushChannel
{
    public function __construct(private readonly PushNotifier $notifier)
    {
    }

    public function send(object $notifiable, Notification $notification): void
    {
        try {
            if (! $notifiable instanceof User || ! method_exists($notification, 'toWebPush')) {
                return;
            }

            // Geen melding voor iets wat je zelf net hebt gedaan (bijvoorbeeld jezelf aan een taak toevoegen).
            if (auth()->check() && (int) auth()->id() === (int) $notifiable->getKey()) {
                return;
            }

            $message = $notification->toWebPush($notifiable);
            if (! is_array($message) || empty($message['type']) || empty($message['title'])) {
                return;
            }

            $this->notifier->notifyUsers(
                [$notifiable],
                (string) $message['type'],
                (string) $message['title'],
                (string) ($message['body'] ?? ''),
                $message['url'] ?? null,
                $message['tag'] ?? null,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
