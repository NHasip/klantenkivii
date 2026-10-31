<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send all email
    | messages unless another mailer is explicitly specified when sending
    | the message. All additional mailers can be configured within the
    | "mailers" array. Examples of each type of mailer are provided.
    |
    */

    // Alle uitgaande mail gaat via Microsoft 365 (info@kivii.nl). MAIL_MAILER wordt bewust genegeerd;
    // AppServiceProvider dwingt dit ook af. Zie docs/MAIL_MICROSOFT365.md.
    'default' => 'msgraph',

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Kivii verstuurt alleen via de "msgraph"-transport (Microsoft Graph).
    | SMTP en sendmail zijn verwijderd; de standaardmailers die het framework
    | meebrengt worden in AppServiceProvider ook naar Graph omgeleid.
    |
    */

    'mailers' => [

        // Enige verzendroute: Microsoft Graph vanuit de mailbox uit services.msgraph.sender.
        'msgraph' => [
            'transport' => 'msgraph',
        ],

        // Alleen voor tests en lokale debug; deze versturen niets.
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all emails sent by your application to be sent from
    | the same address. Here you may specify a name and address that is
    | used globally for all emails that are sent by your application.
    |
    */

    'from' => [
        // Altijd de Microsoft 365-mailbox; MAIL_FROM_* wordt niet gebruikt.
        'address' => env('MSGRAPH_SENDER', 'info@kivii.nl'),
        'name' => 'Kivii',
    ],

];
