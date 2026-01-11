<?php

namespace App\Console\Commands;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Mail\ReminderMail;
use App\Models\Reminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendDueReminders extends Command
{
    protected $signature = 'reminders:send-due {--limit=50 : Max aantal reminders per run}';

    protected $description = 'Verstuur e-mail reminders die nu moeten worden verstuurd.';

    public function handle(): int
    {
        $reminders = Reminder::query()
            ->with(['user', 'garageCompany'])
            ->where('status', ReminderStatus::Gepland)
            ->whereIn('channel', [ReminderChannel::Email, ReminderChannel::Beide])
            ->whereNull('email_sent_at')
            ->where('remind_at', '<=', now())
            ->orderBy('remind_at')
            ->limit((int) $this->option('limit'))
            ->get();

        if ($reminders->isEmpty()) {
            $this->info('Geen e-mail reminders.');
            return self::SUCCESS;
        }

        foreach ($reminders as $reminder) {
            if (! $reminder->user || ! $reminder->user->email) {
                continue;
            }

            Mail::to($reminder->user->email)->send(new ReminderMail($reminder));

            $reminder->email_sent_at = now();

            if ($reminder->channel === ReminderChannel::Email) {
                $reminder->status = ReminderStatus::Verzonden;
            }

            $reminder->save();
        }

        $this->info('Verstuurd: '.$reminders->count());

        return self::SUCCESS;
    }
}

