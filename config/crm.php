<?php

return [
    // Zet op true als je admin 2FA toch wilt afdwingen.
    'require_admin_2fa' => (bool) env('CRM_REQUIRE_ADMIN_2FA', false),

    // Automatische taken (php artisan schedule:run). Standaard staat alleen de lead-import aan.
    'schedule' => [
        'leads_import' => (bool) env('CRM_SCHEDULE_LEADS_IMPORT', true),
        'reminders' => (bool) env('CRM_SCHEDULE_REMINDERS', false),
        'daily_checks' => (bool) env('CRM_SCHEDULE_DAILY_CHECKS', false),
    ],

    // SEPA-machtiging via het Elementor-formulier op kivii.nl.
    'mandate_form_url' => env('CRM_MANDATE_FORM_URL', 'https://kivii.nl/incasso-machtiging/'),
    'mandate_valid_days' => (int) env('CRM_MANDATE_VALID_DAYS', 30),
];
