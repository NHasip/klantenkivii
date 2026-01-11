<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garage_companies', function (Blueprint $table) {
            $table->id();

            $table->string('bedrijfsnaam');
            $table->string('kvk_nummer')->nullable();
            $table->string('btw_nummer')->nullable();

            // Voor leads kan adresinformatie nog ontbreken.
            $table->string('adres_straat_nummer')->nullable();
            $table->string('postcode')->nullable();
            $table->string('plaats');
            $table->string('land')->default('Nederland');
            $table->string('website')->nullable();

            $table->string('hoofd_email');
            $table->string('hoofd_telefoon');

            $table->enum('status', [
                'lead',
                'demo_aangevraagd',
                'demo_gepland',
                'proefperiode',
                'actief',
                'opgezegd',
                'verloren',
            ])->default('lead')->index();

            $table->enum('bron', [
                'website_formulier',
                'telefoon',
                'email',
                'referral',
                'anders',
            ])->default('website_formulier')->index();

            $table->text('tags')->nullable();

            $table->dateTime('demo_aangevraagd_op')->nullable()->index();
            $table->dateTime('demo_gepland_op')->nullable()->index();
            $table->dateTime('proefperiode_start')->nullable()->index();
            $table->dateTime('actief_vanaf')->nullable()->index();

            $table->dateTime('opgezegd_op')->nullable()->index();
            $table->text('opzegreden')->nullable();

            $table->dateTime('verloren_op')->nullable()->index();
            $table->text('verloren_reden')->nullable();

            $table->foreignId('eigenaar_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();

            $table->index(['bedrijfsnaam', 'hoofd_email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garage_companies');
    }
};
