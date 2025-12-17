<?php

namespace Database\Factories;

use App\Models\Domain;
use App\Models\DocumentationCategory;
use App\Models\DocumentationPage;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentationPageFactory extends Factory
{
    protected $model = DocumentationPage::class;

    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'category_id' => DocumentationCategory::factory(),
            'title' => fake()->sentence(),
            'slug' => fake()->unique()->slug(),
            'content' => fake()->paragraphs(3, true),
            'images' => [],
            'videos' => [],
            'related_task_categories' => [],
            'related_tasks' => [],
            'order' => 0,
            'is_published' => true,
        ];
    }
}
