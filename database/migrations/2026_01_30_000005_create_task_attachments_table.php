<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Compatibility shim: older environments expect this filename.
        // The actual table is created in 2026_01_29_000014_create_task_attachments_table.php.
    }

    public function down(): void
    {
        // No-op.
    }
};
