<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskResult;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $admin = $request->user();
            
            if (!$admin->domain_id) {
                return response()->json(['message' => 'User domain not set'], 400);
            }

            // Working moderators - активные модераторы домена (все, не только закрепленные)
            $workingModerators = User::with(['roles', 'moderatorProfile'])
            ->where('domain_id', $admin->domain_id)
            ->where(function ($q) use ($admin) {
                $q->where('administrator_id', $admin->id)
                  ->orWhereNull('administrator_id');
            })
            ->whereNull('deleted_at')
            ->where('hidden_from_dashboard', false)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'moderator');
            })
            ->get()
            ->map(function ($moderator) {
                $workStartDate = $moderator->work_start_date;
                $workStartDateFormatted = null;
                $daysSinceStart = null;
                
                if ($workStartDate) {
                    try {
                        $date = is_string($workStartDate) ? Carbon::parse($workStartDate) : $workStartDate;
                        $workStartDateFormatted = $date->format('Y-m-d');
                        $daysSinceStart = max(0, $date->diffInDays(now()));
                    } catch (\Exception $e) {
                        // Если не удалось распарсить дату, оставляем null
                    }
                }
                
                return [
                    'id' => $moderator->id,
                    'name' => $moderator->name,
                    'email' => $moderator->email,
                    'work_start_date' => $workStartDateFormatted,
                    'days_since_start' => $daysSinceStart,
                ];
            });

        // Deleted moderators - удаленные модераторы домена (все, не только закрепленные)
        $deletedModerators = User::withTrashed()
            ->with(['roles', 'moderatorProfile'])
            ->where('domain_id', $admin->domain_id)
            ->where(function ($q) use ($admin) {
                $q->where('administrator_id', $admin->id)
                  ->orWhereNull('administrator_id');
            })
            ->whereNotNull('deleted_at')
            ->where('hidden_from_dashboard', false)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'moderator');
            })
            ->get()
            ->map(function ($moderator) {
                $deletedAt = $moderator->deleted_at;
                $deletedAtFormatted = null;
                $daysSinceDeleted = null;
                
                if ($deletedAt) {
                    try {
                        $date = is_string($deletedAt) ? Carbon::parse($deletedAt) : $deletedAt;
                        $deletedAtFormatted = $date->format('Y-m-d');
                        $daysSinceDeleted = max(0, $date->diffInDays(now()));
                    } catch (\Exception $e) {
                        // Если не удалось распарсить дату, оставляем null
                    }
                }
                
                return [
                    'id' => $moderator->id,
                    'name' => $moderator->name,
                    'email' => $moderator->email,
                    'deleted_at' => $deletedAtFormatted,
                    'days_since_deleted' => $daysSinceDeleted,
                ];
            });

        // Tasks statistics - все задачи модераторов домена (всех, не только закрепленных)
        $moderatorIds = User::where('domain_id', $admin->domain_id)
            ->where(function ($q) use ($admin) {
                $q->where('administrator_id', $admin->id)
                  ->orWhereNull('administrator_id');
            })
            ->whereHas('roles', function ($q) {
                $q->where('name', 'moderator');
            })
            ->pluck('id');

        // Если нет модераторов, возвращаем 0 для всех счетчиков
        $totalTasks = $moderatorIds->isNotEmpty()
            ? Task::where('domain_id', $admin->domain_id)
                ->whereIn('assigned_to', $moderatorIds)
                ->count()
            : 0;

        $completedTasks = $moderatorIds->isNotEmpty() 
            ? Task::where('domain_id', $admin->domain_id)
                ->whereIn('assigned_to', $moderatorIds)
                ->whereIn('status', ['approved', 'completed_by_moderator'])
                ->count()
            : 0;

        $inProgressTasks = $moderatorIds->isNotEmpty()
            ? Task::where('domain_id', $admin->domain_id)
                ->whereIn('assigned_to', $moderatorIds)
                ->where('status', 'in_progress')
                ->count()
            : 0;

        $pendingTasks = $moderatorIds->isNotEmpty()
            ? Task::where('domain_id', $admin->domain_id)
                ->whereIn('assigned_to', $moderatorIds)
                ->where('status', 'pending')
                ->count()
            : 0;

        $underReviewTasks = $moderatorIds->isNotEmpty()
            ? Task::where('domain_id', $admin->domain_id)
                ->whereIn('assigned_to', $moderatorIds)
                ->where('status', 'under_admin_review')
                ->count()
            : 0;

        // Main Task statistics
        $mainTask = Task::where('domain_id', $admin->domain_id)
            ->where('is_main_task', true)
            ->latest()
            ->first();

        $mainTaskStats = null;
        if ($mainTask) {
            // Users who received the main task (check TaskAssignment table and direct assignment)
            $receivedUserIds = TaskAssignment::where('task_id', $mainTask->id)
                ->pluck('assigned_to')
                ->merge($mainTask->assigned_to ? [$mainTask->assigned_to] : [])
                ->filter()
                ->unique();

            $receivedUsers = User::with(['roles'])
                ->whereIn('id', $receivedUserIds)
                ->where('domain_id', $admin->domain_id)
                ->where(function ($q) use ($admin) {
                    $q->where('administrator_id', $admin->id)
                      ->orWhereNull('administrator_id');
                })
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->get()
                ->map(function ($user) use ($mainTask) {
                    $assignment = TaskAssignment::where('task_id', $mainTask->id)
                        ->where('assigned_to', $user->id)
                        ->first();
                    $assignedAt = $assignment 
                        ? $assignment->assigned_at 
                        : ($mainTask->assigned_to == $user->id ? $mainTask->assigned_at : null);
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'received_at' => $assignedAt ? Carbon::parse($assignedAt)->format('Y-m-d') : null,
                        'days_since_received' => $assignedAt ? max(0, Carbon::parse($assignedAt)->diffInDays(now())) : null,
                    ];
                });

            // Users who completed the main task (active users) - check if they have a TaskResult
            $completedUserIds = TaskResult::where('task_id', $mainTask->id)
                ->pluck('moderator_id')
                ->filter()
                ->unique();

            $completedUsers = User::with(['roles'])
                ->whereIn('id', $completedUserIds)
                ->where('domain_id', $admin->domain_id)
                ->where(function ($q) use ($admin) {
                    $q->where('administrator_id', $admin->id)
                      ->orWhereNull('administrator_id');
                })
                ->whereNull('deleted_at')
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->get()
                ->map(function ($user) use ($mainTask) {
                    $result = TaskResult::where('task_id', $mainTask->id)
                        ->where('moderator_id', $user->id)
                        ->first();
                    
                    // Use created_at as completion date (when result was submitted)
                    $completedAt = $result ? $result->created_at : null;
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'completed_at' => $completedAt ? Carbon::parse($completedAt)->format('Y-m-d') : null,
                        'days_since_completed' => $completedAt ? max(0, Carbon::parse($completedAt)->diffInDays(now())) : null,
                    ];
                });

            // Deleted users who completed the main task
            $deletedCompletedUsers = User::withTrashed()
                ->with(['roles'])
                ->whereIn('id', $completedUserIds)
                ->where('domain_id', $admin->domain_id)
                ->where(function ($q) use ($admin) {
                    $q->where('administrator_id', $admin->id)
                      ->orWhereNull('administrator_id');
                })
                ->whereNotNull('deleted_at')
                ->where('hidden_from_dashboard', false)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'moderator');
                })
                ->get()
                ->map(function ($user) use ($mainTask) {
                    $result = TaskResult::where('task_id', $mainTask->id)
                        ->where('moderator_id', $user->id)
                        ->first();
                    
                    // Use created_at as completion date (when result was submitted)
                    $completedAt = $result ? $result->created_at : null;
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'completed_at' => $completedAt ? Carbon::parse($completedAt)->format('Y-m-d') : null,
                        'days_since_completed' => $completedAt ? max(0, Carbon::parse($completedAt)->diffInDays(now())) : null,
                    ];
                });

            $mainTaskStats = [
                'task' => [
                    'id' => $mainTask->id,
                    'title' => $mainTask->title,
                    'description' => $mainTask->description,
                ],
                'received_users' => $receivedUsers,
                'completed_users' => $completedUsers,
                'deleted_completed_users' => $deletedCompletedUsers,
            ];
        }

            return response()->json([
                'working_moderators' => $workingModerators,
                'deleted_moderators' => $deletedModerators,
                'tasks' => [
                    'total' => $totalTasks,
                    'completed' => $completedTasks,
                    'in_progress' => $inProgressTasks,
                    'pending' => $pendingTasks,
                    'under_review' => $underReviewTasks,
                ],
                'main_task' => $mainTaskStats,
            ]);
        } catch (\Exception $e) {
            \Log::error('Dashboard error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);
            
            return response()->json([
                'message' => 'Error loading dashboard',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function hideDeletedUser(Request $request, User $user): JsonResponse
    {
        $admin = $request->user();
        
        // Проверяем, что пользователь принадлежит этому администратору
        if ($user->administrator_id !== $admin->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->update([
            'hidden_from_dashboard' => true,
        ]);

        return response()->json([
            'message' => 'User hidden from dashboard',
            'user' => $user,
        ]);
    }

    public function getCounts(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user->domain_id) {
                return response()->json(['message' => 'User domain not set'], 400);
            }

            $counts = [];

            // Для админов
            if ($user->isAdmin()) {
                // Непрочитанные сообщения в чате (type='message')
                // Сообщения от модераторов, закрепленных за этим админом, которые не прочитаны
                // Получаем ID всех модераторов, закрепленных за текущим админом
                $moderatorIds = User::where('domain_id', $user->domain_id)
                    ->where('administrator_id', $user->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'moderator');
                    })
                    ->pluck('id')
                    ->toArray();

                $unreadChatMessages = 0;
                if (count($moderatorIds) > 0) {
                    $unreadChatMessages = Message::where('domain_id', $user->domain_id)
                        ->where('type', 'message')
                        ->whereIn('from_user_id', $moderatorIds)
                        ->where('to_user_id', $user->id)
                        ->where('is_read', false)
                        ->where('is_deleted', false)
                        ->count();
                }
                $counts['chat'] = $unreadChatMessages;

                // Также возвращаем количество непрочитанных сообщений для каждого админа в домене
                $allAdmins = User::where('domain_id', $user->domain_id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'admin');
                    })
                    ->get(['id', 'name']);

                $chatCountsByAdmin = [];
                foreach ($allAdmins as $admin) {
                    $adminModeratorIds = User::where('domain_id', $user->domain_id)
                        ->where('administrator_id', $admin->id)
                        ->whereHas('roles', function ($q) {
                            $q->where('name', 'moderator');
                        })
                        ->pluck('id')
                        ->toArray();

                    $adminUnreadCount = 0;
                    if (count($adminModeratorIds) > 0) {
                        $adminUnreadCount = Message::where('domain_id', $user->domain_id)
                            ->where('type', 'message')
                            ->whereIn('from_user_id', $adminModeratorIds)
                            ->where('to_user_id', $admin->id)
                            ->where('is_read', false)
                            ->where('is_deleted', false)
                            ->count();
                    }
                    
                    if ($adminUnreadCount > 0) {
                        $chatCountsByAdmin[] = [
                            'admin_id' => $admin->id,
                            'admin_name' => $admin->name,
                            'count' => $adminUnreadCount
                        ];
                    }
                }
                $counts['chat_by_admin'] = $chatCountsByAdmin;

                // Непрочитанные тикеты в support
                // Тикеты, где есть непрочитанные сообщения от пользователей к админу
                $unreadSupportTickets = Ticket::where('domain_id', $user->domain_id)
                    ->whereHas('messages', function ($q) use ($user) {
                        $q->where('to_user_id', $user->id)
                          ->where('is_read', false)
                          ->where('type', 'support');
                    })
                    ->count();
                $counts['support'] = $unreadSupportTickets;

                // Задачи на проверке (under_admin_review)
                $tasksUnderReview = Task::where('domain_id', $user->domain_id)
                    ->where('status', 'under_admin_review')
                    ->count();
                $counts['tasks'] = $tasksUnderReview;
            }
            // Для модераторов
            else if ($user->isModerator()) {
                // Непрочитанные сообщения в чате от админа
                $administratorId = $user->administrator_id;
                if ($administratorId) {
                    $unreadChatMessages = Message::where('domain_id', $user->domain_id)
                        ->where('type', 'message')
                        ->where('from_user_id', $administratorId)
                        ->where('to_user_id', $user->id)
                        ->where('is_read', false)
                        ->where('is_deleted', false)
                        ->count();
                    $counts['chat'] = $unreadChatMessages;
                } else {
                    $counts['chat'] = 0;
                }

                // Непрочитанные тикеты в support (тикеты модератора с непрочитанными ответами)
                $unreadSupportTickets = Ticket::where('domain_id', $user->domain_id)
                    ->where('user_id', $user->id)
                    ->whereHas('messages', function ($q) use ($user) {
                        $q->where('from_user_id', '!=', $user->id)
                          ->where('to_user_id', $user->id)
                          ->where('is_read', false)
                          ->where('type', 'support');
                    })
                    ->count();
                $counts['support'] = $unreadSupportTickets;

                // Задачи на проверке для модератора нет
                $counts['tasks'] = 0;
            }

            return response()->json($counts);
        } catch (\Exception $e) {
            \Log::error('Get counts error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);
            
            return response()->json([
                'chat' => 0,
                'support' => 0,
                'tasks' => 0,
            ]);
        }
    }
}
