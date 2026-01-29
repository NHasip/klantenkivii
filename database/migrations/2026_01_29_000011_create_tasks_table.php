<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_project_id')->nullable()->constrained('task_projects')->nullOnDelete();
            $table->string('titel');
            $table->text('omschrijving')->nullable();
            $table->enum('status', ['open', 'in_behandeling', 'wacht_op_klant', 'afgerond'])->default('open')->index();
            $table->enum('prioriteit', ['laag', 'normaal', 'hoog', 'kritiek'])->default('normaal')->index();
            $table->dateTime('deadline')->nullable()->index();
            $table->dateTime('afgerond_op')->nullable()->index();
            $table->text('labels')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
