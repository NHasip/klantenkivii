<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
            'admin.2fa' => \App\Http\Middleware\RequireTwoFactorForAdmin::class,
            'leads.webhook' => \App\Http\Middleware\VerifyLeadsWebhookToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->reportable(function (\Throwable $e) {
            if (! app()->environment('production')) {
                return;
            }

            if (! request()?->headers?->has('X-Livewire')) {
                return;
            }

            // Korte regel zonder trace of exception-tekst (daarin kunnen requestgegevens staan).
            // De volledige details staan in het Laravel-log via de standaard reporter.
            error_log(sprintf(
                '[kivii][livewire] %s in %s:%d',
                get_class($e),
                basename($e->getFile()),
                $e->getLine(),
            ));
        });
    })->create();
