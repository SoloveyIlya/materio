<?php

/**
 * Script to create a user in the database
 * Usage: php create-user.php email@example.com password "User Name" [role]
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Domain;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

$email = $argv[1] ?? 'infso@smart-eu-solution.com';
$password = $argv[2] ?? '12345678';
$name = $argv[3] ?? 'Admin User';
$roleName = $argv[4] ?? 'admin';

echo "Creating user: {$email}\n";
echo str_repeat('=', 50) . "\n";

// Check if user already exists
$existingUser = User::where('email', $email)->first();
if ($existingUser) {
    echo "❌ User already exists!\n";
    echo "  ID: {$existingUser->id}\n";
    echo "  Name: {$existingUser->name}\n";
    echo "  Email: {$existingUser->email}\n";
    exit(1);
}

// Get or create default domain
$domain = Domain::where('domain', 'default')->first();
if (!$domain) {
    echo "Creating default domain...\n";
    $domain = Domain::create([
        'domain' => 'default',
        'name' => 'Default Domain',
        'settings' => [],
        'is_active' => true,
    ]);
}

// Create roles if they don't exist
$adminRole = Role::firstOrCreate(
    ['name' => 'admin'],
    [
        'display_name' => 'Administrator',
        'description' => 'Full system access',
    ]
);

$moderatorRole = Role::firstOrCreate(
    ['name' => 'moderator'],
    [
        'display_name' => 'Moderator',
        'description' => 'Moderator access',
    ]
);

// Create user
$user = User::create([
    'domain_id' => $domain->id,
    'name' => $name,
    'email' => $email,
    'password' => Hash::make($password),
    'registration_password' => $password,
    'timezone' => 'UTC',
]);

// Assign role
$role = Role::where('name', $roleName)->first();
if (!$role) {
    echo "❌ Role '{$roleName}' not found. Using 'admin' instead.\n";
    $role = $adminRole;
}

$user->roles()->attach($role->id);

// Create profile based on role
if ($roleName === 'moderator') {
    \App\Models\ModeratorProfile::firstOrCreate(
        ['user_id' => $user->id],
        ['minimum_minutes_between_tasks' => 5]
    );
} elseif ($roleName === 'admin') {
    \App\Models\AdminProfile::firstOrCreate(['user_id' => $user->id]);
}

echo "✅ User created successfully!\n";
echo "  ID: {$user->id}\n";
echo "  Name: {$user->name}\n";
echo "  Email: {$user->email}\n";
echo "  Role: {$role->name}\n";
echo "\n" . str_repeat('=', 50) . "\n";
