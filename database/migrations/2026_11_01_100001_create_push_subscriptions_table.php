<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Web Push: abonnementen per apparaat, meldingsvoorkeuren per gebruiker en een
 * "push verstuurd"-moment op reminders. Zelfstandig en idempotent: veilig om (opnieuw)
 * te draaien met --path, ook als een deel al bestaat.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('push_subscriptions')) {
            Schema::create('push_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                // Endpoints kunnen lang zijn: uniek via een sha256-hash.
                $table->text('endpoint');
                $table->char('endpoint_hash', 64)->unique();
                $table->string('p256dh', 255);
                $table->string('auth', 255);
                $table->string('content_encoding', 20)->nullable();
                $table->string('user_agent', 500)->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamps();

                $table->index('user_id');
            });
        }

        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'push_preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('push_preferences')->nullable();
            });
        }

        if (Schema::hasTable('reminders') && ! Schema::hasColumn('reminders', 'push_sent_at')) {
            Schema::table('reminders', function (Blueprint $table) {
                $table->timestamp('push_sent_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('reminders') && Schema::hasColumn('reminders', 'push_sent_at')) {
            Schema::table('reminders', function (Blueprint $table) {
                $table->dropColumn('push_sent_at');
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'push_preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('push_preferences');
            });
        }

        Schema::dropIfExists('push_subscriptions');
    }
};
