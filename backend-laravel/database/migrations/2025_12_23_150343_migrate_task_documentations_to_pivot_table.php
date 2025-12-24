<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Переносим существующие данные из documentation_id в промежуточную таблицу
        $tasks = DB::table('tasks')
            ->whereNotNull('documentation_id')
            ->select('id', 'documentation_id', 'created_at', 'updated_at')
            ->get();

        foreach ($tasks as $task) {
            DB::table('task_documentation')->insertOrIgnore([
                'task_id' => $task->id,
                'documentation_id' => $task->documentation_id,
                'created_at' => $task->created_at ?? now(),
                'updated_at' => $task->updated_at ?? now(),
            ]);
        }

        // Удаляем старое поле после переноса данных
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['documentation_id']);
            $table->dropColumn('documentation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Восстанавливаем поле
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('documentation_id')->nullable()->constrained('documentation_pages')->onDelete('set null');
        });

        // Восстанавливаем данные из промежуточной таблицы (берем первые значения)
        $tasksWithDocumentations = DB::table('task_documentation')
            ->select('task_id', 'documentation_id')
            ->groupBy('task_id')
            ->get();
        
        foreach ($tasksWithDocumentations as $item) {
            DB::table('tasks')
                ->where('id', $item->task_id)
                ->update(['documentation_id' => $item->documentation_id]);
        }
    }
};
