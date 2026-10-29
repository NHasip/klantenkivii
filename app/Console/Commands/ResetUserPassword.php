<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResetUserPassword extends Command
{
    protected $signature = 'users:reset-password
        {email? : E-mailadres van de gebruiker (leeg = toon alle gebruikers)}
        {--password= : Eigen nieuw wachtwoord (anders wordt er een sterk wachtwoord gegenereerd)}';

    protected $description = 'Stel een nieuw wachtwoord in voor een CRM-gebruiker (bijv. via Plesk Scheduled Tasks).';

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

        $password = (string) $this->option('password');
        if ($password === '') {
            $password = Str::password(16, symbols: false);
        } elseif (mb_strlen($password) < 8) {
            $this->error('Wachtwoord moet minimaal 8 tekens zijn.');

            return self::FAILURE;
        }

        $user->forceFill([
            'password' => Hash::make($password),
            'remember_token' => Str::random(60),
        ])->save();

        $this->info("Wachtwoord gewijzigd voor {$user->name} <{$user->email}>.");
        $this->line("Nieuw wachtwoord: {$password}");
        $this->line('Log in en wijzig dit wachtwoord direct via je profiel.');

        if (! $user->active) {
            $this->warn('Let op: dit account staat op inactief en kan pas inloggen als het weer actief is.');
        }

        return self::SUCCESS;
    }

    private function listUsers(): void
    {
        $this->table(
            ['Naam', 'E-mail', 'Rol', 'Actief'],
            User::query()
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    $user->name,
                    $user->email,
                    $user->role?->value,
                    $user->active ? 'ja' : 'nee',
                ])
                ->all(),
        );
    }
}
