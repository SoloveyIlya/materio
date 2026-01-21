<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $domain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->domain = Domain::factory()->create(['domain' => 'default', 'name' => 'Default Domain']);
        
        $this->admin = User::factory()->create([
            'domain_id' => $this->domain->id,
            'email' => 'admin@test.com',
        ]);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $this->admin->roles()->attach($adminRole);
    }

    protected function getAdminToken(): string
    {
        return $this->admin->createToken('test-token')->plainTextToken;
    }

    public function test_admin_can_list_users(): void
    {
        User::factory()->count(5)->create(['domain_id' => $this->domain->id]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson('/api/admin/users');

        $response->assertStatus(200)
            ->assertJsonCount(6); // 5 + admin
    }

    public function test_admin_can_view_user_details(): void
    {
        $user = User::factory()->create(['domain_id' => $this->domain->id]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson("/api/admin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'email',
                    'stats',
                ],
            ]);
    }

    public function test_admin_can_filter_users_by_role(): void
    {
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        User::factory()->count(3)->create(['domain_id' => $this->domain->id])
            ->each(function ($user) use ($moderatorRole) {
                $user->roles()->attach($moderatorRole);
            });

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson('/api/admin/users?role=moderator');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }

    public function test_admin_can_send_tasks_to_moderator(): void
    {
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        $moderator = User::factory()->create(['domain_id' => $this->domain->id]);
        $moderator->roles()->attach($moderatorRole);
        
        // Set work_start_date so moderator can receive tasks
        $moderator->update(['work_start_date' => now()->toDateString()]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->postJson("/api/admin/users/{$moderator->id}/send-tasks");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'scheduled_count',
                'work_day',
            ]);
    }
}
