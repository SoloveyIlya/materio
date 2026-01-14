<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Проверяет и удаляет любые ограничения уникальности на document_image_name,
     * чтобы разрешить использование одного и того же изображения в разных задачах
     */
    public function up(): void
    {
        // Проверяем, есть ли уникальный индекс на document_image_name
        $indexes = DB::select("SHOW INDEXES FROM tasks WHERE Column_name = 'document_image_name' AND Non_unique = 0");
        
        foreach ($indexes as $index) {
            // Удаляем уникальный индекс, если он существует
            try {
                DB::statement("ALTER TABLE tasks DROP INDEX `{$index->Key_name}`");
                \Log::info("Removed unique constraint {$index->Key_name} from document_image_name column");
            } catch (\Exception $e) {
                \Log::warning("Could not remove unique constraint {$index->Key_name}: " . $e->getMessage());
            }
        }
        
        // Также проверяем и удаляем любые уникальные ограничения на document_image (путь к файлу)
        $imageIndexes = DB::select("SHOW INDEXES FROM tasks WHERE Column_name = 'document_image' AND Non_unique = 0");
        
        foreach ($imageIndexes as $index) {
            // Удаляем уникальный индекс, если он существует
            try {
                DB::statement("ALTER TABLE tasks DROP INDEX `{$index->Key_name}`");
                \Log::info("Removed unique constraint {$index->Key_name} from document_image column");
            } catch (\Exception $e) {
                \Log::warning("Could not remove unique constraint {$index->Key_name}: " . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Не восстанавливаем ограничения уникальности, так как они не должны существовать
    }
};
