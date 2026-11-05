<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('outbound_emails') || Schema::hasColumn('outbound_emails', 'edited_at')) {
            return;
        }

        Schema::table('outbound_emails', function (Blueprint $table) {
            // Gezet zodra iemand het concept handmatig opslaat; zonder waarde wordt het concept steeds opnieuw opgebouwd.
            $table->timestamp('edited_at')->nullable();
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('outbound_emails') && Schema::hasColumn('outbound_emails', 'edited_at')) {
            Schema::table('outbound_emails', function (Blueprint $table) {
                $table->dropColumn('edited_at');
            });
        }
    }
};
