<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sepa_mandates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();

            $table->string('bedrijfsnaam');
            $table->string('voor_en_achternaam');
            $table->string('straatnaam_en_nummer');
            $table->string('postcode');
            $table->string('plaats');
            $table->string('land')->default('Nederland');
            $table->string('iban');
            $table->string('bic')->nullable();
            $table->string('email');
            $table->string('telefoonnummer');
            $table->string('plaats_van_tekenen');
            $table->date('datum_van_tekenen');

            $table->string('ondertekenaar_naam')->nullable();
            $table->boolean('akkoord_checkbox')->default(false);
            $table->dateTime('akkoord_op')->nullable();

            $table->string('mandaat_id')->unique();
            $table->enum('status', ['pending', 'actief', 'ingetrokken'])->default('pending')->index();
            $table->dateTime('ontvangen_op')->nullable()->index();

            $table->timestamps();

            $table->index(['garage_company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sepa_mandates');
    }
};

