<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if (! $user->active) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return $this->toLogin($request, 'Je account is gedeactiveerd. Neem contact op met de beheerder.');
        }

        if ($user->isCustomerAccount()) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return $this->toLogin($request, 'Dit account heeft geen toegang tot het CRM.');
        }

        return $next($request);
    }

    /**
     * Inertia-verzoek: volledige paginalading naar het inloggen (anders opent de inlogpagina in een modal).
     */
    private function toLogin(Request $request, string $message): Response
    {
        $request->session()->flash('status', $message);

        if ($request->header('X-Inertia')) {
            return \Inertia\Inertia::location(route('login'));
        }

        return redirect()->route('login');
    }
}
