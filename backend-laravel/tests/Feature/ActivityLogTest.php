<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Domain;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
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

    public function test_admin_can_view_activity_logs(): void
    {
        ActivityLog::factory()->count(5)->create([
            'domain_id' => $this->domain->id,
            'user_id' => $this->admin->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson('/api/admin/activity-logs');

        $response->assertStatus(200);
    }

    public function test_admin_can_filter_activity_logs_by_user(): void
    {
        $user = User::factory()->create(['domain_id' => $this->domain->id]);
        
        ActivityLog::factory()->count(3)->create([
            'domain_id' => $this->domain->id,
            'user_id' => $user->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson("/api/admin/activity-logs?user_id={$user->id}");

        $response->assertStatus(200);
    }

    public function test_activity_log_is_created_when_user_makes_request(): void
    {
        $token = $this->getAdminToken();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/admin/users');

        $this->assertDatabaseHas('activity_logs', [
            'domain_id' => $this->domain->id,
            'user_id' => $this->admin->id,
        ]);
    }
}
