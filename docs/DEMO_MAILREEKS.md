# Demo-mailreeks

Automatische opvolgmails tijdens de demo van Kivii.

## Wanneer start de reeks?

Op het moment dat de status van een klant van **Demo aangevraagd** naar **Demo** (`proefperiode`) gaat.
Dit wordt opgevangen in `App\Observers\GarageCompanyObserver` (event `updated`), dus elk pad telt mee:
het overzichtsformulier, de snelle statusknoppen op het tabblad Demo/status, pauzeren/hervatten, enzovoort.

- `started_at` = moment van de statuswijziging.
- Klanten die al op Demo stonden voordat deze functie live ging krijgen **geen** reeks (geen backfill).
- Een nieuwe klant die direct als Demo wordt aangemaakt of geïmporteerd krijgt ook geen reeks
  (er is geen overgang vanaf Demo aangevraagd). Een admin kan dan handmatig op "Reeks starten" klikken.

## De mails

| Stap | Dag | Template-key | Naam |
| --- | --- | --- | --- |
| 1 | 2 | `demo_dag_2` | Demo dag 2: lukt het inloggen? |
| 2 | 5 | `demo_dag_5` | Demo dag 5: ontdek de modules |
| 3 | 13 | `demo_dag_13` | Demo dag 13: hoe bevalt Kivii? |

De teksten zijn systeemtemplates en zijn aan te passen via **E-mailtemplates**. Beschikbare variabelen:
`{{ naam }}`, `{{ bedrijfsnaam }}`, `{{ loginnaam }}`, `{{ weblink }}` en `{{ modules }}`
(actieve modules van de klant, anders de standaard zichtbare modules). Staat een template uit (verborgen),
dan wordt die stap overgeslagen.

## Versturen

- Alleen via Microsoft Graph (`App\Services\Mail\MicrosoftGraphMailer`) namens info@kivii.nl. Er is geen SMTP-fallback.
- Is Graph niet ingesteld, dan wordt niets verstuurd: de stap blijft gepland. Er verschijnt een waarschuwing in de bel
  en op de klantkaart.
- Ontvanger: `login_email`, anders `hoofd_email`, anders het e-mailadres van het hoofdcontact. Geen geldig adres:
  de stap wordt overgeslagen met reden.
- Er wordt alleen verstuurd tussen 08:00 en 20:00 (Europe/Amsterdam). Daarbuiten wachten de mails tot de volgende run.
- Elke verstuurde mail komt als activiteit op de tijdlijn en in `outbound_emails` (type = template-key).
- Een mislukte verzending wordt bij de volgende run opnieuw geprobeerd, maximaal 3 keer. Daarna krijgt de stap
  de status "Mislukt" (activiteit + melding in de bel).

## Taakplanner

```
php artisan crm:demo-sequence
```

Draait elk uur via `routes/console.php`, aan/uit met `CRM_SCHEDULE_DEMO_SEQUENCE` (standaard `true`).

Veiligheid tegen dubbel versturen:
- Unieke sleutel op (`demo_mail_sequence_id`, `step_key`) en maximaal één actieve reeks per klant (`active_company_id` uniek).
- Een stap wordt atomair geclaimd (`gepland` naar `bezig`) voordat er verstuurd wordt; plus een cache-lock en `withoutOverlapping()`.
- Zijn meerdere stappen tegelijk aan de beurt (bijv. cron lag stil), dan gaat alleen de laatste uit en worden de
  eerdere als "Overgeslagen" gemarkeerd. Een klant krijgt dus nooit meerdere mails tegelijk.

## Stoppen

- Automatisch zodra de status van Demo naar iets anders gaat (en als vangnet bij elke run).
- Handmatig met **Reeks stoppen** op de klantpagina (tabblad Demo/status, alleen admin).
- **Reeks opnieuw starten** (alleen admin, alleen als de klant op Demo staat) plant drie nieuwe mails vanaf nu.

## Database

Migratie `database/migrations/2026_10_31_300001_create_demo_mail_sequences_table.php` maakt alleen nieuwe tabellen
(`demo_mail_sequences`, `demo_mail_steps`). Productie:

```
php artisan migrate --path=database/migrations/2026_10_31_300001_create_demo_mail_sequences_table.php --force
```
