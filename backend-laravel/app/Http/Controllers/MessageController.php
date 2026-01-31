<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Task;
use App\Events\MessageSent;
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

        // Проверяем и обновляем статус пользователей на основе last_seen_at
        $offlineTimeoutMinutes = config('app.user_offline_timeout_minutes', 5);
        $offlineThreshold = now()->subMinutes($offlineTimeoutMinutes);
        
        // Обновляем статус пользователей, которые не были активны в течение таймаута
        \App\Models\User::where('domain_id', $user->domain_id)
            ->where('is_online', true)
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '<', $offlineThreshold)
            ->update(['is_online' => false]);

        // Для админа: получаем чаты, группированные по администраторам (вкладки с админами)
        if ($user->isAdmin()) {
            // Получаем всех администраторов домена (все будут вкладками)
            $admins = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                })
                ->with(['roles', 'adminProfile'])
                ->get(['id', 'name', 'email', 'is_online', 'last_seen_at', 'avatar', 'timezone']);

            // Получаем всех модераторов для отображения
            $allModerators = \App\Models\User::where('domain_id', $user->domain_id)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->with(['roles', 'moderatorProfile'])
                ->get(['id', 'name', 'email', 'is_online', 'last_seen_at', 'avatar', 'administrator_id', 'timezone', 'work_start_date', 'platform']);

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

                        // Считаем непрочитанные сообщения от модератора к админу
                        // Важно: учитываем только сообщения, которые админ еще не прочитал
                        $unreadCount = $moderatorMessages->filter(function ($msg) use ($admin, $moderator) {
                            // Непрочитанные сообщения от модератора к админу
                            return $msg->from_user_id === $moderator->id && 
                                   $msg->to_user_id === $admin->id && 
                                   $msg->is_read === false;
                        })->count();

                        $adminChats[] = [
                            'user' => array_merge($moderator->toArray(), [
                                'moderatorProfile' => $moderator->moderatorProfile,
                            ]),
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
                        'timezone' => $admin->timezone,
                        'roles' => $admin->roles,
                        'adminProfile' => $admin->adminProfile,
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
                        'user' => array_merge($moderator->toArray(), [
                            'moderatorProfile' => $moderator->moderatorProfile,
                        ]),
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
        $admin = \App\Models\User::with(['roles', 'adminProfile'])->find($administratorId);
        
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
                // Модератор не должен видеть, что сообщение было отредактировано админом
                $message->is_edited = false;
                $message->edited_at = null;
            }
            return $message;
        })->toArray();

        // Считаем непрочитанные сообщения от админа к модератору
        $unreadCount = $messages->filter(function ($msg) use ($user, $administratorId) {
            // Непрочитанные сообщения от админа к модератору
            return $msg->from_user_id === $administratorId && 
                   $msg->to_user_id === $user->id && 
                   $msg->is_read === false;
        })->count();
        
        return response()->json([
            [
                'user' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'is_online' => $admin->is_online,
                    'last_seen_at' => $admin->last_seen_at,
                    'avatar' => $admin->avatar,
                    'timezone' => $admin->timezone,
                    'roles' => $admin->roles,
                    'adminProfile' => $admin->adminProfile,
                ],
                'messages' => $formattedMessages,
                'unread_count' => $unreadCount,
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
        // Проверяем attachments (могут быть отправлены как attachments[0], attachments[1] и т.д.)
        $hasAttachments = false;
        if ($request->hasFile('attachments')) {
            $attachments = $request->file('attachments');
            if (is_array($attachments)) {
                $hasAttachments = count(array_filter($attachments, function($file) {
                    return $file && $file->isValid();
                })) > 0;
            } else {
                $hasAttachments = $attachments && $attachments->isValid();
            }
        }
        
        // Также проверяем attachments[0], attachments[1] и т.д.
        if (!$hasAttachments) {
            $allFiles = $request->allFiles();
            foreach ($allFiles as $key => $file) {
                if (strpos($key, 'attachments') === 0) {
                    if (is_array($file)) {
                        $hasAttachments = count(array_filter($file, function($f) {
                            return $f && $f->isValid();
                        })) > 0;
                    } else {
                        $hasAttachments = $file && $file->isValid();
                    }
                    if ($hasAttachments) break;
                }
            }
        }
        
        $hasVoice = $request->hasFile('voice');
        $hasBody = isset($validated['body']) && $validated['body'] !== null && trim($validated['body']) !== '';
        
        if (!$hasBody && !$hasAttachments && !$hasVoice) {
            return response()->json(['message' => 'Message body, attachments or voice required'], 422);
        }

        // Получаем получателя сообщения для проверки прав и определения отправителя
        $toUser = \App\Models\User::find($validated['to_user_id']);
        if (!$toUser) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        // Проверяем права доступа
        if ($toUser->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Определяем от имени кого отправлять сообщение
        $fromUserId = $user->id;
        
        // Если админ отправляет сообщение модератору, закрепленному за другим админом,
        // автоматически отправляем от имени того админа
        if ($user->isAdmin() && $toUser->isModerator() && $toUser->administrator_id) {
            // Если модератор закреплен за другим админом (не текущим), отправляем от его имени
            if ($toUser->administrator_id !== $user->id) {
                $targetAdmin = \App\Models\User::find($toUser->administrator_id);
                if ($targetAdmin && $targetAdmin->isAdmin() && $targetAdmin->domain_id === $user->domain_id) {
                    $fromUserId = $targetAdmin->id;
                }
            }
        }
        
        // Если явно указан from_user_id, используем его (приоритет выше автоматического определения)
        if ($user->isAdmin() && isset($validated['from_user_id']) && $validated['from_user_id'] !== $user->id) {
            // Проверяем, что указанный пользователь - админ из того же домена
            $fromUser = \App\Models\User::find($validated['from_user_id']);
            if (!$fromUser || !$fromUser->isAdmin() || $fromUser->domain_id !== $user->domain_id) {
                return response()->json(['message' => 'Invalid from_user_id'], 403);
            }
            $fromUserId = $validated['from_user_id'];
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
                        $mimeType = $attachment->getMimeType();
                        $originalName = $attachment->getClientOriginalName();
                        
                        // Определяем тип файла
                        $type = 'file';
                        if (strpos($mimeType, 'video/') === 0) {
                            $type = 'video';
                            $path = $attachment->store('messages/videos', 'public');
                        } elseif (strpos($mimeType, 'image/') === 0) {
                            $type = 'image';
                            $path = $attachment->store('messages/attachments', 'public');
                        } else {
                            $path = $attachment->store('messages/attachments', 'public');
                        }
                        
                        $attachmentPaths[] = [
                            'url' => Storage::url($path),
                            'type' => $type,
                            'name' => $originalName,
                        ];
                    }
                }
            } else {
                // Если одно вложение
                if ($attachments->isValid()) {
                    $mimeType = $attachments->getMimeType();
                    $originalName = $attachments->getClientOriginalName();
                    
                    // Определяем тип файла
                    $type = 'file';
                    if (strpos($mimeType, 'video/') === 0) {
                        $type = 'video';
                        $path = $attachments->store('messages/videos', 'public');
                    } elseif (strpos($mimeType, 'image/') === 0) {
                        $type = 'image';
                        $path = $attachments->store('messages/attachments', 'public');
                    } else {
                        $path = $attachments->store('messages/attachments', 'public');
                    }
                    
                    $attachmentPaths[] = [
                        'url' => Storage::url($path),
                        'type' => $type,
                        'name' => $originalName,
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
            'body' => isset($validated['body']) && $validated['body'] !== null && trim($validated['body']) !== '' 
                ? trim($validated['body']) 
                : '',
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

        // Транслируем событие отправки сообщения
        \Log::info('Broadcasting MessageSent event', [
            'message_id' => $message->id,
            'from_user_id' => $message->from_user_id,
            'to_user_id' => $message->to_user_id,
            'domain_id' => $message->domain_id,
        ]);
        broadcast(new MessageSent($message))->toOthers();
        \Log::info('Message broadcast complete');

        // Если это сообщение support типа, отправляем событие об обновлении счетчика
        if ($validated['type'] === 'support' && $user->isModerator()) {
            // Модератор отправил сообщение в support - обновляем счетчик для админа
            $adminId = $toUser->id;
            
            // Считаем непрочитанные тикеты для админа
            // (либо с непрочитанными сообщениями, либо совсем новые без сообщений)
            $unreadCount = \App\Models\Ticket::where('domain_id', $user->domain_id)
                ->where('status', '!=', 'closed')
                ->where(function ($query) use ($adminId) {
                    // Тикеты с непрочитанными сообщениями для админа
                    $query->whereHas('messages', function ($q) use ($adminId) {
                        $q->where('to_user_id', $adminId)
                            ->where('is_read', false);
                    })
                    // ИЛИ новые тикеты без сообщений вообще
                    ->orWhereDoesntHave('messages');
                })
                ->count();
            
            broadcast(new \App\Events\SupportTicketCreated(
                $user->domain_id,
                $adminId,
                $validated['task_id'] ?? null,
                $unreadCount
            ))->toOthers();
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

    /**
     * Пометка всех непрочитанных сообщений в чате как прочитанных
     * Используется при открытии чата
     */
    public function markChatAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'from_user_id' => 'required|exists:users,id',
            'type' => 'required|in:message,support',
            'to_user_id' => 'nullable|exists:users,id', // Для админов: ID админа, которому принадлежит чат (выбранная вкладка)
        ]);

        $fromUserId = $validated['from_user_id'];
        $type = $validated['type'];
        $toUserId = $validated['to_user_id'] ?? $user->id; // По умолчанию - текущий пользователь

        // Проверяем права доступа - пользователь должен иметь доступ к этому чату
        $fromUser = \App\Models\User::find($fromUserId);
        if (!$fromUser || $fromUser->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Проверяем, что toUserId - это админ из того же домена (если указан)
        if ($toUserId !== $user->id) {
            $toUser = \App\Models\User::find($toUserId);
            if (!$toUser || !$toUser->isAdmin() || $toUser->domain_id !== $user->domain_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        // Для админов: помечаем сообщения от модератора (fromUserId) к админу (toUserId)
        if ($user->isAdmin()) {
            // Помечаем все непрочитанные сообщения от модератора (fromUserId) к админу (toUserId)
            Message::where('domain_id', $user->domain_id)
                ->where('type', $type)
                ->where('from_user_id', $fromUserId) // От модератора
                ->where('to_user_id', $toUserId) // К админу (может быть текущий или выбранный во вкладке)
                ->where('is_read', false)
                ->where('is_deleted', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        } 
        // Для модераторов: помечаем сообщения от админа к модератору
        else if ($user->isModerator()) {
            Message::where('domain_id', $user->domain_id)
                ->where('type', $type)
                ->where('from_user_id', $fromUserId)
                ->where('to_user_id', $user->id)
                ->where('is_read', false)
                ->where('is_deleted', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        return response()->json(['message' => 'Messages marked as read']);
    }
}
