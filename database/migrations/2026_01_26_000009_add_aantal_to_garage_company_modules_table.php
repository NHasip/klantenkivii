<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('garage_company_modules', 'aantal')) {
            return;
        }

        Schema::table('garage_company_modules', function (Blueprint $table) {
            $table->unsignedInteger('aantal')->default(1)->after('module_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('garage_company_modules', 'aantal')) {
            return;
        }

        Schema::table('garage_company_modules', function (Blueprint $table) {
            $table->dropColumn('aantal');
        });
    }
};

