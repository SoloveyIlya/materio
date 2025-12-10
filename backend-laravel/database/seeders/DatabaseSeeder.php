<?php

namespace Database\Seeders;

use App\Models\Domain;
use App\Models\Role;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Создаем роли
        Role::firstOrCreate(['name' => 'admin'], [
            'display_name' => 'Administrator',
            'description' => 'Full system access',
        ]);

        Role::firstOrCreate(['name' => 'moderator'], [
            'display_name' => 'Moderator',
            'description' => 'Moderator access',
        ]);

        // Создаем домен по умолчанию
        Domain::firstOrCreate(['domain' => 'default'], [
            'name' => 'Default Domain',
            'settings' => [
                'branding' => [
                    'logo' => null,
                    'primary_color' => '#000000',
                ],
            ],
            'is_active' => true,
        ]);

        // Создаем категории тасков по умолчанию для домена
        $domain = Domain::where('domain', 'default')->first();
        
        if ($domain) {
            \App\Models\TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'test',
            ], [
                'name' => 'Test',
                'description' => 'Testing tasks',
            ]);

            \App\Models\TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'document-check',
            ], [
                'name' => 'Document check',
                'description' => 'Document verification tasks',
            ]);

            \App\Models\TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'comprehensive-verification',
            ], [
                'name' => 'Comprehensive verification',
                'description' => 'Full verification tasks',
            ]);
        }
    }
}
