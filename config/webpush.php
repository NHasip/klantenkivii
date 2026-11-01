<?php

/*
 * Web Push (VAPID). Sleutels aanmaken op de server: php artisan crm:webpush-keys
 * (schrijft WEBPUSH_PUBLIC_KEY, WEBPUSH_PRIVATE_KEY en WEBPUSH_SUBJECT in .env).
 */
return [
    'public_key' => env('WEBPUSH_PUBLIC_KEY'),
    'private_key' => env('WEBPUSH_PRIVATE_KEY'),
    'subject' => env('WEBPUSH_SUBJECT', 'mailto:info@kivii.nl'),

    // Hoe lang een pushdienst een melding bewaart als het apparaat offline is (seconden).
    'ttl' => (int) env('WEBPUSH_TTL', 86400),

    // Maximale wachttijd per verzending naar de pushdienst (seconden).
    'timeout' => (int) env('WEBPUSH_TIMEOUT', 5),
];
