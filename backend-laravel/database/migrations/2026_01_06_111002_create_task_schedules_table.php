<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('task_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('work_day'); // День работы (1, 2, 3...)
            $table->timestamp('scheduled_at'); // Запланированное время отправки
            $table->boolean('is_sent')->default(false); // Отправлен ли таск
            $table->timestamp('sent_at')->nullable(); // Время фактической отправки
            $table->timestamps();
            
            $table->index(['user_id', 'work_day', 'is_sent']);
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_schedules');
    }
};
