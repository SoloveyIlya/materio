<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $request->get('type', 'message'); // message или support

        // Для админа: получаем чаты с модераторами, группированные по администраторам
        if ($user->isAdmin()) {
            $query = Message::where('domain_id', $user->domain_id)
                ->where('type', $type)
                ->where('is_deleted', false)
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

            // Получаем всех администраторов домена
            $admins = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                })
                ->get();

            // Группируем чаты по администраторам
            $tabs = [];
            $unassignedChats = [];

            foreach ($admins as $admin) {
                // Получаем модераторов, закреплённых за этого администратора
                $assignedModerators = \App\Models\User::where('domain_id', $user->domain_id)
                    ->where('administrator_id', $admin->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'moderator');
                    })
                    ->pluck('id')
                    ->toArray();

                $adminChats = [];
                
                // Находим сообщения с модераторами этого администратора
                foreach ($messages as $message) {
                    $otherUserId = $message->from_user_id === $user->id 
                        ? $message->to_user_id 
                        : $message->from_user_id;
                    
                    // Если это модератор, закреплённый за этого админа
                    if (in_array($otherUserId, $assignedModerators)) {
                        if (!isset($adminChats[$otherUserId])) {
                            $adminChats[$otherUserId] = [
                                'user' => $message->from_user_id === $user->id 
                                    ? $message->toUser 
                                    : $message->fromUser,
                                'messages' => [],
                                'unread_count' => 0,
                            ];
                        }
                        
                        $adminChats[$otherUserId]['messages'][] = $message;
                        
                        // Считаем непрочитанные сообщения
                        if (!$message->is_read && $message->to_user_id === $user->id) {
                            $adminChats[$otherUserId]['unread_count']++;
                        }
                    }
                }

                if (count($adminChats) > 0 || $admin->id === $user->id) {
                    $tabs[] = [
                        'admin' => [
                            'id' => $admin->id,
                            'name' => $admin->name,
                            'email' => $admin->email,
                        ],
                        'chats' => array_values($adminChats),
                    ];
                }
            }

            // Незакреплённые модераторы
            $unassignedModerators = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->whereNull('administrator_id')
                ->pluck('id')
                ->toArray();

            foreach ($messages as $message) {
                $otherUserId = $message->from_user_id === $user->id 
                    ? $message->to_user_id 
                    : $message->from_user_id;
                
                // Если это незакреплённый модератор
                if (in_array($otherUserId, $unassignedModerators)) {
                    if (!isset($unassignedChats[$otherUserId])) {
                        $unassignedChats[$otherUserId] = [
                            'user' => $message->from_user_id === $user->id 
                                ? $message->toUser 
                                : $message->fromUser,
                            'messages' => [],
                            'unread_count' => 0,
                        ];
                    }
                    
                    $unassignedChats[$otherUserId]['messages'][] = $message;
                    
                    // Считаем непрочитанные сообщения
                    if (!$message->is_read && $message->to_user_id === $user->id) {
                        $unassignedChats[$otherUserId]['unread_count']++;
                    }
                }
            }

            // Получаем всех модераторов для отображения, даже если нет сообщений
            $allModerators = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->get(['id', 'name', 'email', 'is_online', 'last_seen_at']);

            // Добавляем модераторов без сообщений в соответствующие табы
            foreach ($admins as $adminIndex => $admin) {
                $assignedModerators = \App\Models\User::where('domain_id', $user->domain_id)
                    ->where('administrator_id', $admin->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'moderator');
                    })
                    ->pluck('id')
                    ->toArray();

                // Находим таб для этого админа
                $tabIndex = null;
                foreach ($tabs as $idx => $tab) {
                    if ($tab['admin']['id'] === $admin->id) {
                        $tabIndex = $idx;
                        break;
                    }
                }
                
                if ($tabIndex !== null) {
                    // Добавляем модераторов без сообщений
                    foreach ($allModerators as $moderator) {
                        if (in_array($moderator->id, $assignedModerators)) {
                            // Проверяем, есть ли уже чат с этим модератором
                            $existingChat = null;
                            foreach ($tabs[$tabIndex]['chats'] as $chat) {
                                if ($chat['user']['id'] === $moderator->id) {
                                    $existingChat = $chat;
                                    break;
                                }
                            }
                            
                            if (!$existingChat) {
                                $tabs[$tabIndex]['chats'][] = [
                                    'user' => $moderator,
                                    'messages' => [],
                                    'unread_count' => 0
                                ];
                            }
                        }
                    }
                } else {
                    // Создаём новый таб, если его нет, но есть закреплённые модераторы
                    if (count($assignedModerators) > 0) {
                        $newTabChats = [];
                        foreach ($allModerators as $moderator) {
                            if (in_array($moderator->id, $assignedModerators)) {
                                $newTabChats[] = [
                                    'user' => $moderator,
                                    'messages' => [],
                                    'unread_count' => 0
                                ];
                            }
                        }
                        
                        if (count($newTabChats) > 0) {
                            $tabs[] = [
                                'admin' => [
                                    'id' => $admin->id,
                                    'name' => $admin->name,
                                    'email' => $admin->email,
                                ],
                                'chats' => $newTabChats,
                            ];
                        }
                    }
                }
            }

            // Незакреплённые модераторы - добавляем тех, у кого нет сообщений
            $unassignedModeratorIds = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->whereNull('administrator_id')
                ->pluck('id')
                ->toArray();

            $unassignedModeratorsList = [];
            foreach ($allModerators as $moderator) {
                if (in_array($moderator->id, $unassignedModeratorIds)) {
                    // Проверяем, есть ли уже чат
                    $existingChat = null;
                    foreach (array_values($unassignedChats) as $chat) {
                        if ($chat['user']['id'] === $moderator->id) {
                            $existingChat = $chat;
                            break;
                        }
                    }
                    
                    if (!$existingChat) {
                        $unassignedModeratorsList[] = [
                            'user' => $moderator,
                            'messages' => [],
                            'unread_count' => 0
                        ];
                    }
                }
            }

            return response()->json([
                'tabs' => $tabs,
                'unassigned' => [
                    'chats' => array_merge(array_values($unassignedChats), $unassignedModeratorsList),
                    'moderators' => $allModerators,
                ],
            ]);
        }

        // Для модератора: получаем чаты с админами
        $query = Message::where('domain_id', $user->domain_id)
            ->where('type', $type)
            ->where(function ($q) use ($user) {
                $q->where('from_user_id', $user->id)
                  ->orWhere('to_user_id', $user->id);
            })
            ->where('is_deleted', false)
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

        // Получаем всех админов для отображения, даже если нет сообщений
        $allAdmins = \App\Models\User::where('domain_id', $user->domain_id)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'admin');
            })
            ->get(['id', 'name', 'email', 'is_online', 'last_seen_at']);

        // Группируем сообщения по админам
        $adminChats = [];
        $adminIdsWithMessages = [];
        
        foreach ($messages as $message) {
            $adminId = $message->from_user_id === $user->id 
                ? $message->to_user_id 
                : $message->from_user_id;
            
            // Проверяем, что это админ
            $isAdmin = $allAdmins->contains('id', $adminId);
            if ($isAdmin) {
                if (!isset($adminChats[$adminId])) {
                    $adminChats[$adminId] = [
                        'user' => $message->from_user_id === $user->id 
                            ? $message->toUser 
                            : $message->fromUser,
                        'messages' => [],
                    ];
                }
                $adminChats[$adminId]['messages'][] = $message;
                $adminIdsWithMessages[] = $adminId;
            }
        }

        // Добавляем админов без сообщений
        foreach ($allAdmins as $admin) {
            if (!in_array($admin->id, $adminIdsWithMessages)) {
                $adminChats[$admin->id] = [
                    'user' => $admin,
                    'messages' => [],
                ];
            }
        }

        // Форматируем даты по таймзоне модератора
        $formattedChats = [];
        foreach ($adminChats as $chat) {
            $formattedMessages = collect($chat['messages'])->map(function ($message) use ($user) {
                if ($message->created_at) {
                    $message->created_at_formatted = $message->created_at
                        ->setTimezone($user->timezone ?? 'UTC')
                        ->format('Y-m-d H:i:s');
                }
                if ($message->read_at) {
                    $message->read_at_formatted = $message->read_at
                        ->setTimezone($user->timezone ?? 'UTC')
                        ->format('Y-m-d H:i:s');
                }
                return $message;
            })->toArray();
            
            $formattedChats[] = [
                'user' => $chat['user'],
                'messages' => $formattedMessages,
            ];
        }

        return response()->json($formattedChats);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Валидация для обычных данных
        $validated = $request->validate([
            'to_user_id' => 'required|exists:users,id',
            'task_id' => 'nullable|exists:tasks,id',
            'type' => 'required|in:message,support',
            'body' => 'nullable|string',
        ]);
        
        // Проверяем, что есть либо body, либо файлы
        if (empty($validated['body']) && !$request->hasFile('attachments')) {
            return response()->json(['message' => 'Message body or attachments required'], 422);
        }

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

        // Обработка загрузки файлов
        $attachmentPaths = [];
        if ($request->hasFile('attachments')) {
            $attachments = $request->file('attachments');
            
            // Если attachments - массив файлов
            if (is_array($attachments)) {
                foreach ($attachments as $attachment) {
                    if ($attachment && $attachment->isValid()) {
                        $path = $attachment->store('messages/attachments', 'public');
                        $attachmentPaths[] = Storage::url($path);
                    }
                }
            } else {
                // Если одно вложение
                if ($attachments->isValid()) {
                    $path = $attachments->store('messages/attachments', 'public');
                    $attachmentPaths[] = Storage::url($path);
                }
            }
        }

        $message = Message::create([
            'domain_id' => $user->domain_id,
            'from_user_id' => $user->id,
            'to_user_id' => $validated['to_user_id'],
            'task_id' => $validated['task_id'] ?? null,
            'type' => $validated['type'],
            'body' => $validated['body'],
            'attachments' => !empty($attachmentPaths) ? $attachmentPaths : null,
        ]);

        // Отправляем уведомление в Telegram, если у получателя есть telegram_id
        if ($toUser->telegram_id) {
            $telegramService = app(\App\Services\TelegramService::class);
            $telegramService->sendNotification($toUser, $message);
        }

        $message->load(['fromUser', 'toUser', 'task']);
        
        // Форматируем дату по таймзоне пользователя
        if ($message->created_at) {
            $message->created_at_formatted = $message->created_at
                ->setTimezone($user->timezone ?? 'UTC')
                ->format('Y-m-d H:i:s');
        }

        return response()->json($message, 201);
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
