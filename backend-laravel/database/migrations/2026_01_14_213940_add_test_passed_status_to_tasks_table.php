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
        $driver = DB::getDriverName();
        
        if ($driver !== 'sqlite') {
            // MySQL/MariaDB syntax - add 'test_passed' to enum
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM(
                'pending', 
                'in_progress', 
                'completed_by_moderator', 
                'under_admin_review', 
                'approved', 
                'rejected', 
                'sent_for_revision',
                'test_passed',
                'cancelled'
            ) DEFAULT 'pending'");
        }
        // For SQLite, no changes needed - SQLite doesn't enforce enum constraints
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();
        
        if ($driver !== 'sqlite') {
            // MySQL/MariaDB syntax - remove 'test_passed' from enum
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
        // For SQLite, no changes needed
    }
};
