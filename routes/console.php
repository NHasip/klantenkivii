<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('reminders:send-due')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('crm:daily-checks')->dailyAt('08:00')->timezone('Europe/Amsterdam')->withoutOverlapping();
Schedule::command('leads:import-imap')->everyFiveMinutes()->withoutOverlapping();
