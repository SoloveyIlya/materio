<?php

namespace App\Console\Commands;

use App\Models\Domain;
use App\Models\ModeratorProfile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateModerator extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'create:moderator {email} {password} {--name=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a moderator user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $password = $this->argument('password');
        $name = $this->option('name') ?: 'Moderator User';

        $this->info("Creating moderator: {$email}");

        // Check if user already exists
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            $this->error("❌ User already exists!");
            $this->line("  ID: {$existingUser->id}");
            $this->line("  Name: {$existingUser->name}");
            $this->line("  Email: {$existingUser->email}");
            return 1;
        }

        // Get or create default domain
        $domain = Domain::where('domain', 'default')->first();
        if (!$domain) {
            $this->info("Creating default domain...");
            $domain = Domain::create([
                'domain' => 'default',
                'name' => 'Default Domain',
                'settings' => [],
                'is_active' => true,
            ]);
        }

        // Create roles if they don't exist
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
        $user->roles()->attach($moderatorRole->id);

        // Create moderator profile
        ModeratorProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['minimum_minutes_between_tasks' => 5]
        );

        $this->info("✅ User created successfully!");
        $this->line("  ID: {$user->id}");
        $this->line("  Name: {$user->name}");
        $this->line("  Email: {$user->email}");
        $this->line("  Role: moderator");

        return 0;
    }
}
