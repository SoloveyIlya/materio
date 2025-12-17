<?php

namespace Database\Factories;

use App\Models\Domain;
use App\Models\Task;
use App\Models\TaskCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'category_id' => TaskCategory::factory(),
            'assigned_to' => User::factory(),
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 1000),
            'completion_hours' => fake()->numberBetween(1, 24),
            'guides_links' => [],
            'attached_services' => [],
            'work_day' => fake()->numberBetween(1, 10),
            'status' => 'pending',
            'assigned_at' => now(),
        ];
    }
}
