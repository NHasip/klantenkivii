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
];

