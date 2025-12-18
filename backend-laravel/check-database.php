<?php

/**
 * Script to check database structure and all records
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== DATABASE CHECK ===\n";
echo str_repeat('=', 60) . "\n\n";

// Check database connection
$driver = DB::getDriverName();
$database = DB::getDatabaseName();
echo "Database Driver: {$driver}\n";
echo "Database Name: {$database}\n";
echo "\n";

// Get all tables
$tables = [];
if ($driver === 'sqlite') {
    $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    $tables = array_map(function($t) { return $t->name; }, $tables);
} else {
    $tables = DB::select("SHOW TABLES");
    $key = 'Tables_in_' . $database;
    $tables = array_map(function($t) use ($key) { return $t->$key; }, $tables);
}

echo "=== TABLES IN DATABASE ===\n";
echo "Total tables: " . count($tables) . "\n\n";

foreach ($tables as $table) {
    echo "Table: {$table}\n";
    echo str_repeat('-', 60) . "\n";
    
    try {
        $count = DB::table($table)->count();
        echo "  Records: {$count}\n";
        
        if ($count > 0 && $count <= 10) {
            // Show all records for small tables
            $records = DB::table($table)->get();
            foreach ($records as $record) {
                echo "  " . json_encode((array)$record, JSON_UNESCAPED_UNICODE) . "\n";
            }
        } elseif ($count > 10) {
            // Show first 5 records for large tables
            $records = DB::table($table)->limit(5)->get();
            echo "  First 5 records:\n";
            foreach ($records as $record) {
                echo "  " . json_encode((array)$record, JSON_UNESCAPED_UNICODE) . "\n";
            }
            echo "  ... and " . ($count - 5) . " more\n";
        }
    } catch (\Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
}

// Special check for users
echo "=== USERS DETAILED CHECK ===\n";
echo str_repeat('-', 60) . "\n";
try {
    $users = DB::table('users')->get();
    echo "Total users: " . $users->count() . "\n\n";
    
    foreach ($users as $user) {
        echo "User ID: {$user->id}\n";
        echo "  Email: {$user->email}\n";
        echo "  Name: " . ($user->name ?? 'N/A') . "\n";
        echo "  Created: " . ($user->created_at ?? 'N/A') . "\n";
        echo "  Updated: " . ($user->updated_at ?? 'N/A') . "\n";
        
        // Check roles
        $roles = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->select('roles.name', 'roles.display_name')
            ->get();
        
        if ($roles->count() > 0) {
            echo "  Roles: ";
            foreach ($roles as $role) {
                echo "{$role->name} ({$role->display_name}) ";
            }
            echo "\n";
        } else {
            echo "  Roles: (none)\n";
        }
        echo "\n";
    }
} catch (\Exception $e) {
    echo "Error checking users: " . $e->getMessage() . "\n";
}

// Check migrations
echo "=== MIGRATIONS STATUS ===\n";
echo str_repeat('-', 60) . "\n";
try {
    $migrations = DB::table('migrations')->orderBy('id')->get();
    echo "Total migrations run: " . $migrations->count() . "\n";
    foreach ($migrations as $migration) {
        echo "  - {$migration->migration} (batch: {$migration->batch})\n";
    }
} catch (\Exception $e) {
    echo "Error checking migrations: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat('=', 60) . "\n";
