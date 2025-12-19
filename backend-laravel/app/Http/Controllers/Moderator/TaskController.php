<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskResult;
use App\Models\ModeratorEarning;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    protected TaskService $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Получаем задачи, где пользователь назначен напрямую или через TaskAssignment
        $query = Task::where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                      $assignmentQuery->where('assigned_to', $user->id);
                  });
            })
            ->with(['category', 'template', 'assignments', 'result']);

        // Фильтрация по группе статусов для модератора
        if ($request->has('group')) {
            $group = $request->get('group');
            switch ($group) {
                case 'waiting': // Ожидают
                    $query->where('status', 'pending');
                    break;
                case 'in_work': // В работе
                    $query->where('status', 'in_progress');
                    break;
                case 'history': // История
                    $query->whereIn('status', [
                        'completed_by_moderator',
                        'under_admin_review',
                        'approved',
                        'rejected',
                        'sent_for_revision',
                    ]);
                    break;
            }
        } elseif ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Training center - задачи с категорией Test
        if ($request->has('training')) {
            $query->whereHas('category', function ($q) {
                $q->where('name', 'Test');
            });
        }

        if ($request->has('work_day')) {
            $query->where('work_day', $request->work_day);
        }

        $tasks = $query->orderBy('assigned_at', 'desc')->get();

        // Добавляем информацию о дедлайне и таймере, а также категорию и подгруппу
        $tasks = $tasks->map(function ($task) use ($user) {
            // Таймер обратного отсчёта до дедлайна (в секундах)
            $task->deadline_timer = $task->due_at 
                ? now($user->timezone ?? 'UTC')->diffInSeconds($task->due_at, false) 
                : null;
            
            // Убеждаемся, что категория загружена
            if (!$task->relationLoaded('category')) {
                $task->load('category');
            }
            
            // Подгруппа - это название категории (или можно использовать slug)
            $task->subgroup = $task->category ? $task->category->name : null;
            
            return $task;
        });

        return response()->json($tasks);
    }

    public function startWork(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Автогенерация первичных тасков или выдача для текущего дня
        $tasks = $this->taskService->autoAssignTasksForCurrentDay($user);

        return response()->json([
            'message' => 'Tasks assigned successfully',
            'tasks' => $tasks,
            'current_work_day' => $user->fresh()->getCurrentWorkDay(),
        ]);
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что таск принадлежит текущему пользователю (напрямую или через TaskAssignment)
        if (!$task->isAssignedTo($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($task->load(['category', 'template', 'assignments']));
    }

    public function start(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что таск принадлежит текущему пользователю (напрямую или через TaskAssignment)
        if (!$task->isAssignedTo($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($task->status !== 'pending') {
            return response()->json(['message' => 'Task cannot be started'], 400);
        }

        $task->update([
            'status' => 'in_progress',
        ]);
        
        // Обновляем started_at в TaskAssignment, если есть
        $assignment = $task->assignments()->where('assigned_to', $user->id)->first();
        if ($assignment && !$assignment->started_at) {
            $assignment->update(['started_at' => now()]);
        }

        return response()->json($task->fresh()->load(['category', 'template', 'assignments']));
    }

    public function complete(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что таск принадлежит текущему пользователю (напрямую или через TaskAssignment)
        if (!$task->isAssignedTo($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($task->status !== 'in_progress') {
            return response()->json(['message' => 'Task must be in progress'], 400);
        }

        $validated = $request->validate([
            'answers' => 'nullable|string',
            'comment' => 'nullable|string',
        ]);

        // Обработка загрузки файлов
        $screenshotPaths = [];
        if ($request->hasFile('screenshots')) {
            $screenshots = $request->file('screenshots');
            
            // Если screenshots - массив файлов
            if (is_array($screenshots)) {
                foreach ($screenshots as $screenshot) {
                    if ($screenshot && $screenshot->isValid()) {
                        $path = $screenshot->store('task-results/screenshots', 'public');
                        $screenshotPaths[] = Storage::url($path);
                    }
                }
            } else {
                // Если одно вложение
                if ($screenshots->isValid()) {
                    $path = $screenshots->store('task-results/screenshots', 'public');
                    $screenshotPaths[] = Storage::url($path);
                }
            }
        }

        $attachmentPaths = [];
        if ($request->hasFile('attachments')) {
            $attachments = $request->file('attachments');
            
            // Если attachments - массив файлов
            if (is_array($attachments)) {
                foreach ($attachments as $attachment) {
                    if ($attachment && $attachment->isValid()) {
                        $path = $attachment->store('task-results/attachments', 'public');
                        $attachmentPaths[] = Storage::url($path);
                    }
                }
            } else {
                // Если одно вложение
                if ($attachments->isValid()) {
                    $path = $attachments->store('task-results/attachments', 'public');
                    $attachmentPaths[] = Storage::url($path);
                }
            }
        }

        DB::beginTransaction();
        try {
            // Обновляем статус таска
            $task->update([
                'status' => 'completed_by_moderator',
                'completed_at' => now(),
            ]);
            
            // Обновляем completed_at в TaskAssignment, если есть
            $assignment = $task->assignments()->where('assigned_to', $user->id)->first();
            if ($assignment && !$assignment->completed_at) {
                $assignment->update(['completed_at' => now()]);
            }

            // Создаем или обновляем результат таска
            TaskResult::updateOrCreate(
                ['task_id' => $task->id],
                [
                    'moderator_id' => $user->id,
                    'answers' => $validated['answers'] ?? null,
                    'screenshots' => !empty($screenshotPaths) ? $screenshotPaths : null,
                    'attachments' => !empty($attachmentPaths) ? $attachmentPaths : null,
                    'moderator_comment' => $validated['comment'] ?? null,
                ]
            );

            // Меняем статус на "на проверке у админа"
            $task->update(['status' => 'under_admin_review']);

            DB::commit();

            return response()->json($task->fresh()->load(['category', 'template', 'assignments', 'result']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error completing task: ' . $e->getMessage()], 500);
        }
    }

    public function getCurrentWorkDay(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'work_start_date' => $user->work_start_date,
            'current_work_day' => $user->getCurrentWorkDay(),
            'timezone' => $user->timezone,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Количество выполненных тасков (approved)
        $completedTasks = Task::where('assigned_to', $user->id)
            ->where('status', 'approved')
            ->count();

        // Общее количество тасков
        $totalTasks = Task::where('assigned_to', $user->id)
            ->whereIn('status', ['approved', 'rejected', 'completed_by_moderator', 'under_admin_review', 'sent_for_revision'])
            ->count();

        // Процент успешно выполненных
        $successRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

        // Количество проработанных дней
        $workDays = $user->work_start_date 
            ? max(1, now($user->timezone ?? 'UTC')->diffInDays($user->work_start_date) + 1)
            : 0;

        // Сумма заработанных денег
        $totalEarnings = ModeratorEarning::where('moderator_id', $user->id)
            ->sum('amount');

        return response()->json([
            'completed_tasks' => $completedTasks,
            'total_tasks' => $totalTasks,
            'success_rate' => $successRate,
            'work_days' => $workDays,
            'work_start_date' => $user->work_start_date,
            'timezone' => $user->timezone ?? 'UTC',
            'total_earnings' => number_format($totalEarnings, 2, '.', ''),
        ]);
    }
}

