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
        Schema::table('documentation_pages', function (Blueprint $table) {
            // Добавляем поле для структурированного контента с позиционированием
            $table->json('content_blocks')->nullable()->after('content');
            // Добавляем поле для связи с инструментами
            $table->json('tools')->nullable()->after('videos');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documentation_pages', function (Blueprint $table) {
            $table->dropColumn(['content_blocks', 'tools']);
        });
    }
};
