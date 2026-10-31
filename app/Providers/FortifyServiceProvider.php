<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Wachtwoord vergeten: altijd dezelfde melding, of het e-mailadres nu bestaat of niet.
        $neutral = fn () => new class implements FailedPasswordResetLinkRequestResponse, SuccessfulPasswordResetLinkRequestResponse
        {
            public function toResponse($request)
            {
                $message = 'Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een link om je wachtwoord opnieuw in te stellen.';

                return $request->wantsJson()
                    ? new JsonResponse(['message' => $message], 200)
                    : back()->with('status', $message);
            }
        };
        $this->app->singleton(FailedPasswordResetLinkRequestResponse::class, $neutral);
        $this->app->singleton(SuccessfulPasswordResetLinkRequestResponse::class, $neutral);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);

        // Zelfde controle als Fortify standaard, plus: klantlogins (eigenaar van een
        // garagebedrijf) mogen niet inloggen in het CRM. Null geeft de generieke
        // foutmelding en telt mee voor de rate limiter.
        Fortify::authenticateUsing(function (Request $request) {
            $user = User::query()
                ->where(Fortify::username(), $request->input(Fortify::username()))
                ->first();

            if (! $user || ! Hash::check((string) $request->input('password'), (string) $user->password)) {
                return null;
            }

            if ($user->isCustomerAccount()) {
                return null;
            }

            // Gedeactiveerde accounts kunnen niet inloggen (zelfde generieke foutmelding).
            if (! $user->active) {
                return null;
            }

            return $user;
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });
    }
}
