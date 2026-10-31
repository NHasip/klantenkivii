# SEPA-machtiging via kivii.nl

Klanten vullen de machtiging in op het bestaande Elementor Pro-formulier op
<https://kivii.nl/incasso-machtiging/>. De beheerder stuurt de link vanuit het CRM (altijd handmatig) en
na het insturen komt de machtiging automatisch bij de juiste klant.

## Werking in het kort

1. Klantpagina > Abonnement > "Machtiging via kivii.nl" (of de snelknop "Machtiging versturen" in de kop).
2. Kies ontvanger en template, controleer het voorbeeld en kies:
   - **Versturen**: via Microsoft 365 namens info@kivii.nl (komt ook in Verzonden items).
   - **Openen in Outlook**: opent een mail in je eigen Outlook; verstuur die vanuit info@kivii.nl.
   - **Kopieer link**: alleen de link, bijvoorbeeld voor WhatsApp.
3. Pas bij een van deze knoppen (na bevestigen) maakt het CRM een verzoek aan met een unieke `ref`
   en een kenmerk zoals `KIVII-7KQ4M9TX`. Standaard 30 dagen geldig (`CRM_MANDATE_VALID_DAYS`).
4. De klant vult het formulier in. Elementor stuurt de gegevens naar de webhook; het CRM maakt een
   actief mandaat aan, zet het kenmerk machtiging op de klant, trekt een eerder actief mandaat in (nooit
   verwijderen) en zet een notitie op de tijdlijn (alleen de laatste 4 cijfers van de IBAN).
5. Inzendingen zonder geldige `ref` worden gekoppeld op e-mailadres of exacte bedrijfsnaam. Lukt dat niet,
   of is de IBAN ongeldig, dan staat de inzending onder **Instellingen > Machtigingen** met
   "Koppelen aan klant" en "Verwerken". De bel en het dashboard melden dit.

**Belangrijk: machtigingsmails gaan alleen weg vanuit info@kivii.nl, nooit via de CRM-hosting of SMTP.**
Zolang de Microsoft-koppeling niet is ingesteld, staat de knop Versturen uit met de melding
"Stel eerst de Microsoft-koppeling voor info@kivii.nl in". Gebruik dan "Openen in Outlook" of "Kopieer link".

Template-variabelen (ook te gebruiken in eigen templates onder E-mail templates):
`{{ machtigingslink }}`, `{{ kenmerk }}`, `{{ geldig_tot }}`, `{{ bedrijfsnaam }}`, `{{ naam }}`.
De standaardtekst "SEPA-machtiging" zit in de code; met "Opslaan als template" maak je er een
bewerkbare template van.

## 1. Elementor-formulier instellen (kivii.nl)

Open de pagina `incasso-machtiging` in Elementor en selecteer het formulier.

### Verborgen velden toevoegen

Voeg twee velden toe van het type **Hidden**:

| Label     | ID (Geavanceerd > ID) | Standaardwaarde                                                        |
|-----------|-----------------------|------------------------------------------------------------------------|
| ref       | `ref`                 | Dynamic Tags > Request Parameter, Type: **GET**, Parameter name: `ref`     |
| kenmerk   | `kenmerk`             | Dynamic Tags > Request Parameter, Type: **GET**, Parameter name: `kenmerk` |

Optioneel kun je het veld Bedrijfsnaam vooraf invullen met Request Parameter `bedrijf`.

### Velden die het CRM herkent

Het CRM herkent velden op ID of label (hoofdletters, accenten, spaties en leestekens maken niet uit):

| Gegeven              | Herkende ID's of labels                                       |
|----------------------|---------------------------------------------------------------|
| ref                  | `ref`, `referentie`                                           |
| kenmerk              | `kenmerk`                                                     |
| Bedrijfsnaam         | `bedrijfsnaam`, `bedrijf`, `company`                          |
| Voor- en achternaam  | `naam`, `voor_en_achternaam`, `name`, `rekeninghouder`        |
| Straat en huisnummer | `adres`, `straat`, `straat_en_huisnummer`, `address`          |
| Postcode             | `postcode`, `zip`                                             |
| Plaats               | `plaats`, `city`                                              |
| Land                 | `land`, `country`                                             |
| IBAN                 | `iban`, `rekeningnummer`                                      |
| BIC (optioneel)      | `bic`                                                         |
| E-mailadres          | `email`, `e_mailadres`                                        |
| Telefoonnummer       | `telefoon`, `telefoonnummer`, `phone`                         |
| Plaats van tekenen   | `plaats_van_tekenen`, `ondertekend_te`                        |
| Datum van tekenen    | `datum_van_tekenen`, `datum` (dd-mm-jjjj, dd/mm/jjjj of jjjj-mm-dd) |
| Akkoord-checkbox     | `akkoord`, `consent`, `toestemming`, `machtiging`             |

Tip: geef de velden in Elementor bij voorkeur exact deze ID's (Geavanceerd > ID).

### Webhook-actie toevoegen

1. Formulier > **Acties na verzenden** > voeg **Webhook** toe (bestaande acties zoals e-mail mogen blijven).
2. Tab Webhook > URL:
   `https://klanten.necmardemo.nl/api/mandates/webhook?token=<LEADS_WEBHOOK_TOKEN>`
   (dezelfde sleutel als de lead-webhook, uit de `.env` van het CRM).
3. **Geavanceerde gegevens: uit.**
4. Opslaan en een test doen met een testklant. Het CRM antwoordt altijd `{"ok":true}`, zodat de
   bezoeker nooit een foutmelding ziet. Controleer het resultaat onder Instellingen > Machtigingen.

## 2. Microsoft 365: versturen namens info@kivii.nl

### App-registratie in Microsoft Entra

1. <https://entra.microsoft.com> > Applicaties > App-registraties > **Nieuwe registratie**.
   Naam bijvoorbeeld "Kivii CRM mail", alleen accounts in deze organisatie, geen redirect-URI.
2. Noteer **Application (client) ID** en **Directory (tenant) ID**.
3. Certificaten en geheimen > **Nieuw clientgeheim**. Noteer de *waarde* (alleen nu zichtbaar) en
   zet een herinnering voor de vervaldatum.
4. API-machtigingen > Machtiging toevoegen > Microsoft Graph > **Toepassingsmachtigingen** >
   `Mail.Send` > toevoegen > **Beheerderstoestemming verlenen**.

### Beperken tot alleen info@kivii.nl (sterk aanbevolen)

Zonder beperking mag de app namens elke mailbox versturen. Beperk dit met een van beide:

**Optie A: Exchange Online RBAC for Applications (nieuw, aanbevolen)**

```powershell
Connect-ExchangeOnline
New-ServicePrincipal -AppId <CLIENT_ID> -ObjectId <OBJECT_ID_VAN_ENTERPRISE_APP> -DisplayName "Kivii CRM mail"
New-ManagementScope -Name "Alleen info@kivii.nl" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'info@kivii.nl'"
New-ManagementRoleAssignment -App <CLIENT_ID> -Role "Application Mail.Send" -CustomResourceScope "Alleen info@kivii.nl"
Test-ServicePrincipalAuthorization -Identity <CLIENT_ID> -Resource info@kivii.nl
```

Gebruik je optie A, verwijder dan de Graph-machtiging `Mail.Send` met beheerderstoestemming uit de
app-registratie, anders blijft de brede toegang bestaan.

**Optie B: Application Access Policy (klassiek)**

```powershell
Connect-ExchangeOnline
New-DistributionGroup -Name "CRM mail afzenders" -Type Security -Members info@kivii.nl
New-ApplicationAccessPolicy -AppId <CLIENT_ID> -PolicyScopeGroupId "CRM mail afzenders" -AccessRight RestrictAccess -Description "Kivii CRM alleen info@kivii.nl"
Test-ApplicationAccessPolicy -Identity info@kivii.nl -AppId <CLIENT_ID>
```

Het kan tot een uur duren voordat een beleid actief is.

### .env van het CRM

```dotenv
MSGRAPH_TENANT_ID=<directory-tenant-id>
MSGRAPH_CLIENT_ID=<application-client-id>
MSGRAPH_CLIENT_SECRET=<clientgeheim-waarde>
MSGRAPH_SENDER=info@kivii.nl

# optioneel
CRM_MANDATE_FORM_URL=https://kivii.nl/incasso-machtiging/
CRM_MANDATE_VALID_DAYS=30
```

Daarna `php artisan config:clear` (of `config:cache`). Het CRM haalt een token op via client credentials
(gecachet tot kort voor het verloopt) en verstuurt met `POST /v1.0/users/info@kivii.nl/sendMail`,
met Reply-To info@kivii.nl en opslaan in Verzonden items. Fouten worden in het Nederlands getoond,
zonder geheimen.

## 3. Database

Eenmalig `php artisan migrate`: maakt alleen de nieuwe tabel `sepa_mandate_requests` aan. Bestaande
gegevens worden niet gewijzigd. De IBAN van een nog niet verwerkte inzending staat versleuteld opgeslagen
(APP_KEY) en wordt gewist zodra het mandaat is aangemaakt of het verzoek wordt ingetrokken. In logs
staan alleen het verzoek-id en de reden.
