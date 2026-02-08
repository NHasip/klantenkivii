<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('subject');
            $table->longText('body_html')->nullable();
            $table->longText('body_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('email_templates')->insert([
            'key' => 'welcome_customer',
            'name' => 'Welkomstmail nieuwe klant',
            'subject' => 'Welkom bij Kivii, {{bedrijfsnaam}}',
            'body_html' => $this->defaultHtml(),
            'body_text' => $this->defaultText(),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }

    private function defaultHtml(): string
    {
        return <<<HTML
<div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <p>Hallo {{naam}},</p>
  <p>
    Als eerst fijn jullie te hebben gesproken en bedankt voor jullie interesse in Kivii en van harte welkom!
    We zijn blij dat je voor onze garage software hebt gekozen om te proberen en staan klaar om je te helpen
    jouw werkproces nog efficiënter te maken.
  </p>
  <p>Hier zijn alvast jouw logingegevens om direct aan de slag te gaan:</p>
  <ul style="padding-left: 18px;">
    <li><strong>Weblink:</strong> {{weblink}}</li>
    <li><strong>Loginnaam:</strong> {{loginnaam}}</li>
    <li><strong>Wachtwoord:</strong> {{wachtwoord}}</li>
  </ul>
  <p>Hieronder vind je meer informatie over het basispakket en de aanvullende mogelijkheden:</p>
  <p><strong>Kivii Basispakket – €69 per maand</strong></p>
  <p>Ons basispakket bevat een uitgebreide set functies die speciaal zijn afgestemd op de behoeften van garages, waaronder:</p>
  <ul style="padding-left: 18px;">
    <li>Afsprakenbeheer</li>
    <li>Facturering en inkoopfacturen</li>
    <li>Werkbonnen en offertes</li>
    <li>Klantenoverzicht</li>
    <li>APK-herinneringen</li>
    <li>Voorraadbeheer</li>
    <li>Grossierkoppeling</li>
  </ul>
  <p>De kosten voor het basispakket bedragen €69 per maand, en de facturering vindt altijd een maand vooraf plaats.</p>
  <p><strong>Extra Modules</strong></p>
  <ol style="padding-left: 18px;">
    <li>Auto inkoop/verkoop module – Voeg deze functie toe voor slechts €49 per maand.</li>
    <li>Boekhoudkoppeling – Voor eenmalig €275 installatiekosten en €15,00 per maand krijg je eenvoudig inzicht in je boekhouding.</li>
    <li>Extra gebruikers – Het basispakket bevat 1 gebruiker. Extra gebruikers toevoegen? Dat kan voor slechts €5 per gebruiker per maand.</li>
  </ol>
  <p>Laat ons weten of je interesse hebt in een van deze extra modules, en wij activeren ze direct voor je.</p>
  <p><strong>Automatische Incasso</strong></p>
  <p>
    Om jouw account volledig te activeren en het demo-account om te zetten naar een live omgeving, vragen we je vriendelijk
    om ons automatische incassoformulier in te vullen via de volgende link: {{weblink}}.
  </p>
  <p><strong>Jouw Profiel Compleet Maken</strong></p>
  <p>
    We raden aan om je profielpagina zo volledig mogelijk in te vullen met je bedrijfsgegevens en diensten. Denk hierbij
    ook aan het vooraf invullen van je producten en diensten met de bijbehorende prijzen. Dit bespaart je veel tijd bij het
    maken van offertes en facturen, omdat deze informatie dan direct beschikbaar is en automatisch ingevuld wordt.
  </p>
  <p>
    Als je vragen hebt of verdere hulp nodig hebt bij het instellen van jouw account, aarzel dan niet om contact op te nemen.
    Wij staan voor je klaar! We kijken ernaar uit om je verder te ondersteunen en wensen je veel succes met Kivii.
  </p>
</div>
HTML;
    }

    private function defaultText(): string
    {
        return <<<TEXT
Hallo {{naam}},

Als eerst fijn jullie te hebben gesproken en bedankt voor jullie interesse in Kivii en van harte welkom! We zijn blij dat je voor onze garage software hebt gekozen om te proberen en staan klaar om je te helpen jouw werkproces nog efficiënter te maken.

Hier zijn alvast jouw logingegevens om direct aan de slag te gaan:
Weblink: {{weblink}}
Loginnaam: {{loginnaam}}
Wachtwoord: {{wachtwoord}}

Hieronder vind je meer informatie over het basispakket en de aanvullende mogelijkheden:

Kivii Basispakket – €69 per maand
Ons basispakket bevat een uitgebreide set functies die speciaal zijn afgestemd op de behoeften van garages, waaronder:
- Afsprakenbeheer
- Facturering en inkoopfacturen
- Werkbonnen en offertes
- Klantenoverzicht
- APK-herinneringen
- Voorraadbeheer
- Grossierkoppeling

De kosten voor het basispakket bedragen €69 per maand, en de facturering vindt altijd een maand vooraf plaats.

Extra Modules
1. Auto inkoop/verkoop module – Voeg deze functie toe voor slechts €49 per maand.
2. Boekhoudkoppeling – Voor eenmalig €275 installatiekosten en €15,00 per maand krijg je eenvoudig inzicht in je boekhouding.
3. Extra gebruikers – Het basispakket bevat 1 gebruiker. Extra gebruikers toevoegen? Dat kan voor slechts €5 per gebruiker per maand.

Laat ons weten of je interesse hebt in een van deze extra modules, en wij activeren ze direct voor je.

Automatische Incasso
Om jouw account volledig te activeren en het demo-account om te zetten naar een live omgeving, vragen we je vriendelijk om ons automatische incassoformulier in te vullen via de volgende link: {{weblink}}.

Jouw Profiel Compleet Maken
We raden aan om je profielpagina zo volledig mogelijk in te vullen met je bedrijfsgegevens en diensten. Denk hierbij ook aan het vooraf invullen van je producten en diensten met de bijbehorende prijzen. Dit bespaart je veel tijd bij het maken van offertes en facturen, omdat deze informatie dan direct beschikbaar is en automatisch ingevuld wordt. Zo zorg je voor een professionele en efficiënte uitstraling richting je klanten.

Als je vragen hebt of verdere hulp nodig hebt bij het instellen van jouw account, aarzel dan niet om contact op te nemen. Wij staan voor je klaar! We kijken ernaar uit om je verder te ondersteunen en wensen je veel succes met Kivii.
TEXT;
    }
};
