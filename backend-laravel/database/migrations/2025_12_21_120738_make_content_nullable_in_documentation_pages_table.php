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
        // For SQLite, we need to recreate the table to change column constraints
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
            // Create new table with content as nullable and all existing columns
            DB::statement('
                CREATE TABLE documentation_pages_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain_id INTEGER NOT NULL,
                    category_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL,
                    content TEXT,
                    "order" INTEGER DEFAULT 0,
                    is_published BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    content_blocks TEXT,
                    images TEXT,
                    videos TEXT,
                    related_task_categories TEXT,
                    related_tasks TEXT,
                    tools TEXT,
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES documentation_categories(id) ON DELETE CASCADE
                )
            ');
            
            // Copy data from old table (handle missing columns gracefully)
            DB::statement('
                INSERT INTO documentation_pages_new 
                (id, domain_id, category_id, title, slug, content, "order", is_published, created_at, updated_at, 
                 content_blocks, images, videos, related_task_categories, related_tasks, tools)
                SELECT 
                    id, domain_id, category_id, title, slug, content, "order", is_published, created_at, updated_at,
                    content_blocks, images, videos, related_task_categories, related_tasks, tools
                FROM documentation_pages
            ');
            
            // Drop old table
            DB::statement('DROP TABLE documentation_pages');
            
            // Rename new table
            DB::statement('ALTER TABLE documentation_pages_new RENAME TO documentation_pages');
            
            // Recreate indexes
            DB::statement('CREATE UNIQUE INDEX documentation_pages_slug_unique ON documentation_pages(slug)');
        } else {
            // For other databases (MySQL, PostgreSQL), use standard ALTER TABLE
            Schema::table('documentation_pages', function (Blueprint $table) {
                $table->text('content')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // Recreate table with NOT NULL constraint
            DB::statement('
                CREATE TABLE documentation_pages_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain_id INTEGER NOT NULL,
                    category_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    "order" INTEGER DEFAULT 0,
                    is_published BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    content_blocks TEXT,
                    images TEXT,
                    videos TEXT,
                    related_task_categories TEXT,
                    related_tasks TEXT,
                    tools TEXT,
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES documentation_categories(id) ON DELETE CASCADE
                )
            ');
            
            // Copy data (set NULL content to empty string)
            DB::statement('
                INSERT INTO documentation_pages_new 
                (id, domain_id, category_id, title, slug, content, "order", is_published, created_at, updated_at,
                 content_blocks, images, videos, related_task_categories, related_tasks, tools)
                SELECT 
                    id, domain_id, category_id, title, slug, COALESCE(content, ""), "order", is_published, created_at, updated_at,
                    content_blocks, images, videos, related_task_categories, related_tasks, tools
                FROM documentation_pages
            ');
            
            DB::statement('DROP TABLE documentation_pages');
            DB::statement('ALTER TABLE documentation_pages_new RENAME TO documentation_pages');
            DB::statement('CREATE UNIQUE INDEX documentation_pages_slug_unique ON documentation_pages(slug)');
        } else {
            Schema::table('documentation_pages', function (Blueprint $table) {
                $table->text('content')->nullable(false)->change();
            });
        }
    }
};
