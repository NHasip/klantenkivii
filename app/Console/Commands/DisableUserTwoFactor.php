<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class DisableUserTwoFactor extends Command
{
    protected $signature = 'users:disable-2fa
        {email? : E-mailadres van de gebruiker (leeg = toon alle gebruikers)}';

    protected $description = 'Schakel tweestapsverificatie uit voor een CRM-gebruiker die zijn authenticator kwijt is (bijv. via Plesk Scheduled Tasks).';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        if ($email === '') {
            $this->info('Geen e-mailadres opgegeven. Bestaande gebruikers:');
            $this->listUsers();

            return self::SUCCESS;
        }

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error("Geen gebruiker gevonden met e-mailadres: {$email}");
            $this->line('Bestaande gebruikers:');
            $this->listUsers();

            return self::FAILURE;
        }

        if (! filled($user->two_factor_secret)) {
            $this->info("Tweestapsverificatie staat al uit voor {$user->name} <{$user->email}>.");

            return self::SUCCESS;
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $this->info("Tweestapsverificatie uitgeschakeld voor {$user->name} <{$user->email}>.");
        $this->line('Log in met alleen je wachtwoord en stel tweestapsverificatie opnieuw in via je profiel.');

        return self::SUCCESS;
    }

    private function listUsers(): void
    {
        $this->table(
            ['Naam', 'E-mail', 'Rol', 'Tweestapsverificatie'],
            User::query()
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    $user->name,
                    $user->email,
                    $user->role?->value,
                    filled($user->two_factor_secret) ? 'aan' : 'uit',
                ])
                ->all(),
        );
    }
}
