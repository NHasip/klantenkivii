<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Testmodus voor de demo-mailreeks: mails na 2, 5 en 13 minuten in plaats van dagen.
 * Alleen een nieuwe kolom (standaard uit); bestaande reeksen blijven ongewijzigd.
 * Zelfstandig uit te voeren met: php artisan migrate --path=database/migrations/2026_10_31_300002_add_test_mode_to_demo_mail_sequences_table.php
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('demo_mail_sequences') && ! Schema::hasColumn('demo_mail_sequences', 'test_mode')) {
            Schema::table('demo_mail_sequences', function (Blueprint $table) {
                $table->boolean('test_mode')->default(false)->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('demo_mail_sequences') && Schema::hasColumn('demo_mail_sequences', 'test_mode')) {
            Schema::table('demo_mail_sequences', function (Blueprint $table) {
                $table->dropColumn('test_mode');
            });
        }
    }
};
