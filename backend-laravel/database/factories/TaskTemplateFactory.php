<?php

namespace Database\Factories;

use App\Models\Domain;
use App\Models\TaskCategory;
use App\Models\TaskTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskTemplateFactory extends Factory
{
    protected $model = TaskTemplate::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'category_id' => TaskCategory::factory(),
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 1000),
            'completion_hours' => fake()->numberBetween(1, 24),
            'guides_links' => [],
            'attached_services' => [],
            'work_day' => null,
            'is_primary' => false,
            'is_active' => true,
        ];
    }
}
