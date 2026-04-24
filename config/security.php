<?php

return [
    'attachments' => [
        'virus_scan' => (bool) env('ATTACHMENTS_VIRUS_SCAN', false),
        'clamav' => [
            'host' => env('CLAMAV_HOST', '127.0.0.1'),
            'port' => (int) env('CLAMAV_PORT', 3310),
            'timeout' => (int) env('CLAMAV_TIMEOUT', 5),
        ],
    ],

    'passkeys' => [
        'rp_name' => env('PASSKEYS_RP_NAME', env('APP_NAME', 'Kivii CRM')),
        'rp_id' => env('PASSKEYS_RP_ID'),
        'origins' => array_filter(array_map('trim', explode(',', (string) env('PASSKEYS_ALLOWED_ORIGINS', '')))),
        'user_verification' => env('PASSKEYS_USER_VERIFICATION', 'preferred'),
    ],
];
