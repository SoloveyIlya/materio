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
        Schema::table('task_results', function (Blueprint $table) {
            $table->json('tool_data')->nullable()->after('admin_comment'); // Данные по тулзам
            $table->text('additional_info')->nullable()->after('tool_data'); // Дополнительная информация
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_results', function (Blueprint $table) {
            $table->dropColumn(['tool_data', 'additional_info']);
        });
    }
};
