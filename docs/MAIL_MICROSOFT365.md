# E-mail via Microsoft 365 (info@kivii.nl)

Alle uitgaande mail van het CRM gaat **alleen** via Microsoft Graph vanuit de mailbox `info@kivii.nl`. Er wordt nooit via de hosting-SMTP of sendmail verstuurd en er is geen fallback.

Dit geldt voor alles: welkomstmails, demo-mails, machtigingsmails, e-mailherinneringen, taakmeldingen, wachtwoordherstel, testmails en mail uit de wachtrij.

## Hoe het werkt

- `App\Services\Mail\MicrosoftGraphMailer` haalt een token op (client credentials, gecachet) en roept `POST /users/{afzender}/sendMail` aan met `saveToSentItems: true`. Verzonden mail staat dus in Verzonden items van info@kivii.nl.
- `App\Mail\Transport\MicrosoftGraphTransport` is de Laravel-mailtransport `msgraph`. Hij zet een Laravel/Symfony-mail om naar een Graph-bericht: aan, cc, bcc, antwoordadres, HTML (of platte tekst als er geen HTML is) en bijlagen als `fileAttachment` (base64, ook inline afbeeldingen). Bijlagen samen maximaal ongeveer 3 MB per mail.
- `AppServiceProvider` maakt `msgraph` altijd de standaardmailer en zet de afzender vast op `Kivii <info@kivii.nl>`. `MAIL_MAILER` en `MAIL_FROM_*` uit `.env` worden genegeerd. De mailers `smtp`, `sendmail`, `failover` en `roundrobin` lopen ook via Graph, zodat er geen omweg is. Alleen tijdens unit-tests is de `array`-mailer actief.
- Een afzender die in een mail zelf staat, wordt genegeerd: Graph verstuurt altijd vanuit de ingestelde mailbox.

## Instellen

Volg de stappen in `docs/MACHTIGING_KIVII_NL.md`, hoofdstuk 2 (app-registratie in Microsoft Entra, Mail.Send als toepassingsmachtiging met beheerderstoestemming, en beperken tot alleen info@kivii.nl). Zet daarna in `.env`:

```
MSGRAPH_TENANT_ID=...
MSGRAPH_CLIENT_ID=...
MSGRAPH_CLIENT_SECRET=...
MSGRAPH_SENDER=info@kivii.nl
```

Na wijzigen: `php artisan config:clear` (of `config:cache`).

## Controleren

- **Profiel > Systeeminstellingen > Systeem-e-mail** (alleen admins) toont "Verzending via Microsoft 365 (info@kivii.nl): ingesteld/niet ingesteld" en heeft een knop **Testmail sturen**. De testmail gaat via precies dezelfde route als alle andere mail.
- Het SMTP-formulier is verwijderd. De oude tabel `smtp_settings` wordt niet meer gebruikt.

## Als het misgaat

- Zonder koppeling geeft de transport een duidelijke Nederlandse fout ("De Microsoft-koppeling voor info@kivii.nl is nog niet ingesteld...") en wordt er niets verstuurd.
- Welkomstmails: status `failed` met `last_error` in `outbound_emails`; zichtbaar in het **E-maillog** met een begrijpelijke uitleg.
- E-mailherinneringen (`reminders:send-due`): fouten worden gelogd (`storage/logs`) en de run gaat door met de volgende herinnering. Een herinnering wordt maximaal 3 keer geprobeerd. Zonder koppeling slaat de run alle mail over; de herinneringen blijven staan.
- Taakmeldingen: de melding in het CRM blijft altijd werken; mislukt de e-mail, dan wordt dat gelogd zonder dat de taakactie mislukt. Zonder koppeling wordt alleen de CRM-melding gemaakt.
- Wachtwoordherstel: lukt versturen niet, dan ziet de gebruiker een nette melding op het formulier.
