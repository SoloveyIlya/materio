<?php

namespace App\Services;

use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $botToken;
    protected string $apiUrl;

    public function __construct()
    {
        $this->botToken = config('services.telegram.bot_token', '');
        $this->apiUrl = "https://api.telegram.org/bot{$this->botToken}";
    }

    /**
     * Отправка уведомления в Telegram
     */
    public function sendNotification(User $user, Message $message): bool
    {
        if (!$user->telegram_id || !$this->botToken) {
            return false;
        }

        try {
            $text = $this->formatMessage($message);
            
            $response = Http::post("{$this->apiUrl}/sendMessage", [
                'chat_id' => $user->telegram_id,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => [
                    'inline_keyboard' => [
                        [
                            [
                                'text' => 'Ответить',
                                'callback_data' => "reply_{$message->id}",
                            ],
                        ],
                    ],
                ],
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Telegram notification error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Форматирование сообщения для Telegram
     */
    protected function formatMessage(Message $message): string
    {
        $fromUser = $message->fromUser;
        $type = $message->type === 'support' ? 'Support' : 'Message';
        $taskInfo = '';

        if ($message->task_id) {
            $task = $message->task;
            $taskInfo = "\n\n📋 <b>Task:</b> {$task->title}";
        }

        $text = "🔔 <b>Новое сообщение ({$type})</b>\n\n";
        $text .= "От: {$fromUser->name}\n";
        $text .= "Сообщение: {$message->body}";
        $text .= $taskInfo;

        if ($message->attachments && count($message->attachments) > 0) {
            $text .= "\n\n📎 Вложения: " . count($message->attachments);
        }

        return $text;
    }

    /**
     * Обработка ответа из Telegram
     */
    public function handleCallback(string $callbackData, int $chatId, string $messageText): bool
    {
        if (str_starts_with($callbackData, 'reply_')) {
            $messageId = (int) str_replace('reply_', '', $callbackData);
            $originalMessage = Message::find($messageId);

            if (!$originalMessage) {
                return false;
            }

            // Создаем ответное сообщение
            $replyMessage = Message::create([
                'domain_id' => $originalMessage->domain_id,
                'from_user_id' => $originalMessage->to_user_id, // Админ отвечает
                'to_user_id' => $originalMessage->from_user_id, // Модератору
                'task_id' => $originalMessage->task_id,
                'type' => $originalMessage->type,
                'body' => $messageText,
            ]);

            // Отправляем подтверждение в Telegram
            $this->sendConfirmation($chatId, 'Сообщение отправлено');

            return true;
        }

        return false;
    }

    /**
     * Отправка подтверждения в Telegram
     */
    protected function sendConfirmation(int $chatId, string $text): void
    {
        try {
            Http::post("{$this->apiUrl}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram confirmation error: ' . $e->getMessage());
        }
    }

    /**
     * Привязка Telegram ID к пользователю
     */
    public function linkTelegramId(User $user, string $telegramId, string $username = null): bool
    {
        $user->update([
            'telegram_id' => $telegramId,
            'telegram_username' => $username,
        ]);

        return true;
    }
}
