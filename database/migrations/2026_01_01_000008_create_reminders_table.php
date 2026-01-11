<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('garage_company_id')->nullable()->constrained('garage_companies')->nullOnDelete();
            $table->foreignId('activity_id')->nullable()->constrained('activities')->nullOnDelete();

            $table->string('titel');
            $table->text('message')->nullable();
            $table->dateTime('remind_at')->index();

            $table->enum('channel', ['popup', 'email', 'beide'])->default('popup')->index();
            $table->enum('status', ['gepland', 'verzonden', 'geannuleerd'])->default('gepland')->index();

            $table->dateTime('email_sent_at')->nullable();
            $table->dateTime('popup_dismissed_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status', 'remind_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};

