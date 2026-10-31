<?php

use App\Services\Sepa\SepaTools;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * IBAN in sepa_mandates versleutelen (inhoud blijft gelijk, alleen de opslagvorm verandert)
 * en zoekkolommen iban_hash (HMAC-SHA256) en iban_last4 vullen.
 *
 * Zelfstandig en idempotent: mag meerdere keren met --path worden gedraaid. Al versleutelde
 * waarden worden herkend (Crypt::decryptString lukt) en niet opnieuw versleuteld.
 * Andere kolommen (ook updated_at) worden niet aangeraakt.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sepa_mandates')) {
            return;
        }

        if (! Schema::hasColumn('sepa_mandates', 'iban_hash')) {
            Schema::table('sepa_mandates', function (Blueprint $table) {
                $table->string('iban_hash', 64)->nullable()->index();
            });
        }
        if (! Schema::hasColumn('sepa_mandates', 'iban_last4')) {
            Schema::table('sepa_mandates', function (Blueprint $table) {
                $table->string('iban_last4', 4)->nullable()->index();
            });
        }

        $this->widenIbanColumn();

        DB::table('sepa_mandates')
            ->select(['id', 'iban', 'iban_hash', 'iban_last4'])
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $raw = $row->iban;
                    if ($raw === null || $raw === '') {
                        continue;
                    }

                    $encrypted = true;
                    try {
                        $plain = Crypt::decryptString((string) $raw);
                    } catch (DecryptException) {
                        $encrypted = false;
                        $plain = (string) $raw;
                    }

                    $updates = [];
                    if (! $encrypted) {
                        $updates['iban'] = Crypt::encryptString($plain);
                    }
                    $hash = SepaTools::ibanHash($plain);
                    $last4 = SepaTools::lastFour($plain);
                    if ($row->iban_hash !== $hash) {
                        $updates['iban_hash'] = $hash;
                    }
                    if ($row->iban_last4 !== $last4) {
                        $updates['iban_last4'] = $last4;
                    }

                    if ($updates !== []) {
                        DB::table('sepa_mandates')->where('id', $row->id)->update($updates);
                    }
                }
            });
    }

    /** Versleutelde waarden zijn ~200 tekens: kolom naar TEXT als hij nog een (korte) VARCHAR is. */
    private function widenIbanColumn(): void
    {
        $driver = DB::connection()->getDriverName();
        $type = strtolower((string) Schema::getColumnType('sepa_mandates', 'iban'));
        if (str_contains($type, 'text')) {
            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $nullable = collect(Schema::getColumns('sepa_mandates'))->firstWhere('name', 'iban')['nullable'] ?? false;
            DB::statement('ALTER TABLE `sepa_mandates` MODIFY `iban` TEXT '.($nullable ? 'NULL' : 'NOT NULL'));
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE sepa_mandates ALTER COLUMN iban TYPE TEXT');
        }
        // SQLite: VARCHAR heeft geen lengtelimiet, niets te doen.
    }

    public function down(): void
    {
        // Bewust geen terugdraaien: IBANs worden nooit weer in platte tekst opgeslagen.
    }
};
