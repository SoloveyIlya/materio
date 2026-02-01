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
        Schema::create('user_task_sending_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Модератор
            $table->foreignId('admin_id')->constrained('users')->onDelete('cascade'); // Админ, создавший конфиг
            $table->json('days_config'); // Конфигурация по дням (дата, время начала/конца, выбранные таски)
            $table->boolean('is_active')->default(true); // Активна ли отправка
            $table->timestamp('started_at')->nullable(); // Когда началась отправка
            $table->timestamps();
            
            $table->unique(['user_id', 'admin_id']); // Один конфиг на пару user-admin
            $table->index('user_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_task_sending_configs');
    }
};
