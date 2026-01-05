<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use App\Models\Domain;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Здесь можно добавить настройки для тестов
    }

    public function test_admin_can_send_message_to_moderator(): void
    {
        $domain = Domain::factory()->create();
        $admin = User::factory()->create(['domain_id' => $domain->id]);
        $moderator = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin->roles()->attach($adminRole);
        $moderator->roles()->attach($moderatorRole);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/messages', [
                'to_user_id' => $moderator->id,
                'type' => 'message',
                'body' => 'Test message',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'from_user_id' => $admin->id,
            'to_user_id' => $moderator->id,
            'type' => 'message',
            'body' => 'Test message',
        ]);
    }

    public function test_moderator_can_send_message_to_admin(): void
    {
        $domain = Domain::factory()->create();
        $admin = User::factory()->create(['domain_id' => $domain->id]);
        $moderator = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin->roles()->attach($adminRole);
        $moderator->roles()->attach($moderatorRole);

        $response = $this->actingAs($moderator, 'sanctum')
            ->postJson('/api/messages', [
                'to_user_id' => $admin->id,
                'type' => 'message',
                'body' => 'Test message from moderator',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'from_user_id' => $moderator->id,
            'to_user_id' => $admin->id,
            'type' => 'message',
            'body' => 'Test message from moderator',
        ]);
    }

    public function test_admin_can_edit_message(): void
    {
        $domain = Domain::factory()->create();
        $admin = User::factory()->create(['domain_id' => $domain->id]);
        $moderator = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin->roles()->attach($adminRole);
        $moderator->roles()->attach($moderatorRole);

        $message = Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $admin->id,
            'to_user_id' => $moderator->id,
            'type' => 'message',
            'body' => 'Original message',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/messages/{$message->id}", [
                'body' => 'Edited message',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Edited message',
            'is_edited' => true,
        ]);
    }

    public function test_admin_can_delete_message(): void
    {
        $domain = Domain::factory()->create();
        $admin = User::factory()->create(['domain_id' => $domain->id]);
        $moderator = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin->roles()->attach($adminRole);
        $moderator->roles()->attach($moderatorRole);

        $message = Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $admin->id,
            'to_user_id' => $moderator->id,
            'type' => 'message',
            'body' => 'Message to delete',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}");

        $response->assertStatus(200);
        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'is_deleted' => true,
        ]);
    }

    public function test_moderator_cannot_edit_message(): void
    {
        $domain = Domain::factory()->create();
        $admin = User::factory()->create(['domain_id' => $domain->id]);
        $moderator = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin->roles()->attach($adminRole);
        $moderator->roles()->attach($moderatorRole);

        $message = Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $moderator->id,
            'to_user_id' => $admin->id,
            'type' => 'message',
            'body' => 'Original message',
        ]);

        $response = $this->actingAs($moderator, 'sanctum')
            ->putJson("/api/messages/{$message->id}", [
                'body' => 'Edited message',
            ]);

        $response->assertStatus(403);
    }

    public function test_messages_are_grouped_by_admin_tabs(): void
    {
        $domain = Domain::factory()->create();
        $admin1 = User::factory()->create(['domain_id' => $domain->id]);
        $admin2 = User::factory()->create(['domain_id' => $domain->id]);
        $moderator1 = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin1->id]);
        $moderator2 = User::factory()->create(['domain_id' => $domain->id, 'administrator_id' => $admin2->id]);
        
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $moderatorRole = Role::firstOrCreate(['name' => 'moderator']);
        
        $admin1->roles()->attach($adminRole);
        $admin2->roles()->attach($adminRole);
        $moderator1->roles()->attach($moderatorRole);
        $moderator2->roles()->attach($moderatorRole);

        Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $moderator1->id,
            'to_user_id' => $admin1->id,
            'type' => 'message',
            'body' => 'Message to admin1',
        ]);

        Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $moderator2->id,
            'to_user_id' => $admin2->id,
            'type' => 'message',
            'body' => 'Message to admin2',
        ]);

        $response = $this->actingAs($admin1, 'sanctum')
            ->getJson('/api/messages?type=message');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'tabs' => [
                '*' => [
                    'admin',
                    'chats',
                ],
            ],
        ]);
    }
}
