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
        Schema::create('test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('test_id')->constrained('tests')->onDelete('cascade');
            $table->integer('score')->default(0); // Количество правильных ответов
            $table->integer('total_questions')->default(0);
            $table->integer('percentage')->default(0); // Процент правильных ответов
            $table->json('answers')->nullable(); // Сохранение ответов пользователя
            $table->timestamp('completed_at')->nullable();
            $table->boolean('is_passed')->default(false);
            $table->timestamps();
            
            $table->index(['user_id', 'test_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('test_results');
    }
};
