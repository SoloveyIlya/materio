<?php

namespace Database\Factories;

use App\Models\ActivityLog;
use App\Models\Domain;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'user_id' => User::factory(),
            'action' => fake()->randomElement(['view', 'create', 'update', 'delete']),
            'event_type' => fake()->randomElement(['page_view', 'action']),
            'route' => fake()->url(),
            'method' => fake()->randomElement(['GET', 'POST', 'PUT', 'DELETE']),
            'model_type' => null,
            'model_id' => null,
            'data' => [],
            'description' => fake()->sentence(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
        ];
    }
}
