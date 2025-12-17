<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create default domain
        Domain::factory()->create(['domain' => 'default', 'name' => 'Default Domain']);
    }

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'moderator',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                ],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
    }

    public function test_user_can_login(): void
    {
        $domain = Domain::first();
        $user = User::factory()->create([
            'domain_id' => $domain->id,
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $role = Role::firstOrCreate(['name' => 'moderator']);
        $user->roles()->attach($role);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'email',
                ],
                'token',
            ]);
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Неверный email или пароль',
            ]);
    }

    public function test_authenticated_user_can_get_user_info(): void
    {
        $domain = Domain::first();
        $user = User::factory()->create(['domain_id' => $domain->id]);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->roles()->attach($role);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/user');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'email',
                'roles',
            ]);
    }

    public function test_user_can_logout(): void
    {
        $domain = Domain::first();
        $user = User::factory()->create(['domain_id' => $domain->id]);
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $response->assertStatus(200);
    }
}
