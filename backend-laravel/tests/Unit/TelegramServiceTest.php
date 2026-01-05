<?php

namespace Tests\Unit;

use App\Models\Message;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramServiceTest extends TestCase
{
    use RefreshDatabase;

    protected TelegramService $telegramService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->telegramService = new TelegramService();
    }

    public function test_send_notification_without_telegram_id_returns_false(): void
    {
        $user = User::factory()->create(['telegram_id' => null]);
        $message = Message::factory()->create();

        $result = $this->telegramService->sendNotification($user, $message);

        $this->assertFalse($result);
    }

    public function test_send_notification_sends_message_to_telegram(): void
    {
        Http::fake([
            'api.telegram.org/bot*' => Http::response([
                'ok' => true,
                'result' => [
                    'message_id' => 123,
                    'text' => 'Test',
                ],
            ], 200),
        ]);

        $user = User::factory()->create(['telegram_id' => '123456789']);
        $message = Message::factory()->create([
            'body' => 'Test message',
            'type' => 'message',
        ]);
        $message->load('fromUser', 'toUser');

        $result = $this->telegramService->sendNotification($user, $message);

        Http::assertSent(function ($request) use ($user) {
            return str_contains($request->url(), 'sendMessage') &&
                   $request['chat_id'] == $user->telegram_id;
        });

        $this->assertTrue($result);
    }

    public function test_handle_reply_creates_reply_message(): void
    {
        $domain = \App\Models\Domain::factory()->create();
        $admin = User::factory()->create([
            'domain_id' => $domain->id,
            'telegram_id' => '123456789',
        ]);
        $moderator = User::factory()->create(['domain_id' => $domain->id]);
        
        $adminRole = \App\Models\Role::firstOrCreate(['name' => 'admin']);
        $admin->roles()->attach($adminRole);

        $originalMessage = Message::factory()->create([
            'domain_id' => $domain->id,
            'from_user_id' => $moderator->id,
            'to_user_id' => $admin->id,
            'type' => 'message',
            'body' => 'Original message',
            'telegram_message_id' => 456,
        ]);

        Http::fake([
            'api.telegram.org/bot*' => Http::response(['ok' => true], 200),
        ]);

        $result = $this->telegramService->handleReply(
            (int)$admin->telegram_id,
            456,
            'Reply message'
        );

        $this->assertTrue($result);
        $this->assertDatabaseHas('messages', [
            'from_user_id' => $admin->id,
            'to_user_id' => $moderator->id,
            'body' => 'Reply message',
            'type' => 'message',
        ]);
    }
}
