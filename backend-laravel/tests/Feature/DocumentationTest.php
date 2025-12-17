<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\DocumentationCategory;
use App\Models\DocumentationPage;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentationTest extends TestCase
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

    public function test_admin_can_create_documentation_category(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->postJson('/api/admin/documentation-categories', [
                'name' => 'Test Category',
                'slug' => 'test-category',
                'description' => 'Test Description',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'name',
                'slug',
            ]);

        $this->assertDatabaseHas('documentation_categories', [
            'name' => 'Test Category',
            'domain_id' => $this->domain->id,
        ]);
    }

    public function test_admin_can_create_documentation_page(): void
    {
        $category = DocumentationCategory::factory()->create(['domain_id' => $this->domain->id]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->postJson('/api/admin/documentation-pages', [
                'category_id' => $category->id,
                'title' => 'Test Page',
                'content' => 'Test Content',
                'is_published' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'title',
                'content',
            ]);

        $this->assertDatabaseHas('documentation_pages', [
            'title' => 'Test Page',
            'domain_id' => $this->domain->id,
        ]);
    }

    public function test_admin_can_list_documentation_pages(): void
    {
        $category = DocumentationCategory::factory()->create(['domain_id' => $this->domain->id]);
        DocumentationPage::factory()->count(3)->create([
            'domain_id' => $this->domain->id,
            'category_id' => $category->id,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAdminToken())
            ->getJson('/api/admin/documentation-pages');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }
}
