<?php

namespace App\Providers;

use App\Models\SmtpSetting;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Carbon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Carbon::setLocale(config('app.locale', 'nl'));

        $this->app->afterResolving('mail.manager', function () {
            SmtpSetting::applyStoredToMailConfig();
        });
    }
}
