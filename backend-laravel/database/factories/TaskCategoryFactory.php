<?php

namespace Database\Factories;

use App\Models\Domain;
use App\Models\TaskCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskCategoryFactory extends Factory
{
    protected $model = TaskCategory::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'name' => fake()->words(2, true),
            'slug' => fake()->slug(),
            'description' => fake()->sentence(),
        ];
    }
}
