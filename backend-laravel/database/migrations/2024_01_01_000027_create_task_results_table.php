<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('moderator_id')->constrained('users')->onDelete('cascade');
            $table->text('answers')->nullable(); // JSON с ответами
            $table->json('screenshots')->nullable(); // Массив путей к скриншотам
            $table->json('attachments')->nullable(); // Массив путей к вложениям
            $table->text('moderator_comment')->nullable(); // Комментарий модератора
            $table->text('admin_comment')->nullable(); // Комментарий админа при модерации
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_results');
    }
};
