# cPanel installatie (PHP 8.3 + MySQL)

## 1) Vereisten
- PHP 8.3 (CLI en web)
- Extensies: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `json`, `fileinfo`, `curl`, `xml`, `zip`
- Optioneel: `imap` (alleen nodig voor IMAP import `leads:import-imap`)
- 1 MySQL database + user

## 2) Upload / document root
Aanbevolen:
- Zet de **document root** van je (sub)domein op `public/`.

## 3) .env configuratie
1. Kopieer `.env.example` naar `.env`
2. Vul minimaal:
   - `APP_URL`
   - `APP_KEY` (stap 4)
   - `DB_CONNECTION=mysql` + `DB_*`
   - `MAIL_*` (SMTP)
   - `QUEUE_CONNECTION=database`
   - `LEADS_WEBHOOK_TOKEN`
   - Admin seed: `KIVII_ADMIN_*`
   - Optioneel IMAP: `IMAP_*`

## 4) Composer + key
Laravel 11 vereist PHP 8.2+.

Op server (voorbeeld met php83):
- `php83 composer.phar install --no-dev --optimize-autoloader`
- `php83 artisan key:generate`

Let op: deze repo bevat wijzigingen in `composer.json` (Jetstream/Livewire/Tailwind). Draai `composer update` op een PHP 8.3 omgeving als je `composer.lock` wilt bijwerken.

## 5) Migraties + seed
- `php83 artisan migrate --force`
- `php83 artisan db:seed --force`

Seeder maakt:
- 1 admin user (`KIVII_ADMIN_*` in `.env`)
- Standaard modules

## 6) Storage link
- `php83 artisan storage:link`

## 7) Frontend assets (Tailwind)
Aanbevolen: build lokaal en upload `public/build`.
- `npm install`
- `npm run build`

## 8) Jetstream (auth + 2FA)
Deze codebase verwacht Jetstream (Livewire) voor auth en 2FA.

Na `composer install` (op PHP 8.3):
- `php83 artisan jetstream:install livewire`
- `php83 artisan migrate --force`

Admin 2FA is verplicht via middleware (`admin.2fa`).

## 9) Cron (Scheduler)
Maak een cronjob in cPanel:
- Elke 5 minuten: `php83 /home/<user>/path/to/artisan schedule:run >> /dev/null 2>&1`

Scheduler draait o.a.:
- `reminders:send-due`
- `leads:import-imap`

## 10) Queue (database driver)
Zonder supervisor (shared hosting):
- Cron elke minuut: `php83 /home/<user>/path/to/artisan queue:work --stop-when-empty --max-time=240 --tries=3 >> /dev/null 2>&1`

## 11) Webhook test
`POST https://<domein>/api/leads/webhook`
Headers:
- `X-Webhook-Token: <LEADS_WEBHOOK_TOKEN>`

Body (JSON):
```json
{
  "bedrijfsnaam": "Voorbeeld Garage BV",
  "contactnaam": "Jan Jansen",
  "email": "jan@example.com",
  "telefoon": "+31 6 12345678",
  "plaats": "Utrecht",
  "bericht": "Graag een demo."
}
```

