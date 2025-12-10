<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderator_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->json('settings')->nullable(); // Дополнительные настройки модератора
            $table->integer('minimum_minutes_between_tasks')->default(5); // Минимум минут между назначениями тасков
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderator_profiles');
    }
};

