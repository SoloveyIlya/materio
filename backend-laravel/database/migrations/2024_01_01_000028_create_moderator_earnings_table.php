<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderator_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moderator_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->timestamp('earned_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('moderator_id');
            $table->index('earned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderator_earnings');
    }
};
