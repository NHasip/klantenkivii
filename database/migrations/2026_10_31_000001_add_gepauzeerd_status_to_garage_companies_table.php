<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Voegt de klantstatus 'gepauzeerd' toe plus de velden gepauzeerd_op,
 * gepauzeerd_tot en gepauzeerd_reden. Bestaande rijen worden niet gewijzigd.
 *
 * MySQL/MariaDB: de ENUM-kolom wordt uitgebreid via ALTER TABLE ... MODIFY.
 * SQLite: Laravel maakt van enum een varchar met CHECK-constraint. Die wordt
 * hier via Blueprint::change() opnieuw opgebouwd (Laravel 11 bouwt de tabel
 * dan opnieuw op). Mislukt dat, dan gaat de migratie gewoon door; tests op
 * SQLite kunnen dan geen 'gepauzeerd' opslaan.
 */
return new class extends Migration
{
    private const BASE_VALUES = [
        'lead',
        'demo_aangevraagd',
        'demo_gepland',
        'proefperiode',
        'actief',
        'opgezegd',
        'verloren',
    ];

    public function up(): void
    {
        $this->setStatusValues([...self::BASE_VALUES, 'gepauzeerd']);

        Schema::table('garage_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('garage_companies', 'gepauzeerd_op')) {
                $table->date('gepauzeerd_op')->nullable();
            }
            if (! Schema::hasColumn('garage_companies', 'gepauzeerd_tot')) {
                $table->date('gepauzeerd_tot')->nullable();
            }
            if (! Schema::hasColumn('garage_companies', 'gepauzeerd_reden')) {
                $table->string('gepauzeerd_reden', 255)->nullable();
            }
        });
    }

    public function down(): void
    {
        $dropColumns = array_values(array_filter(
            ['gepauzeerd_op', 'gepauzeerd_tot', 'gepauzeerd_reden'],
            fn (string $column) => Schema::hasColumn('garage_companies', $column),
        ));

        if ($dropColumns !== []) {
            Schema::table('garage_companies', function (Blueprint $table) use ($dropColumns) {
                $table->dropColumn($dropColumns);
            });
        }

        // Alleen terugzetten als er geen gepauzeerde klanten meer zijn, anders
        // zou MySQL die rijen afkappen. Zet ze eerst handmatig terug.
        if (DB::table('garage_companies')->where('status', 'gepauzeerd')->exists()) {
            throw new RuntimeException('Er zijn nog klanten met status gepauzeerd. Hervat ze eerst voordat je deze migratie terugdraait.');
        }

        $this->setStatusValues(self::BASE_VALUES);
    }

    /**
     * @param  list<string>  $values
     */
    private function setStatusValues(array $values): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $list = implode(', ', array_map(fn (string $v) => "'".$v."'", $values));
            DB::statement("ALTER TABLE `garage_companies` MODIFY COLUMN `status` ENUM({$list}) NOT NULL DEFAULT 'lead'");

            return;
        }

        if ($driver === 'sqlite') {
            try {
                Schema::table('garage_companies', function (Blueprint $table) use ($values) {
                    $table->enum('status', $values)->default('lead')->change();
                });
            } catch (\Throwable $e) {
                report($e);
            }
        }
        // Overige drivers (pgsql): enum is daar een CHECK-constraint; niet ondersteund in productie.
    }
};
