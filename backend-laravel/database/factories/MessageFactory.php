<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\User;
use App\Models\Domain;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'domain_id' => Domain::factory(),
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'type' => 'message',
            'body' => $this->faker->text(),
            'is_read' => false,
            'is_edited' => false,
            'is_deleted' => false,
        ];
    }
}
