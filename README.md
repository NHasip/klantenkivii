## Kivii CRM (Laravel 11)

Interne CRM voor Kivii om garagebedrijven, demo aanvragen, abonnementen, SEPA mandaten, modules, seats, taken/afspraken en rapportages te beheren.

**Stack**
- Laravel 11 (PHP 8.3 target)
- Auth: Jetstream (Livewire) + 2FA (admin verplicht via middleware)
- UI: Livewire + Tailwind CSS
- Database: MySQL (1 centrale database)
- Queue: database driver
- Scheduler: cPanel cron (`schedule:run` elke 5 minuten)

**Installatie (cPanel)**
- Zie `docs/CPANEL_INSTALLATIE.md`

**Webhook**
- `POST /api/leads/webhook` met header `X-Webhook-Token: <LEADS_WEBHOOK_TOKEN>`
- Body velden: `bedrijfsnaam, contactnaam, email, telefoon, plaats, bericht`

