<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Machtigingsverzoeken via het formulier op kivii.nl. Alleen een nieuwe tabel; bestaande data blijft ongewijzigd.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sepa_mandate_requests')) {
            return;
        }

        Schema::create('sepa_mandate_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garage_company_id')->nullable()->constrained('garage_companies')->nullOnDelete();
            $table->string('ref_token', 64)->unique();
            $table->string('kenmerk', 35)->unique();
            $table->string('status', 20)->default('open')->index();
            $table->dateTime('expires_at')->nullable();
            $table->string('recipient_email')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sent_via', 20)->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->foreignId('sepa_mandate_id')->nullable()->constrained('sepa_mandates')->nullOnDelete();
            $table->text('iban')->nullable();
            $table->json('payload')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['garage_company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sepa_mandate_requests');
    }
};
