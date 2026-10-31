<?php

namespace App\Console\Commands;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Mail\ReminderMail;
use App\Models\Reminder;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendDueReminders extends Command
{
    protected $signature = 'reminders:send-due {--limit=50 : Max aantal reminders per run}';

    protected $description = 'Verstuur e-mail reminders die nu moeten worden verstuurd (via Microsoft 365, info@kivii.nl).';

    /** Na zoveel mislukte pogingen wordt een reminder-mail niet meer automatisch opnieuw geprobeerd. */
    private const MAX_ATTEMPTS = 3;

    public function handle(): int
    {
        // Geen SMTP-fallback: zonder koppeling niets proberen; de reminders blijven staan tot de koppeling er is.
        if (! MicrosoftGraphMailer::isConfigured()) {
            $this->warn('Microsoft 365-koppeling voor '.MicrosoftGraphMailer::sender().' is niet ingesteld; e-mail reminders worden niet verstuurd.');

            return self::SUCCESS;
        }

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

        $sent = 0;
        $failed = 0;

        foreach ($reminders as $reminder) {
            if (! $reminder->user || ! $reminder->user->email) {
                continue;
            }

            $attemptsKey = 'reminder-mail-attempts:'.$reminder->id;
            $attempts = (int) Cache::get($attemptsKey, 0);
            if ($attempts >= self::MAX_ATTEMPTS) {
                continue;
            }

            try {
                Mail::to($reminder->user->email)->send(new ReminderMail($reminder));
            } catch (Throwable $e) {
                // Een mislukte mail mag de rest van de run niet stoppen.
                $failed++;
                $attempts++;
                Cache::put($attemptsKey, $attempts, now()->addDays(30));
                Log::warning('Reminder-mail niet verstuurd via Microsoft 365.', [
                    'reminder_id' => $reminder->id,
                    'to' => $reminder->user->email,
                    'attempt' => $attempts,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Reminder #{$reminder->id} niet verstuurd (poging {$attempts}/".self::MAX_ATTEMPTS.'): '.$e->getMessage());

                continue;
            }

            Cache::forget($attemptsKey);
            $reminder->email_sent_at = now();

            if ($reminder->channel === ReminderChannel::Email) {
                $reminder->status = ReminderStatus::Verzonden;
            }

            $reminder->save();
            $sent++;
        }

        $this->info('Verstuurd: '.$sent.($failed > 0 ? ', mislukt: '.$failed : ''));

        return self::SUCCESS;
    }
}
