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
        
        // Update existing 'completed' status to 'completed_by_moderator' for all drivers
        DB::table('tasks')
            ->where('status', 'completed')
            ->update(['status' => 'completed_by_moderator']);
        
        if ($driver !== 'sqlite') {
            // MySQL/MariaDB syntax - modify enum constraint
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
        // For SQLite, we just update the data - SQLite doesn't enforce enum constraints
        // The application layer will validate the enum values
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        
        // Map new statuses back to old ones for all drivers
        DB::table('tasks')
            ->whereIn('status', ['completed_by_moderator', 'under_admin_review', 'approved', 'rejected', 'sent_for_revision'])
            ->update(['status' => 'completed']);
        
        if ($driver !== 'sqlite') {
            // MySQL/MariaDB syntax - restore old enum constraint
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM(
                'pending', 
                'in_progress', 
                'completed', 
                'cancelled'
            ) DEFAULT 'pending'");
        }
        // For SQLite, we just update the data
    }
};
