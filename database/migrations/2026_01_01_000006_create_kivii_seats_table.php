<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kivii_seats', function (Blueprint $table) {
            $table->id();

            $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();

            $table->string('naam');
            $table->string('email');
            $table->string('rol_in_kivii')->nullable();
            $table->boolean('actief')->default(true)->index();
            $table->date('aangemaakt_op')->nullable();

            $table->timestamps();

            $table->index(['garage_company_id', 'actief']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kivii_seats');
    }
};

