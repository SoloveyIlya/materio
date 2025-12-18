<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $request->get('type', 'message'); // message или support

        // Для админа: получаем чаты с модераторами
        if ($user->isAdmin()) {
            $query = Message::where('domain_id', $user->domain_id)
                ->where('type', $type)
                ->where(function ($q) use ($user) {
                    $q->where('from_user_id', $user->id)
                      ->orWhere('to_user_id', $user->id);
                })
                ->with(['fromUser', 'toUser', 'task']);

            if ($request->has('moderator_id')) {
                $query->where(function ($q) use ($request) {
                    $q->where('from_user_id', $request->moderator_id)
                      ->orWhere('to_user_id', $request->moderator_id);
                });
            }

            $messages = $query->orderBy('created_at', 'desc')->get();

            // Группируем по собеседникам
            $chats = [];
            foreach ($messages as $message) {
                $otherUserId = $message->from_user_id === $user->id 
                    ? $message->to_user_id 
                    : $message->from_user_id;
                
                if (!isset($chats[$otherUserId])) {
                    $chats[$otherUserId] = [
                        'user' => $message->from_user_id === $user->id 
                            ? $message->toUser 
                            : $message->fromUser,
                        'messages' => [],
                    ];
                }
                
                $chats[$otherUserId]['messages'][] = $message;
            }

            return response()->json([
                'chats' => array_values($chats),
                'unassigned_moderators' => $user->domain->users()
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'moderator');
                    })
                    ->whereNull('administrator_id')
                    ->get(),
            ]);
        }

        // Для модератора: получаем чаты с админами
        $query = Message::where('domain_id', $user->domain_id)
            ->where('type', $type)
            ->where(function ($q) use ($user) {
                $q->where('from_user_id', $user->id)
                  ->orWhere('to_user_id', $user->id);
            })
            ->with(['fromUser', 'toUser', 'task']);

        if ($request->has('admin_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('from_user_id', $request->admin_id)
                  ->orWhere('to_user_id', $request->admin_id);
            });
        }

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        $messages = $query->orderBy('created_at', 'asc')->get();

        return response()->json($messages);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'to_user_id' => 'required|exists:users,id',
            'task_id' => 'nullable|exists:tasks,id',
            'type' => 'required|in:message,support',
            'body' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'string',
        ]);

        // Проверяем права доступа
        $toUser = \App\Models\User::find($validated['to_user_id']);
        if ($toUser->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Если это сообщение по таску, проверяем доступ
        if (isset($validated['task_id'])) {
            $task = Task::find($validated['task_id']);
            if ($task->domain_id !== $user->domain_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            if ($user->isModerator() && !$task->isAssignedTo($user->id)) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $message = Message::create([
            'domain_id' => $user->domain_id,
            'from_user_id' => $user->id,
            'to_user_id' => $validated['to_user_id'],
            'task_id' => $validated['task_id'] ?? null,
            'type' => $validated['type'],
            'body' => $validated['body'],
            'attachments' => $validated['attachments'] ?? null,
        ]);

        // Отправляем уведомление в Telegram, если у получателя есть telegram_id
        if ($toUser->telegram_id) {
            $telegramService = app(\App\Services\TelegramService::class);
            $telegramService->sendNotification($toUser, $message);
        }

        return response()->json($message->load(['fromUser', 'toUser', 'task']), 201);
    }

    public function update(Message $message, Request $request): JsonResponse
    {
        $user = $request->user();

        // Только админ может редактировать сообщения
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($message->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $message->update([
            'body' => $validated['body'],
            'is_edited' => true,
            'edited_at' => now(),
        ]);

        return response()->json($message->load(['fromUser', 'toUser', 'task']));
    }

    public function destroy(Message $message, Request $request): JsonResponse
    {
        $user = $request->user();

        // Только админ может удалять сообщения
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($message->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $message->update([
            'is_deleted' => true,
            'deleted_at' => now(),
        ]);

        return response()->json(['message' => 'Message deleted']);
    }

    public function markAsRead(Message $message, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($message->to_user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $message->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json($message);
    }
}
