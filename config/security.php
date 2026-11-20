<?php

// Passkeys zijn alleen actief op dit domein. rpId en origin volgen hier vast uit
// (niet uit APP_URL of de Host-header), zodat ze nergens anders werken.
$passkeyHost = strtolower(trim((string) env('PASSKEYS_HOST', 'klanten.necmardemo.nl')));

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
        'host' => $passkeyHost,
        'rp_id' => $passkeyHost,
        'origins' => $passkeyHost !== '' ? ['https://'.$passkeyHost] : [],
        'user_verification' => env('PASSKEYS_USER_VERIFICATION', 'required'),
    ],
];
