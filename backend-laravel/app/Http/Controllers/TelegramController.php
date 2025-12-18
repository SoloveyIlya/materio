<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramController extends Controller
{
    protected TelegramService $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        $this->telegramService = $telegramService;
    }

    /**
     * Webhook для получения обновлений от Telegram
     */
    public function webhook(Request $request): JsonResponse
    {
        $update = $request->all();

        Log::info('Telegram webhook received', $update);

        // Обработка callback query (кнопки)
        if (isset($update['callback_query'])) {
            $callback = $update['callback_query'];
            $chatId = $callback['from']['id'];
            $callbackData = $callback['data'];
            $messageText = $callback['message']['text'] ?? '';

            $this->telegramService->handleCallback($callbackData, $chatId, $messageText);
        }

        // Обработка обычных сообщений
        if (isset($update['message'])) {
            $message = $update['message'];
            $chatId = $message['chat']['id'];
            $text = $message['text'] ?? '';
            $username = $message['from']['username'] ?? null;

            // Если сообщение начинается с /start, привязываем Telegram ID
            if (str_starts_with($text, '/start')) {
                $token = str_replace('/start ', '', $text);
                // Здесь можно добавить логику привязки по токену
                // Пока просто сохраняем telegram_id
            }

            // Если это ответ на callback, обрабатываем
            if (isset($message['reply_to_message'])) {
                // Обработка ответа
            }
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Привязка Telegram ID к пользователю
     */
    public function link(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'telegram_id' => 'required|string',
            'telegram_username' => 'nullable|string',
        ]);

        $this->telegramService->linkTelegramId(
            $user,
            $validated['telegram_id'],
            $validated['telegram_username'] ?? null
        );

        return response()->json(['message' => 'Telegram account linked successfully']);
    }
}
