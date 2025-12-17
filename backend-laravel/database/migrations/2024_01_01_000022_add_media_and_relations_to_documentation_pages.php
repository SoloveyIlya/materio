<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentation_pages', function (Blueprint $table) {
            // Добавляем поля для медиа
            $table->json('images')->nullable()->after('content'); // Массив путей к изображениям
            $table->json('videos')->nullable()->after('images'); // Массив объектов видео (локальные или embed)
            
            // Добавляем связи с задачами
            $table->json('related_task_categories')->nullable()->after('videos'); // Массив ID категорий задач
            $table->json('related_tasks')->nullable()->after('related_task_categories'); // Массив ID задач
        });
    }

    public function down(): void
    {
        Schema::table('documentation_pages', function (Blueprint $table) {
            $table->dropColumn(['images', 'videos', 'related_task_categories', 'related_tasks']);
        });
    }
};
