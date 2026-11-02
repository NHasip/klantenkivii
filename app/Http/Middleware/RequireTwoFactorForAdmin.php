<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTwoFactorForAdmin
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! (bool) config('crm.require_admin_2fa', false)) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return $next($request);
        }

        $twoFactorEnabled = self::userHasTwoFactor($user);

        if (! $twoFactorEnabled && ! $request->routeIs('profile.show')) {
            // De profielpagina toont hierop een duidelijke (oranje) uitleg waarom je bent doorgestuurd.
            $request->session()->flash('two_factor_required', $request->path());

            // Inertia- en Livewire-verzoeken: volledige paginalading naar de (Blade) profielpagina, anders opent die
            // in een modal of reageert de knop schijnbaar niet.
            if ($request->header('X-Inertia')) {
                return \Inertia\Inertia::location(route('profile.show').'#two-factor');
            }

            return redirect()->to(route('profile.show').'#two-factor');
        }

        return $next($request);
    }

    /**
     * Zelfde definitie als de middleware: 2FA telt als ingeschakeld (en bevestigd indien vereist).
     */
    public static function userHasTwoFactor(?object $user): bool
    {
        if (! $user) {
            return false;
        }

        $mustConfirm = (bool) config('fortify-options.two-factor-authentication.confirm', false);

        return $mustConfirm
            ? filled($user->two_factor_confirmed_at ?? null)
            : filled($user->two_factor_secret ?? null);
    }
}
