<?php

namespace Database\Factories;

use App\Models\Domain;
use Illuminate\Database\Eloquent\Factories\Factory;

class DomainFactory extends Factory
{
    protected $model = Domain::class;

    public function definition(): array
    {
        return [
            'domain' => fake()->unique()->domainName(),
            'name' => fake()->company(),
            'settings' => [],
            'is_active' => true,
        ];
    }
}
