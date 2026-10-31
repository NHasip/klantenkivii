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
            'machtigingslink' => self::mandateLink('VOORBEELDREF', 'KIVII-7KQ4M9TX', 'Voorbeeld Garagebedrijf'),
            'kenmerk' => 'KIVII-7KQ4M9TX',
            'geldig_tot' => now()->addDays((int) config('crm.mandate_valid_days', 30))->format('d-m-Y'),
        ];
    }

    /** Link naar het machtigingsformulier op kivii.nl met ref, kenmerk en bedrijfsnaam. */
    public static function mandateLink(string $ref, string $kenmerk, string $bedrijfsnaam): string
    {
        $base = (string) (config('crm.mandate_form_url') ?: 'https://kivii.nl/incasso-machtiging/');

        return $base.(str_contains($base, '?') ? '&' : '?').'ref='.rawurlencode($ref)
            .'&kenmerk='.rawurlencode($kenmerk).'&bedrijf='.urlencode($bedrijfsnaam);
    }

    /**
     * Ingebouwde standaardtekst voor de machtigingsmail. Staat in de code, niet automatisch in de database.
     *
     * @return array{key:string,name:string,subject:string,body_html:string}
     */
    public static function defaultMandateTemplate(): array
    {
        return [
            'key' => 'sepa_machtiging',
            'name' => 'SEPA-machtiging',
            'subject' => 'Machtiging automatische incasso Kivii ({{ kenmerk }})',
            'body_html' => '<p>Beste {{ naam }},</p>'
                .'<p>Voor het Kivii-abonnement van {{ bedrijfsnaam }} vragen we je om een SEPA-machtiging voor automatische incasso af te geven. Dat regel je online in een paar minuten via de knop hieronder.</p>'
                .'<p><a href="{{ machtigingslink }}">Machtiging invullen</a></p>'
                .'<p>Je kenmerk is <strong>{{ kenmerk }}</strong>. De link is geldig tot en met {{ geldig_tot }}.</p>'
                .'<p>Heb je vragen? Beantwoord dan gerust deze e-mail of mail naar info@kivii.nl.</p>'
                .'<p>Met vriendelijke groet,<br>Team Kivii</p>',
        ];
    }
}
