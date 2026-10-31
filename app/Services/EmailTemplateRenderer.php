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
            'modules' => 'Basis, Planning, Rapportages',
        ];
    }

    /**
     * Standaardteksten voor de automatische demo-mailreeks (dag 2, 5 en 13).
     * Worden als systeemtemplate aangemaakt en zijn daarna bewerkbaar via E-mailtemplates.
     *
     * @return array<string, array{name:string,subject:string,body_html:string}>
     */
    public static function defaultDemoTemplates(): array
    {
        $groet = '<p>Met vriendelijke groet,<br>Team Kivii<br><a href="mailto:info@kivii.nl">info@kivii.nl</a></p>';

        return [
            'demo_dag_2' => [
                'name' => 'Demo dag 2: lukt het inloggen?',
                'subject' => 'Lukt het inloggen bij Kivii?',
                'body_html' => '<p>Hoi {{ naam }},</p>'
                    .'<p>Sinds kort kun je Kivii uitproberen voor {{ bedrijfsnaam }}. We zijn benieuwd: lukt het inloggen?</p>'
                    .'<p>Je logt in via <a href="{{ weblink }}">{{ weblink }}</a> met <strong>{{ loginnaam }}</strong>.</p>'
                    .'<p>Loop je ergens tegenaan? Beantwoord gerust deze e-mail of mail naar info@kivii.nl, dan helpen we je snel op weg.</p>'
                    .$groet,
            ],
            'demo_dag_5' => [
                'name' => 'Demo dag 5: ontdek de modules',
                'subject' => 'Haal meer uit je Kivii-demo',
                'body_html' => '<p>Hoi {{ naam }},</p>'
                    .'<p>Je bent nu een paar dagen met Kivii aan de slag. Tijd om te laten zien wat er nog meer kan.</p>'
                    .'<p>In Kivii werk je onder andere met deze modules: {{ modules }}.</p>'
                    .'<p>Tip: probeer elke module een keer uit met een echte klus uit je eigen werkplaats. Zo zie je het snelst wat Kivii voor {{ bedrijfsnaam }} kan betekenen.</p>'
                    .'<p>Wil je een module samen met ons doorlopen? Beantwoord deze e-mail, dan plannen we een kort moment in.</p>'
                    .$groet,
            ],
            'demo_dag_13' => [
                'name' => 'Demo dag 13: hoe bevalt Kivii?',
                'subject' => 'Hoe bevalt Kivii?',
                'body_html' => '<p>Hoi {{ naam }},</p>'
                    .'<p>Je werkt nu bijna twee weken met Kivii. Hoe bevalt het tot nu toe?</p>'
                    .'<p>We horen graag wat je ervan vindt. Heb je nog vragen of wil je even bellen? Beantwoord deze e-mail en we nemen contact met je op.</p>'
                    .'<p>Wil je na de demo verder met Kivii voor {{ bedrijfsnaam }}? Laat het ons weten, dan zetten we je account om naar een vast abonnement en regelen we samen de laatste stappen.</p>'
                    .$groet,
            ],
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
