<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_persons', function (Blueprint $table) {
            $table->id();

            $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();

            $table->string('voornaam');
            $table->string('achternaam');
            $table->string('rol')->nullable();
            $table->string('email');
            $table->string('telefoon')->nullable();
            $table->boolean('is_primary')->default(false)->index();
            $table->boolean('active')->default(true)->index();

            $table->timestamps();

            $table->unique(['garage_company_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_persons');
    }
};

