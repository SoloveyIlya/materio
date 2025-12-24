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
        // Переносим существующие данные из category_id в промежуточную таблицу
        $tasks = DB::table('tasks')
            ->whereNotNull('category_id')
            ->select('id', 'category_id', 'created_at', 'updated_at')
            ->get();

        foreach ($tasks as $task) {
            DB::table('task_category')->insertOrIgnore([
                'task_id' => $task->id,
                'category_id' => $task->category_id,
                'created_at' => $task->created_at ?? now(),
                'updated_at' => $task->updated_at ?? now(),
            ]);
        }

        // Переносим существующие данные из tool_id в промежуточную таблицу
        $tasksWithTools = DB::table('tasks')
            ->whereNotNull('tool_id')
            ->select('id', 'tool_id', 'created_at', 'updated_at')
            ->get();

        foreach ($tasksWithTools as $task) {
            DB::table('task_tool')->insertOrIgnore([
                'task_id' => $task->id,
                'tool_id' => $task->tool_id,
                'created_at' => $task->created_at ?? now(),
                'updated_at' => $task->updated_at ?? now(),
            ]);
        }

        // Удаляем старые поля после переноса данных
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['tool_id']);
            $table->dropColumn('tool_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Восстанавливаем поля
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->constrained('task_categories')->onDelete('cascade');
            $table->foreignId('tool_id')->nullable()->constrained('tools')->onDelete('set null');
        });

        // Восстанавливаем данные из промежуточных таблиц (берем первые значения)
        // Для категорий - берем первую категорию для каждого task
        $tasksWithCategories = DB::table('task_category')
            ->select('task_id', 'category_id')
            ->groupBy('task_id')
            ->get();
        
        foreach ($tasksWithCategories as $item) {
            DB::table('tasks')
                ->where('id', $item->task_id)
                ->update(['category_id' => $item->category_id]);
        }

        // Для тулзов - берем первый тулз для каждого task
        $tasksWithTools = DB::table('task_tool')
            ->select('task_id', 'tool_id')
            ->groupBy('task_id')
            ->get();
        
        foreach ($tasksWithTools as $item) {
            DB::table('tasks')
                ->where('id', $item->task_id)
                ->update(['tool_id' => $item->tool_id]);
        }
    }
};
