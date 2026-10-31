<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('reminders:send-due')->everyFiveMinutes()->withoutOverlapping()
    ->when(fn () => (bool) config('crm.schedule.reminders'));
Schedule::command('crm:daily-checks')->dailyAt('08:00')->timezone('Europe/Amsterdam')->withoutOverlapping()
    ->when(fn () => (bool) config('crm.schedule.daily_checks'));
Schedule::command('leads:import-imap')->everyFiveMinutes()->withoutOverlapping()
    ->when(fn () => (bool) config('crm.schedule.leads_import'));
// Normale reeksen (zonder --test worden testreeksen overgeslagen).
Schedule::command('crm:demo-sequence')->dailyAt('08:45')->timezone('Europe/Amsterdam')->withoutOverlapping()
    ->when(fn () => (bool) config('crm.schedule.demo_sequence'));
// Testmodus: mails na 2, 5 en 13 minuten. Stopt direct als er geen actieve testreeks is.
Schedule::command('crm:demo-sequence --test')->everyMinute()->withoutOverlapping()
    ->when(fn () => (bool) config('crm.schedule.demo_sequence'));
