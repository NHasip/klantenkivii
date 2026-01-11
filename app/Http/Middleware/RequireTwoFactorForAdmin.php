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

        $mustConfirm = (bool) config('fortify-options.two-factor-authentication.confirm', false);
        $twoFactorEnabled = $mustConfirm
            ? filled($user->two_factor_confirmed_at)
            : filled($user->two_factor_secret);

        if (! $twoFactorEnabled && ! $request->routeIs('profile.show')) {
            return redirect()->to('/user/profile')
                ->with('status', '2FA is verplicht voor admin accounts. Schakel dit in via je profiel.');
        }

        return $next($request);
    }
}
