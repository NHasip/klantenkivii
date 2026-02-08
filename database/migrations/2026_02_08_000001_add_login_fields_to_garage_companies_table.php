<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            $table->string('login_email')->nullable()->after('hoofd_telefoon');
            $table->text('login_password')->nullable()->after('login_email');
        });
    }

    public function down(): void
    {
        Schema::table('garage_companies', function (Blueprint $table) {
            $table->dropColumn(['login_email', 'login_password']);
        });
    }
};
