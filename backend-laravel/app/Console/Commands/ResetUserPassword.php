<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetUserPassword extends Command
{
    protected $signature = 'user:reset-password {email} {password?}';
    protected $description = 'Reset password for a user by email';

    public function handle()
    {
        $email = $this->argument('email');
        $password = $this->argument('password') ?? '12345678';

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found!");
            return 1;
        }

        // Явно хешируем пароль, так как cast может не работать в некоторых случаях
        $user->password = Hash::make($password);
        $user->registration_password = $password;
        $user->save();

        $this->info("Password for user {$email} has been reset to: {$password}");
        $this->info("User ID: {$user->id}");
        $this->info("User Name: {$user->name}");

        return 0;
    }
}

