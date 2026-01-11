<?php

namespace App\Mail;

use App\Models\Reminder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Reminder $reminder)
    {
    }

    public function build()
    {
        return $this->subject('Reminder: '.$this->reminder->titel)
            ->view('mail.reminder');
    }
}

