<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\TaskComment;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskCommented extends Notification
{
    use Queueable;

    public function __construct(private Task $task, private TaskComment $comment)
    {
    }

    public function via(object $notifiable): array
    {
        // E-mail alleen via Microsoft 365 (info@kivii.nl); zonder koppeling alleen de melding in het CRM.
        return MicrosoftGraphMailer::isConfigured() ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Nieuwe reactie op taak')
            ->line("Er is gereageerd op de taak: {$this->task->titel}.")
            ->line(\Illuminate\Support\Str::limit($this->comment->body, 120))
            ->action('Open taak', route('crm.tasks.index'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_commented',
            'task_id' => $this->task->id,
            'title' => $this->task->titel,
            'comment' => $this->comment->body,
        ];
    }
}
