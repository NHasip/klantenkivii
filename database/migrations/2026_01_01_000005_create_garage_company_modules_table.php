<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garage_company_modules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();

            $table->boolean('actief')->default(false)->index();
            $table->decimal('prijs_maand_excl', 10, 2);
            $table->date('startdatum')->nullable()->index();
            $table->date('einddatum')->nullable()->index();
            $table->decimal('btw_percentage', 5, 2)->default(21.00);

            $table->timestamps();

            $table->unique(['garage_company_id', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garage_company_modules');
    }
};

