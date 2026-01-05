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

        // Для админа: получаем чаты, группированные по администраторам (вкладки с админами)
        if ($user->isAdmin()) {
            // Получаем всех администраторов домена (все будут вкладками)
            $admins = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                })
                ->get(['id', 'name', 'email', 'is_online', 'last_seen_at', 'avatar']);

            // Получаем всех модераторов для отображения
            $allModerators = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->get(['id', 'name', 'email', 'is_online', 'last_seen_at', 'avatar', 'administrator_id']);

            $tabs = [];

            foreach ($admins as $admin) {
                // Получаем модераторов, закреплённых за этого администратора
                $assignedModerators = $allModerators->where('administrator_id', $admin->id)->values();

                // Получаем все сообщения между этим админом и его модераторами
                $moderatorIds = $assignedModerators->pluck('id')->toArray();
                
                if (count($moderatorIds) > 0) {
                    $messages = Message::where('domain_id', $user->domain_id)
                        ->where('type', $type)
                        ->where('is_deleted', false)
                        ->where(function ($q) use ($admin, $moderatorIds) {
                            // Сообщения от админа к модераторам
                            $q->where(function ($subQ) use ($admin, $moderatorIds) {
                                $subQ->where('from_user_id', $admin->id)
                                     ->whereIn('to_user_id', $moderatorIds);
                            })
                            // Сообщения от модераторов к админу
                            ->orWhere(function ($subQ) use ($admin, $moderatorIds) {
                                $subQ->whereIn('from_user_id', $moderatorIds)
                                     ->where('to_user_id', $admin->id);
                            });
                        })
                        ->with(['fromUser', 'toUser', 'task'])
                        ->orderBy('created_at', 'asc')
                        ->get();

                    // Группируем сообщения по модераторам
                    $adminChats = [];
                    
                    foreach ($assignedModerators as $moderator) {
                        $moderatorMessages = $messages->filter(function ($msg) use ($admin, $moderator) {
                            return ($msg->from_user_id === $admin->id && $msg->to_user_id === $moderator->id) ||
                                   ($msg->from_user_id === $moderator->id && $msg->to_user_id === $admin->id);
                        })->values();

                        // Форматируем сообщения (админ видит статус прочтения для сообщений от модераторов)
                        $formattedMessages = $moderatorMessages->map(function ($message) use ($user, $admin) {
                            if ($message->created_at) {
                                $message->created_at_formatted = $message->created_at
                                    ->setTimezone($user->timezone ?? 'UTC')
                                    ->format('Y-m-d H:i:s');
                            }
                            // Админ видит статус прочтения для сообщений, которые он отправил модератору
                            if ($message->from_user_id === $admin->id && $message->read_at) {
                                $message->read_at_formatted = $message->read_at
                                    ->setTimezone($user->timezone ?? 'UTC')
                                    ->format('Y-m-d H:i:s');
                            }
                            return $message;
                        })->toArray();

                        // Считаем непрочитанные сообщения от модераторов для этого админа
                        $unreadCount = $moderatorMessages->filter(function ($msg) use ($admin) {
                            return $msg->from_user_id !== $admin->id && 
                                   $msg->to_user_id === $admin->id && 
                                   !$msg->is_read;
                        })->count();

                        $adminChats[] = [
                            'user' => $moderator,
                            'messages' => $formattedMessages,
                            'unread_count' => $unreadCount,
                        ];
                    }
                } else {
                    $adminChats = [];
                }

                // Добавляем таб для каждого админа, даже если нет чатов
                $tabs[] = [
                    'admin' => [
                        'id' => $admin->id,
                        'name' => $admin->name,
                        'email' => $admin->email,
                        'avatar' => $admin->avatar,
                    ],
                    'chats' => $adminChats,
                ];
            }

            // Добавляем группу незакрепленных модераторов
            $unassignedModerators = $allModerators->whereNull('administrator_id')->values();
            $unassignedChats = [];
            
            if ($unassignedModerators->count() > 0) {
                $unassignedModeratorIds = $unassignedModerators->pluck('id')->toArray();
                
                // Получаем все сообщения с незакрепленными модераторами
                // Для незакрепленных модераторов используем первый доступный админ (или всех админов)
                $unassignedMessages = Message::where('domain_id', $user->domain_id)
                    ->where('type', $type)
                    ->where('is_deleted', false)
                    ->where(function ($q) use ($unassignedModeratorIds, $admins) {
                        $adminIds = $admins->pluck('id')->toArray();
                        // Сообщения от админов к незакрепленным модераторам
                        $q->where(function ($subQ) use ($adminIds, $unassignedModeratorIds) {
                            $subQ->whereIn('from_user_id', $adminIds)
                                 ->whereIn('to_user_id', $unassignedModeratorIds);
                        })
                        // Сообщения от незакрепленных модераторов к админам
                        ->orWhere(function ($subQ) use ($adminIds, $unassignedModeratorIds) {
                            $subQ->whereIn('from_user_id', $unassignedModeratorIds)
                                 ->whereIn('to_user_id', $adminIds);
                        });
                    })
                    ->with(['fromUser', 'toUser', 'task'])
                    ->orderBy('created_at', 'asc')
                    ->get();
                
                foreach ($unassignedModerators as $moderator) {
                    $moderatorMessages = $unassignedMessages->filter(function ($msg) use ($moderator, $admins) {
                        $adminIds = $admins->pluck('id')->toArray();
                        return ($msg->from_user_id === $moderator->id && in_array($msg->to_user_id, $adminIds)) ||
                               ($msg->to_user_id === $moderator->id && in_array($msg->from_user_id, $adminIds));
                    })->values();
                    
                    $formattedMessages = $moderatorMessages->map(function ($message) use ($user) {
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
                    
                    // Считаем непрочитанные сообщения от незакрепленных модераторов
                    $unreadCount = $moderatorMessages->filter(function ($msg) use ($admins) {
                        $adminIds = $admins->pluck('id')->toArray();
                        return in_array($msg->to_user_id, $adminIds) && !$msg->is_read;
                    })->count();
                    
                    $unassignedChats[] = [
                        'user' => $moderator,
                        'messages' => $formattedMessages,
                        'unread_count' => $unreadCount,
                    ];
                }
            }
            
            return response()->json([
                'tabs' => $tabs,
                'unassigned' => [
                    'chats' => $unassignedChats,
                ],
            ]);
        }

        // Для модератора: получаем чаты только с его админом (administrator_id)
        $administratorId = $user->administrator_id;
        
        if (!$administratorId) {
            // Если модератор не закреплен за админом, возвращаем пустой список
            return response()->json([]);
        }

        $query = Message::where('domain_id', $user->domain_id)
            ->where('type', $type)
            ->where(function ($q) use ($user, $administratorId) {
                // Сообщения между модератором и его админом
                $q->where(function ($subQ) use ($user, $administratorId) {
                    $subQ->where('from_user_id', $user->id)
                         ->where('to_user_id', $administratorId);
                })->orWhere(function ($subQ) use ($user, $administratorId) {
                    $subQ->where('from_user_id', $administratorId)
                         ->where('to_user_id', $user->id);
                });
            })
            ->where('is_deleted', false)
            ->with(['fromUser', 'toUser', 'task']);

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        $messages = $query->orderBy('created_at', 'asc')->get();

        // Получаем админа модератора
        $admin = \App\Models\User::find($administratorId);
        
        if (!$admin) {
            return response()->json([]);
        }

        // Форматируем даты по таймзоне модератора и скрываем статус прочтения для модератора
        $formattedMessages = collect($messages)->map(function ($message) use ($user) {
            if ($message->created_at) {
                $message->created_at_formatted = $message->created_at
                    ->setTimezone($user->timezone ?? 'UTC')
                    ->format('Y-m-d H:i:s');
            }
            // Модератор не видит статус прочтения админом
            if ($message->from_user_id === $user->id) {
                // Сообщения от модератора - скрываем статус прочтения
                $message->is_read = null;
                $message->read_at = null;
                $message->read_at_formatted = null;
            } else {
                // Сообщения от админа - форматируем read_at если есть
                if ($message->read_at) {
                    $message->read_at_formatted = $message->read_at
                        ->setTimezone($user->timezone ?? 'UTC')
                        ->format('Y-m-d H:i:s');
                }
            }
            return $message;
        })->toArray();
        
        return response()->json([
            [
                'user' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'is_online' => $admin->is_online,
                    'last_seen_at' => $admin->last_seen_at,
                    'avatar' => $admin->avatar,
                ],
                'messages' => $formattedMessages,
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Валидация для обычных данных
        $validated = $request->validate([
            'to_user_id' => 'required|exists:users,id',
            'from_user_id' => 'nullable|exists:users,id', // Для отправки от имени другого админа
            'task_id' => 'nullable|exists:tasks,id',
            'type' => 'required|in:message,support',
            'body' => 'nullable|string',
        ]);
        
        // Проверяем, что есть либо body, либо файлы
        if (empty($validated['body']) && !$request->hasFile('attachments') && !$request->hasFile('voice')) {
            return response()->json(['message' => 'Message body, attachments or voice required'], 422);
        }

        // Определяем от имени кого отправлять сообщение
        $fromUserId = $user->id;
        if ($user->isAdmin() && isset($validated['from_user_id']) && $validated['from_user_id'] !== $user->id) {
            // Проверяем, что указанный пользователь - админ из того же домена
            $fromUser = \App\Models\User::find($validated['from_user_id']);
            if (!$fromUser || !$fromUser->isAdmin() || $fromUser->domain_id !== $user->domain_id) {
                return response()->json(['message' => 'Invalid from_user_id'], 403);
            }
            $fromUserId = $validated['from_user_id'];
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
                        $attachmentPaths[] = [
                            'url' => Storage::url($path),
                            'type' => 'file',
                            'name' => $attachment->getClientOriginalName(),
                        ];
                    }
                }
            } else {
                // Если одно вложение
                if ($attachments->isValid()) {
                    $path = $attachments->store('messages/attachments', 'public');
                    $attachmentPaths[] = [
                        'url' => Storage::url($path),
                        'type' => 'file',
                        'name' => $attachments->getClientOriginalName(),
                    ];
                }
            }
        }

        // Обработка голосовых сообщений (кружков)
        if ($request->hasFile('voice')) {
            $voiceFile = $request->file('voice');
            if ($voiceFile->isValid()) {
                $path = $voiceFile->store('messages/voice', 'public');
                $attachmentPaths[] = [
                    'url' => Storage::url($path),
                    'type' => 'voice',
                    'name' => $voiceFile->getClientOriginalName(),
                ];
            }
        }

        $message = Message::create([
            'domain_id' => $user->domain_id,
            'from_user_id' => $fromUserId, // Используем fromUserId (может быть другой админ)
            'to_user_id' => $validated['to_user_id'],
            'task_id' => $validated['task_id'] ?? null,
            'type' => $validated['type'],
            'body' => $validated['body'],
            'attachments' => !empty($attachmentPaths) ? $attachmentPaths : null,
        ]);

        // Отправляем уведомление в Telegram через очередь
        // Для Messages: отправляем админу, к которому закреплен модератор
        // Для Support: отправляем админу, к которому закреплен модератор
        if ($user->isModerator() && $toUser->isAdmin()) {
            // Модератор отправляет админу - отправляем уведомление админу через очередь
            if ($toUser->telegram_id) {
                \App\Jobs\SendTelegramNotification::dispatch($toUser, $message);
            }
        } elseif ($user->isAdmin() && $toUser->isModerator()) {
            // Админ отправляет модератору - уведомление не нужно
            // Но если модератор должен получать уведомления, можно добавить здесь
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
