<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Domain;
use App\Models\Role;
use App\Models\ModeratorProfile;
use App\Models\AdminProfile;
use Illuminate\Console\Command;

class CreateUser extends Command
{
    protected $signature = 'user:create {email} {password} {--name=} {--role=moderator} {--domain=default}';
    protected $description = 'Create a new user with email and password';

    public function handle()
    {
        $email = $this->argument('email');
        $password = $this->argument('password');
        $name = $this->option('name') ?: explode('@', $email)[0];
        $roleName = $this->option('role');
        $domainName = $this->option('domain');

        // Проверяем, существует ли пользователь
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            $this->warn("User with email {$email} already exists!");
            $this->info("User ID: {$existingUser->id}");
            $this->info("User Name: {$existingUser->name}");
            
            if ($this->confirm('Do you want to reset the password?', true)) {
                $existingUser->password = $password;
                $existingUser->registration_password = $password;
                $existingUser->save();
                $this->info("Password has been reset to: {$password}");
            }
            return 0;
        }

        // Получаем или создаем домен
        $domain = Domain::where('domain', $domainName)->first();
        if (!$domain) {
            $domain = Domain::create([
                'domain' => $domainName,
                'name' => ucfirst($domainName) . ' Domain',
                'settings' => [],
                'is_active' => true,
            ]);
            $this->info("Created domain: {$domainName}");
        }

        // Создаем роли, если их нет
        $role = Role::firstOrCreate(
            ['name' => $roleName],
            [
                'display_name' => $roleName === 'admin' ? 'Administrator' : 'Moderator',
                'description' => $roleName === 'admin' ? 'Full system access' : 'Moderator access',
            ]
        );

        // Создаем другую роль для полноты
        if ($roleName === 'moderator') {
            Role::firstOrCreate(
                ['name' => 'admin'],
                [
                    'display_name' => 'Administrator',
                    'description' => 'Full system access',
                ]
            );
        } else {
            Role::firstOrCreate(
                ['name' => 'moderator'],
                [
                    'display_name' => 'Moderator',
                    'description' => 'Moderator access',
                ]
            );
        }

        // Создаем пользователя с явным хешированием пароля
        $user = User::create([
            'domain_id' => $domain->id,
            'name' => $name,
            'email' => $email,
            'password' => \Illuminate\Support\Facades\Hash::make($password), // Явно хешируем пароль
            'registration_password' => $password,
            'timezone' => 'UTC',
        ]);

        // Присваиваем роль
        $user->roles()->attach($role->id);

        // Создаем профиль в зависимости от роли
        if ($roleName === 'moderator') {
            ModeratorProfile::firstOrCreate(
                ['user_id' => $user->id],
                ['minimum_minutes_between_tasks' => 5]
            );
        } elseif ($roleName === 'admin') {
            AdminProfile::firstOrCreate(['user_id' => $user->id]);
        }

        $this->info("✅ User created successfully!");
        $this->info("User ID: {$user->id}");
        $this->info("User Name: {$user->name}");
        $this->info("Email: {$user->email}");
        $this->info("Role: {$roleName}");
        $this->info("Password: {$password}");

        return 0;
    }
}

