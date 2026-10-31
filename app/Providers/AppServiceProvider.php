<?php

namespace App\Providers;

use App\Mail\Transport\MicrosoftGraphTransport;
use App\Models\GarageCompany;
use App\Observers\GarageCompanyObserver;
use App\Services\Mail\MicrosoftGraphMailer;
use Illuminate\Support\Facades\Mail;
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
        // Ook Livewire-updates (POST /livewire/update) door dezelfde controles als de oorspronkelijke route.
        \Livewire\Livewire::addPersistentMiddleware([
            \App\Http\Middleware\EnsureUserIsActive::class,
            \App\Http\Middleware\RequireTwoFactorForAdmin::class,
        ]);

        Carbon::setLocale(config('app.locale', 'nl'));

        GarageCompany::observe(GarageCompanyObserver::class);

        $this->forceMicrosoft365Mail();
    }

    /**
     * Alle uitgaande mail gaat alleen via Microsoft Graph vanuit info@kivii.nl, nooit via de hosting-SMTP.
     * MAIL_MAILER en MAIL_FROM_* uit .env worden genegeerd. Ook mailers die het framework standaard
     * meebrengt (smtp, sendmail, failover, roundrobin) lopen via Graph, zodat er geen omweg bestaat.
     * Alleen tijdens unit-tests blijft de "array"-mailer actief, zodat tests nooit echt mailen.
     */
    private function forceMicrosoft365Mail(): void
    {
        config([
            'mail.default' => $this->app->runningUnitTests() ? 'array' : 'msgraph',
            'mail.from.address' => MicrosoftGraphMailer::sender(),
            'mail.from.name' => MicrosoftGraphMailer::SENDER_NAME,
        ]);

        $graph = fn () => new MicrosoftGraphTransport($this->app->make(MicrosoftGraphMailer::class));
        foreach (['msgraph', 'smtp', 'sendmail', 'failover', 'roundrobin'] as $transport) {
            Mail::extend($transport, $graph);
        }
    }
}
