<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('domain_id')->constrained('domains')->onDelete('cascade');
            $table->foreignId('category_id')->constrained('task_categories')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('completion_hours'); // Срок выполнения в часах
            $table->json('guides_links')->nullable(); // Гайды/ссылки
            $table->json('attached_services')->nullable(); // Привязанные сервисы
            $table->integer('work_day')->nullable(); // День работы (1-10 для первичных тасков)
            $table->boolean('is_primary')->default(false); // Первичные таски (первые 10)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_templates');
    }
};

