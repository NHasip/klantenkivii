<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('garage_companies')) {
            return;
        }

        DB::table('garage_companies')
            ->where('status', 'lead')
            ->update([
                'status' => 'demo_aangevraagd',
                'updated_at' => now(),
            ]);

        DB::table('garage_companies')
            ->where('status', 'demo_gepland')
            ->update([
                'status' => 'proefperiode',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Intentionally left blank: we do not restore removed legacy statuses.
    }
};
