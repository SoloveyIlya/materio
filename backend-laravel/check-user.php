<?php

/**
 * Script to check if a user exists in the database
 * Usage: php check-user.php email@example.com
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$email = $argv[1] ?? 'infso@smart-eu-solution.com';
$password = $argv[2] ?? '12345678';

echo "Checking user: {$email}\n";
echo str_repeat('=', 50) . "\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User NOT FOUND in database\n";
    echo "\nAll users in database:\n";
    $allUsers = User::all(['id', 'name', 'email', 'created_at']);
    if ($allUsers->isEmpty()) {
        echo "  (No users found)\n";
    } else {
        foreach ($allUsers as $u) {
            echo "  - ID: {$u->id}, Name: {$u->name}, Email: {$u->email}, Created: {$u->created_at}\n";
        }
    }
    exit(1);
}

echo "✅ User FOUND!\n";
echo "  ID: {$user->id}\n";
echo "  Name: {$user->name}\n";
echo "  Email: {$user->email}\n";
echo "  Created: {$user->created_at}\n";

// Check roles
$roles = $user->roles;
if ($roles->isNotEmpty()) {
    echo "  Roles: " . $roles->pluck('name')->join(', ') . "\n";
} else {
    echo "  Roles: (none)\n";
}

// Check password
echo "\nTesting password...\n";
if (Hash::check($password, $user->password)) {
    echo "✅ Password is CORRECT\n";
} else {
    echo "❌ Password is INCORRECT\n";
    echo "  (Stored hash: " . substr($user->password, 0, 20) . "...)\n";
}

echo "\n" . str_repeat('=', 50) . "\n";
