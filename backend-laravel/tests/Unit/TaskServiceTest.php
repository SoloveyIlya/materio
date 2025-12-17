<?php

namespace Tests\Unit;

use App\Models\Domain;
use App\Models\Task;
use App\Models\TaskCategory;
use App\Models\TaskTemplate;
use App\Models\User;
use App\Services\TaskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskServiceTest extends TestCase
{
    use RefreshDatabase;

    protected TaskService $taskService;
    protected $moderator;
    protected $domain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->taskService = new TaskService();
        $this->domain = Domain::factory()->create(['domain' => 'default', 'name' => 'Default Domain']);
        
        $this->moderator = User::factory()->create([
            'domain_id' => $this->domain->id,
            'timezone' => 'UTC',
        ]);
    }

    public function test_get_current_work_day_calculates_correctly(): void
    {
        $this->moderator->update([
            'work_start_date' => now()->subDays(5),
        ]);

        $workDay = $this->moderator->getCurrentWorkDay();

        $this->assertEquals(6, $workDay); // Day 1 is the start day, so 5 days later is day 6
    }

    public function test_generate_primary_tasks_creates_tasks_from_primary_templates(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        
        TaskTemplate::factory()->count(3)->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
            'is_primary' => true,
            'is_active' => true,
            'work_day' => 1,
        ]);

        $tasks = $this->taskService->generatePrimaryTasksForModerator($this->moderator);

        $this->assertCount(3, $tasks);
        $this->assertDatabaseHas('tasks', [
            'assigned_to' => $this->moderator->id,
        ]);
    }

    public function test_assign_tasks_for_work_day_creates_tasks_for_specific_day(): void
    {
        $this->moderator->update([
            'work_start_date' => now()->subDays(2),
        ]);

        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        
        TaskTemplate::factory()->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
            'is_active' => true,
            'work_day' => 3,
        ]);

        $tasks = $this->taskService->assignTasksForWorkDay($this->moderator, 3);

        $this->assertNotEmpty($tasks);
        $this->assertDatabaseHas('tasks', [
            'assigned_to' => $this->moderator->id,
            'work_day' => 3,
        ]);
    }

    public function test_auto_assign_tasks_for_current_day_generates_primary_on_first_day(): void
    {
        $category = TaskCategory::factory()->create(['domain_id' => $this->domain->id]);
        
        TaskTemplate::factory()->count(2)->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
            'is_primary' => true,
            'is_active' => true,
            'work_day' => 1,
        ]);

        $tasks = $this->taskService->autoAssignTasksForCurrentDay($this->moderator);

        $this->assertNotEmpty($tasks);
        $this->assertNotNull($this->moderator->fresh()->work_start_date);
    }
}
