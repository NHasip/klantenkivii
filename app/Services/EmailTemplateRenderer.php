<?php

namespace App\Services;

use App\Models\EmailTemplate;

class EmailTemplateRenderer
{
    /**
     * @param  array<string, string>  $data
     */
    public static function render(EmailTemplate $template, array $data): array
    {
        return [
            'subject' => self::renderString($template->subject ?? '', $data),
            'html' => self::renderString($template->body_html ?? '', $data),
            'text' => self::renderString($template->body_text ?? '', $data),
        ];
    }

    /**
     * @param  array<string, string>  $data
     */
    public static function renderString(string $content, array $data): string
    {
        $output = $content;
        foreach ($data as $key => $value) {
            $value = (string) $value;
            $pattern = '/{{\\s*'.preg_quote($key, '/').'\\s*}}/u';
            $output = preg_replace($pattern, $value, $output) ?? $output;
        }

        return $output;
    }

    /**
     * @return array<string, string>
     */
    public static function sampleData(): array
    {
        return [
            'naam' => 'Voornaam Achternaam',
            'bedrijfsnaam' => 'Voorbeeld Garagebedrijf',
            'loginnaam' => 'gebruiker@voorbeeld.nl',
            'wachtwoord' => 'Gebruik activatielink',
            'activatielink' => 'https://voorbeeld.nl/reset-password/TOKEN?email=gebruiker%40voorbeeld.nl',
            'reset_link' => 'https://voorbeeld.nl/reset-password/TOKEN?email=gebruiker%40voorbeeld.nl',
            'weblink' => 'https://web.kivii.nl/',
        ];
    }
}
