<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Automatische demo-mailreeks (dag 2, 5 en 13). Alleen nieuwe tabellen; bestaande data blijft ongewijzigd.
 * Zelfstandig uit te voeren met: php artisan migrate --path=database/migrations/2026_10_31_300001_create_demo_mail_sequences_table.php
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('demo_mail_sequences')) {
            Schema::create('demo_mail_sequences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();
                // Gelijk aan garage_company_id zolang de reeks actief is, anders null: maximaal één actieve reeks per klant.
                $table->unsignedBigInteger('active_company_id')->nullable()->unique();
                $table->string('status', 20)->default('actief')->index();
                $table->dateTime('started_at');
                $table->dateTime('stopped_at')->nullable();
                $table->string('stop_reason')->nullable();
                $table->foreignId('stopped_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('finished_at')->nullable();
                $table->timestamps();

                $table->index(['garage_company_id', 'status']);
            });
        }

        if (! Schema::hasTable('demo_mail_steps')) {
            Schema::create('demo_mail_steps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('demo_mail_sequence_id')->constrained('demo_mail_sequences')->cascadeOnDelete();
                $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();
                $table->string('step_key', 40);
                $table->unsignedSmallInteger('day_offset');
                $table->dateTime('due_at')->index();
                $table->string('status', 20)->default('gepland')->index();
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->dateTime('sent_at')->nullable();
                $table->string('recipient_email')->nullable();
                $table->string('subject')->nullable();
                $table->string('reason')->nullable();
                $table->text('last_error')->nullable();
                $table->unsignedBigInteger('outbound_email_id')->nullable();
                $table->timestamps();

                // Nooit dezelfde stap twee keer binnen een reeks.
                $table->unique(['demo_mail_sequence_id', 'step_key']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_mail_steps');
        Schema::dropIfExists('demo_mail_sequences');
    }
};
