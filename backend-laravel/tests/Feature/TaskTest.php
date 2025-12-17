<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskCategory;
use App\Models\TaskTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $moderator;
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

        $this->moderator = User::factory()->create([
            'domain_id' => $this->domain->id,
            'email' => 'moderator@test.com',
        ]);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        $this->moderator->roles()->attach($moderatorRole);
    }

    protected function getAdminToken(): string
    {
        return $this->admin->createToken('test-token')->plainTextToken;
    }

    protected function getModeratorToken(): string
    {
        return $this->moderator->createToken('test-token')->plainTextToken;
    }

    public function test_admin_can_create_task_template(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->postJson('/api/admin/task-templates', [
                'category_id' => $category->id,
                'title' => 'Test Template',
                'description' => 'Test Description',
                'price' => 100.50,
                'completion_hours' => 5,
                'work_day' => 1,
                'is_primary' => true,
                'is_active' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'title',
                'category_id',
            ]);

        $this->assertDatabaseHas('task_templates', [
            'title' => 'Test Template',
            'domain_id' => $this->domain->id,
        ]);
    }

    public function test_admin_can_list_task_templates(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        TaskTemplate::factory()->count(3)->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson('/api/admin/task-templates');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }

    public function test_moderator_can_start_work_and_get_tasks(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        TaskTemplate::factory()->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
            'is_primary' => true,
            'is_active' => true,
            'work_day' => 1,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getModeratorToken())
            ->postJson('/api/moderator/tasks/start-work');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'tasks',
                'current_work_day',
            ]);
    }

    public function test_moderator_can_list_tasks(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        Task::factory()->count(2)->create([
            'domain_id' => $this->domain->id,
            'assigned_to' => $this->moderator->id,
            'category_id' => $category->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getModeratorToken())
            ->getJson('/api/moderator/tasks');

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }

    public function test_moderator_can_start_task(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        $task = Task::factory()->create([
            'domain_id' => $this->domain->id,
            'assigned_to' => $this->moderator->id,
            'category_id' => $category->id,
            'status' => 'pending',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getModeratorToken())
            ->postJson("/api/moderator/tasks/{$task->id}/start");

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_moderator_can_complete_task(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        $task = Task::factory()->create([
            'domain_id' => $this->domain->id,
            'assigned_to' => $this->moderator->id,
            'category_id' => $category->id,
            'status' => 'in_progress',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getModeratorToken())
            ->postJson("/api/moderator/tasks/{$task->id}/complete");

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'completed',
        ]);
    }
}
