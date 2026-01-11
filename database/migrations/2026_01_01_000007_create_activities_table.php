<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();

            $table->foreignId('garage_company_id')->constrained('garage_companies')->cascadeOnDelete();

            $table->enum('type', [
                'status_wijziging',
                'notitie',
                'taak',
                'afspraak',
                'demo',
                'mandate',
                'module',
                'systeem',
            ])->index();

            $table->string('titel');
            $table->text('inhoud')->nullable();
            $table->dateTime('due_at')->nullable()->index();
            $table->dateTime('done_at')->nullable()->index();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();

            $table->index(['garage_company_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
