<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tasks') || Schema::hasColumn('tasks', 'garage_company_id')) {
            return;
        }

        // Additief: nullable koppeling naar een klant. Bestaande taken blijven ongewijzigd.
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('garage_company_id')
                ->nullable()
                ->after('task_project_id')
                ->constrained('garage_companies')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('tasks', 'garage_company_id')) {
            return;
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('garage_company_id');
        });
    }
};
