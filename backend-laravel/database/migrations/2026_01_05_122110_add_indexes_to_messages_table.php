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
        Schema::table('messages', function (Blueprint $table) {
            // Индексы для оптимизации запросов
            $table->index(['domain_id', 'type', 'is_deleted']);
            $table->index(['from_user_id', 'to_user_id', 'type']);
            $table->index(['to_user_id', 'is_read', 'type']);
            $table->index(['task_id', 'type']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['domain_id', 'type', 'is_deleted']);
            $table->dropIndex(['from_user_id', 'to_user_id', 'type']);
            $table->dropIndex(['to_user_id', 'is_read', 'type']);
            $table->dropIndex(['task_id', 'type']);
            $table->dropIndex(['created_at']);
        });
    }
};
