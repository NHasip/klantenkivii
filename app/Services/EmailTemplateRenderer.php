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
            $output = str_replace('{{'.$key.'}}', $value, $output);
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
            'wachtwoord' => 'Voorbeeld123!',
            'weblink' => 'https://web.kivii.nl/',
        ];
    }
}
