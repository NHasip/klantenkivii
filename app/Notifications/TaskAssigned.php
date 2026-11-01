<?php

namespace App\Notifications;

use App\Models\Task;
use App\Notifications\Channels\WebPushChannel;
use App\Services\Push\PushNotifier;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public function __construct(private Task $task)
    {
    }

    public function via(object $notifiable): array
    {
        // E-mail alleen via Microsoft 365 (info@kivii.nl); zonder koppeling alleen de melding in het CRM.
        // Push staat voor mail, zodat een mislukte mail de pushmelding niet tegenhoudt.
        return MicrosoftGraphMailer::isConfigured() ? ['database', WebPushChannel::class, 'mail'] : ['database', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable): array
    {
        return [
            'type' => PushNotifier::TYPE_TASK,
            'title' => 'Taak toegewezen',
            'body' => 'Je bent toegevoegd aan de taak: '.mb_substr((string) $this->task->titel, 0, 120),
            'url' => route('crm.tasks.index', ['taak' => $this->task->id], false),
            'tag' => 'task-'.$this->task->id,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Nieuwe taak toegewezen')
            ->line("Je bent toegevoegd aan de taak: {$this->task->titel}.")
            ->action('Open taak', route('crm.tasks.index'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'title' => $this->task->titel,
        ];
    }
}
