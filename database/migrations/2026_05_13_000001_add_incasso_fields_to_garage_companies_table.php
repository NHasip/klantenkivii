<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('garage_companies', 'incasso_kenmerk_machtiging')) {
                $table->string('incasso_kenmerk_machtiging', 255)->nullable();
            }
            if (! Schema::hasColumn('garage_companies', 'incasso_formulier_path')) {
                $table->string('incasso_formulier_path', 1024)->nullable();
            }
            if (! Schema::hasColumn('garage_companies', 'incasso_formulier_naam')) {
                $table->string('incasso_formulier_naam', 255)->nullable();
            }
            if (! Schema::hasColumn('garage_companies', 'incasso_formulier_uploaded_at')) {
                $table->dateTime('incasso_formulier_uploaded_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            $dropColumns = [];
            foreach ([
                'incasso_kenmerk_machtiging',
                'incasso_formulier_path',
                'incasso_formulier_naam',
                'incasso_formulier_uploaded_at',
            ] as $column) {
                if (Schema::hasColumn('garage_companies', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if ($dropColumns !== []) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
