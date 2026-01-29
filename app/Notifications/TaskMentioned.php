<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskMentioned extends Notification
{
    use Queueable;

    public function __construct(private Task $task, private TaskComment $comment)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Je bent genoemd in een taak')
            ->line("Je bent genoemd in een reactie op: {$this->task->titel}.")
            ->line(\Illuminate\Support\Str::limit($this->comment->body, 120))
            ->action('Open taak', route('crm.tasks.index'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_mentioned',
            'task_id' => $this->task->id,
            'title' => $this->task->titel,
            'comment' => $this->comment->body,
        ];
    }
}
