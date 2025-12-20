<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
            // Disable foreign key checks temporarily
            DB::statement('PRAGMA foreign_keys = OFF');
            
            // Drop tasks_new if it exists (from previous failed migration)
            DB::statement('DROP TABLE IF EXISTS tasks_new');
            
            // Create a new table with string status
            DB::statement('
                CREATE TABLE tasks_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain_id INTEGER NOT NULL,
                    template_id INTEGER,
                    category_id INTEGER NOT NULL,
                    assigned_to INTEGER,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) DEFAULT 0,
                    completion_hours INTEGER NOT NULL,
                    status VARCHAR(255) DEFAULT "pending",
                    assigned_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    due_at TIMESTAMP,
                    guides_links TEXT,
                    attached_services TEXT,
                    work_day INTEGER,
                    is_main_task BOOLEAN DEFAULT 0,
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    country VARCHAR(255),
                    address VARCHAR(255),
                    phone_number VARCHAR(255),
                    email VARCHAR(255),
                    date_of_birth DATE,
                    id_type VARCHAR(255),
                    id_number VARCHAR(255),
                    document_image VARCHAR(255),
                    selfie_image VARCHAR(255),
                    comment TEXT,
                    documentation_id INTEGER,
                    tool_id INTEGER,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
                    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
                    FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (documentation_id) REFERENCES documentation_pages(id) ON DELETE SET NULL,
                    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE SET NULL
                )
            ');
            
            // Copy data from old table to new table
            DB::statement('
                INSERT INTO tasks_new 
                SELECT * FROM tasks
            ');
            
            // Drop old table
            DB::statement('DROP TABLE tasks');
            
            // Rename new table
            DB::statement('ALTER TABLE tasks_new RENAME TO tasks');
            
            // Re-enable foreign key checks
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            // For MySQL/MariaDB, modify enum to include all statuses
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM(
                'pending', 
                'in_progress', 
                'completed_by_moderator', 
                'under_admin_review', 
                'approved', 
                'rejected', 
                'sent_for_revision',
                'cancelled'
            ) DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            // Recreate table with enum (though SQLite will treat it as string)
            DB::statement('
                CREATE TABLE tasks_old (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain_id INTEGER NOT NULL,
                    template_id INTEGER,
                    category_id INTEGER NOT NULL,
                    assigned_to INTEGER,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) DEFAULT 0,
                    completion_hours INTEGER NOT NULL,
                    status VARCHAR(255) DEFAULT "pending",
                    assigned_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    due_at TIMESTAMP,
                    guides_links TEXT,
                    attached_services TEXT,
                    work_day INTEGER,
                    is_main_task BOOLEAN DEFAULT 0,
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    country VARCHAR(255),
                    address VARCHAR(255),
                    phone_number VARCHAR(255),
                    email VARCHAR(255),
                    date_of_birth DATE,
                    id_type VARCHAR(255),
                    id_number VARCHAR(255),
                    document_image VARCHAR(255),
                    selfie_image VARCHAR(255),
                    comment TEXT,
                    documentation_id INTEGER,
                    tool_id INTEGER,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
                    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
                    FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (documentation_id) REFERENCES documentation_pages(id) ON DELETE SET NULL,
                    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE SET NULL
                )
            ');
            
            DB::statement('INSERT INTO tasks_old SELECT * FROM tasks');
            DB::statement('DROP TABLE tasks');
            DB::statement('ALTER TABLE tasks_old RENAME TO tasks');
        } else {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM(
                'pending', 
                'in_progress', 
                'completed', 
                'cancelled'
            ) DEFAULT 'pending'");
        }
    }
};

