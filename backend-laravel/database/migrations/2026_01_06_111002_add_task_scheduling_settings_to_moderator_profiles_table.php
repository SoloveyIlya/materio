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
        Schema::table('moderator_profiles', function (Blueprint $table) {
            $table->string('task_timezone')->nullable()->after('settings'); // Таймзона для отправки тасков (например, 'UTC+3')
            $table->time('task_start_time')->nullable()->after('task_timezone'); // Начало временного диапазона (например, '12:00')
            $table->time('task_end_time')->nullable()->after('task_start_time'); // Конец временного диапазона (например, '22:00')
            $table->integer('task_min_interval')->nullable()->after('task_end_time'); // Минимальный интервал между тасками в минутах (например, 10)
            $table->integer('task_max_interval')->nullable()->after('task_min_interval'); // Максимальный интервал между тасками в минутах (например, 120)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('moderator_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'task_timezone',
                'task_start_time',
                'task_end_time',
                'task_min_interval',
                'task_max_interval',
            ]);
        });
    }
};
