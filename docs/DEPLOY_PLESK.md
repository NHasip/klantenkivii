# Deploy (Plesk, via Git)

Deze handleiding is voor de situatie zonder SSH/terminal, waarbij je lokaal ontwikkelt, daarna pusht naar GitHub en Plesk “pull/deploy” doet.

## 1) Server directory / document root
- In Plesk moet de **document root** naar `public/` wijzen (Laravel).
- Verwijder/rename een eventuele `index.html` (Plesk default page) in de document root.

## 2) `.env` op de server
`.env` staat in `.gitignore` en wordt bewust **niet** gepusht.

Maak op de server een `.env` (kopie van `.env.example`) en vul minimaal in:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://klanten.necmardemo.nl`
- `APP_KEY=...` (kopieer de waarde uit lokaal)
- `DB_CONNECTION=mysql` + `DB_HOST/DB_DATABASE/DB_USERNAME/DB_PASSWORD`

Na aanpassen: verwijder `bootstrap/cache/config.php` als die bestaat.

## 3) Database
Optie A (aanrader): migrations + seed op de server:
- `php artisan migrate --force`
- `php artisan db:seed --force`

Optie B: handmatig import via phpMyAdmin:
- Import: `docs/plesk/necmarde_klanten.sql`

## 4) Front-end assets (Vite)
Deze repo gebruikt `@vite(...)`. Daarom moet in productie `public/build/manifest.json` bestaan.

Werkwijze:
- Lokaal: `npm run build`
- Commit + push (map `public/build/` staat in Git)
- Plesk: pull/deploy → assets zijn meteen up-to-date.

## 5) Composer dependencies
De map `vendor/` staat in `.gitignore`. Op de server moet je daarom dependencies installeren:
- Via Plesk “Composer” (aanrader): `composer install --no-dev --optimize-autoloader`

Als `vendor/autoload.php` ontbreekt krijg je een HTTP 500.

