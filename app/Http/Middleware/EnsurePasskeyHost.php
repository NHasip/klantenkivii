<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Passkeys werken alleen op het vaste domein uit config('security.passkeys.host')
 * (standaard klanten.necmardemo.nl). Op elk ander domein bestaan de endpoints niet.
 */
class EnsurePasskeyHost
{
    public static function allowed(?Request $request = null): bool
    {
        $request ??= request();
        $host = strtolower(trim((string) config('security.passkeys.host', '')));

        // Https wordt door de browser zelf afgedwongen en de origin staat vast op https://<host>.
        return $host !== '' && strtolower($request->getHost()) === $host;
    }

    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(self::allowed($request), 404);

        return $next($request);
    }
}
