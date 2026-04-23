<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->decimal('default_prijs_maand_excl', 10, 2)->default(0)->after('default_visible');
            $table->decimal('default_btw_percentage', 5, 2)->default(21)->after('default_prijs_maand_excl');
        });

        DB::table('modules')->where('naam', 'Basis')->update([
            'default_prijs_maand_excl' => 99.00,
            'default_btw_percentage' => 21.00,
        ]);
        DB::table('modules')->where('naam', 'Planning')->update([
            'default_prijs_maand_excl' => 49.00,
            'default_btw_percentage' => 21.00,
        ]);
        DB::table('modules')->where('naam', 'Rapportages')->update([
            'default_prijs_maand_excl' => 29.00,
            'default_btw_percentage' => 21.00,
        ]);
        DB::table('modules')->where('naam', 'SEPA Incasso')->update([
            'default_prijs_maand_excl' => 19.00,
            'default_btw_percentage' => 21.00,
        ]);
        DB::table('modules')->where('naam', 'Koppelingen')->update([
            'default_prijs_maand_excl' => 39.00,
            'default_btw_percentage' => 21.00,
        ]);
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn(['default_prijs_maand_excl', 'default_btw_percentage']);
        });
    }
};
