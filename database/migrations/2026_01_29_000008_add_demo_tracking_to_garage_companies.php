<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            $table->unsignedInteger('demo_duur_dagen')->nullable()->after('demo_gepland_op');
            $table->dateTime('demo_eind_op')->nullable()->index()->after('demo_duur_dagen');
        });
    }

    public function down(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            $table->dropColumn(['demo_duur_dagen', 'demo_eind_op']);
        });
    }
};
