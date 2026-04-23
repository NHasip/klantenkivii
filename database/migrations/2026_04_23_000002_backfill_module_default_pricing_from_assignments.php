<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('modules', 'default_prijs_maand_excl') || ! Schema::hasColumn('modules', 'default_btw_percentage')) {
            return;
        }

        $latestRows = DB::table('garage_company_modules as gcm')
            ->join(
                DB::raw('(SELECT module_id, MAX(id) as max_id FROM garage_company_modules WHERE prijs_maand_excl > 0 GROUP BY module_id) as latest'),
                'latest.max_id',
                '=',
                'gcm.id'
            )
            ->select('gcm.module_id', 'gcm.prijs_maand_excl', 'gcm.btw_percentage')
            ->get();

        foreach ($latestRows as $row) {
            DB::table('modules')
                ->where('id', $row->module_id)
                ->where(function ($query) {
                    $query->whereNull('default_prijs_maand_excl')
                        ->orWhere('default_prijs_maand_excl', '<=', 0);
                })
                ->update([
                    'default_prijs_maand_excl' => $row->prijs_maand_excl,
                    'default_btw_percentage' => $row->btw_percentage ?: 21.00,
                ]);
        }
    }

    public function down(): void
    {
        // Geen rollback nodig voor data backfill.
    }
};

