<?php

namespace Database\Factories;

use App\Models\Domain;
use App\Models\DocumentationCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentationCategoryFactory extends Factory
{
    protected $model = DocumentationCategory::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'parent_id' => null,
            'name' => fake()->words(2, true),
            'slug' => fake()->unique()->slug(),
            'description' => fake()->sentence(),
            'order' => 0,
        ];
    }
}
