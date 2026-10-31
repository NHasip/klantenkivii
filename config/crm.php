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
];

