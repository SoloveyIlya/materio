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
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        
        // Получаем задачи из домена модератора
        // Модератор видит только задачи, назначенные ему (assigned_to = user->id)
        $query = Task::where('domain_id', $user->domain_id)
            ->where('assigned_to', $user->id) // Только назначенные модератору задачи
            ->with(['categories', 'template', 'assignments', 'result', 'assignedUser']);

        // Фильтрация по группе статусов для модератора
        if ($request->has('group')) {
            $group = $request->get('group');
            switch ($group) {
                case 'waiting': // Ожидают - задачи со статусом pending, назначенные модератору
                    $query->where('status', 'pending');
                    break;
                case 'in_work': // В работе - только задачи, которые взял этот модератор
                    $query->where('status', 'in_progress');
                    break;
                case 'history': // История - только задачи, которые выполнил этот модератор
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
            $query->whereHas('categories', function ($q) {
                $q->where('name', 'Test');
            });
        }

        if ($request->has('work_day')) {
            $query->where('work_day', $request->work_day);
        }

        $tasks = $query->orderBy('assigned_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Добавляем информацию о дедлайне и таймере, а также категорию и подгруппу
        $tasks = $tasks->map(function ($task) use ($user) {
            // Таймер обратного отсчёта до дедлайна (в секундах)
            $task->deadline_timer = $task->due_at 
                ? now($user->timezone ?? 'UTC')->diffInSeconds($task->due_at, false) 
                : null;
            
            // Убеждаемся, что категории загружены
            if (!$task->relationLoaded('categories')) {
                $task->load('categories');
            }
            
            // Подгруппа - это название первой категории (или можно использовать slug)
            $task->subgroup = $task->categories->first() ? $task->categories->first()->name : null;
            
            return $task;
        });

        return response()->json($tasks);
    }

    public function startWork(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, есть ли настройки для планирования тасков
        $profile = $user->moderatorProfile;
        
        if ($profile && $profile->task_timezone && $profile->task_start_time && $profile->task_end_time) {
            // Если есть настройки, планируем таски первого дня (через расписание)
            $scheduledTasks = $this->taskService->scheduleFirstDayTasks($user);

            return response()->json([
                'message' => 'Tasks scheduled successfully',
                'scheduled_tasks' => array_map(function ($item) {
                    return [
                        'task' => $item['task'],
                        'scheduled_at' => $item['scheduled_at']->toDateTimeString(),
                    ];
                }, $scheduledTasks),
                'current_work_day' => $user->fresh()->getCurrentWorkDay(),
            ]);
        } else {
            // Новое поведение: если у модератора нет настроек, таски не выдаются автоматически.
            // Таски появятся только если админ отправит их (через создание TaskSchedule / отправку).
            return response()->json([
                'message' => 'No tasks assigned. Tasks are delivered only when admin sends them.',
                'tasks' => [],
                'current_work_day' => $user->fresh()->getCurrentWorkDay(),
            ]);
        }
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Для pending задач - любой модератор может просматривать
        // Для других статусов - только назначенный модератор
        if ($task->status !== 'pending' && $task->assigned_to !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($task->load(['categories', 'template', 'assignments', 'documentations', 'tools', 'result', 'assignedUser']));
    }

    public function start(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Запрещаем запуск задач со статусом "test_passed"
        if ($task->status === 'test_passed') {
            return response()->json(['message' => 'Task cannot be started. Test has already been passed.'], 400);
        }

        if ($task->status !== 'pending') {
            return response()->json(['message' => 'Task cannot be started. Only pending tasks can be claimed.'], 400);
        }

        // Проверяем, не взята ли уже задача другим модератором
        if ($task->assigned_to && $task->assigned_to !== $user->id) {
            return response()->json(['message' => 'Task is already assigned to another moderator'], 400);
        }

        // Модератор "откликается" на задачу - назначаем её ему
        $task->update([
            'status' => 'in_progress',
            'assigned_to' => $user->id,
            'assigned_at' => now(),
        ]);
        
        // Обновляем started_at в TaskAssignment, если есть
        $assignment = $task->assignments()->where('assigned_to', $user->id)->first();
        if ($assignment && !$assignment->started_at) {
            $assignment->update(['started_at' => now()]);
        }

        return response()->json($task->fresh()->load(['categories', 'template', 'assignments', 'assignedUser']));
    }

    public function complete(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене и назначена этому модератору
        if ($task->domain_id !== $user->domain_id || $task->assigned_to !== $user->id) {
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
        // Обрабатываем файлы screenshots (могут быть отправлены как массив screenshots[0], screenshots[1] и т.д.)
        $allFiles = $request->allFiles();
        if (isset($allFiles['screenshots']) && is_array($allFiles['screenshots'])) {
            foreach ($allFiles['screenshots'] as $screenshot) {
                if ($screenshot && $screenshot->isValid()) {
                    $path = $screenshot->store('task-results/screenshots', 'public');
                    $screenshotPaths[] = Storage::url($path);
                }
            }
        }

        $attachmentPaths = [];
        // Обрабатываем файлы attachments (могут быть отправлены как массив attachments[0], attachments[1] и т.д.)
        if (isset($allFiles['attachments']) && is_array($allFiles['attachments'])) {
            foreach ($allFiles['attachments'] as $attachment) {
                if ($attachment && $attachment->isValid()) {
                    $path = $attachment->store('task-results/attachments', 'public');
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

            return response()->json($task->fresh()->load(['categories', 'template', 'assignments', 'result']));
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

    public function createReport(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене и назначена этому модератору
        if ($task->domain_id !== $user->domain_id || $task->assigned_to !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'text' => 'required|string',
        ]);

        // Обработка загрузки файлов
        $filePaths = [];
        if ($request->hasFile('files')) {
            $files = $request->file('files');
            
            if (is_array($files)) {
                foreach ($files as $file) {
                    if ($file && $file->isValid()) {
                        $path = $file->store('task-reports', 'public');
                        $filePaths[] = Storage::url($path);
                    }
                }
            } else {
                if ($files->isValid()) {
                    $path = $files->store('task-reports', 'public');
                    $filePaths[] = Storage::url($path);
                }
            }
        }

        // Здесь можно создать модель TaskReport или добавить в TaskResult
        // Для простоты, добавим в комментарий модератора или создадим отдельную запись
        // Пока сохраним в TaskResult как расширение
        
        DB::beginTransaction();
        try {
            $result = $task->result;
            if ($result) {
                // Если результат уже есть, можем добавить отчет
                // Для полной реализации нужна отдельная таблица TaskReport
            }

            // Простое решение - сохранить в TaskResult или создать новую запись
            // TODO: Создать таблицу task_reports для хранения отчетов
            
            DB::commit();

            return response()->json([
                'message' => 'Report created successfully',
                'files' => $filePaths,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating report: ' . $e->getMessage()], 500);
        }
    }

    public function updateToolData(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Unauthorized: wrong domain'], 403);
        }

        // Проверяем доступ:
        // 1. Для pending задач - любой модератор может редактировать
        // 2. Для in_progress и sent_for_revision задач - только назначенный модератор может редактировать
        // 3. Для других статусов - только назначенный модератор (если задача была назначена ему)
        if ($task->status === 'pending') {
            // Любой модератор может редактировать pending задачи
        } elseif (in_array($task->status, ['in_progress', 'sent_for_revision'])) {
            // Для in_progress и sent_for_revision задач нужна проверка назначения
            // Используем сравнение с приведением типов для надежности
            if ((int)$task->assigned_to !== (int)$user->id) {
                return response()->json([
                    'message' => 'Unauthorized: task is assigned to another moderator',
                    'task_status' => $task->status,
                    'task_assigned_to' => $task->assigned_to,
                    'user_id' => $user->id
                ], 403);
            }
        } else {
            // Для других статусов - только если назначена этому модератору
            if ((int)$task->assigned_to !== (int)$user->id) {
                return response()->json([
                    'message' => 'Unauthorized: task status does not allow editing',
                    'task_status' => $task->status,
                    'task_assigned_to' => $task->assigned_to,
                    'user_id' => $user->id
                ], 403);
            }
        }

        $validated = $request->validate([
            'tool_id' => 'required|integer',
            'description' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Получаем или создаем результат задачи
            $result = TaskResult::firstOrCreate(
                ['task_id' => $task->id],
                ['moderator_id' => $user->id]
            );

            // Получаем текущие данные по тулзам
            $toolData = $result->tool_data ?? [];
            
            // Ищем существующую запись для этого тулза
            $existingIndex = false;
            if (!empty($toolData) && is_array($toolData)) {
                foreach ($toolData as $index => $tool) {
                    if (isset($tool['tool_id']) && $tool['tool_id'] == $validated['tool_id']) {
                        $existingIndex = $index;
                        break;
                    }
                }
            }
            
            if ($existingIndex !== false) {
                // Обновляем существующую запись
                $toolData[$existingIndex]['description'] = $validated['description'] ?? '';
            } else {
                // Добавляем новую запись
                $toolData[] = [
                    'tool_id' => $validated['tool_id'],
                    'description' => $validated['description'] ?? '',
                ];
            }

            // Сохраняем обновленные данные
            $result->update(['tool_data' => $toolData]);

            DB::commit();

            return response()->json([
                'message' => 'Tool data updated successfully',
                'result' => $result->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating tool data: ' . $e->getMessage()], 500);
        }
    }

    public function updateAdditionalInfo(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Проверяем, что задача в том же домене
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Unauthorized: wrong domain'], 403);
        }

        // Проверяем доступ:
        // 1. Для pending задач - любой модератор может редактировать
        // 2. Для in_progress и sent_for_revision задач - только назначенный модератор может редактировать
        // 3. Для других статусов - только назначенный модератор (если задача была назначена ему)
        if ($task->status === 'pending') {
            // Любой модератор может редактировать pending задачи
        } elseif (in_array($task->status, ['in_progress', 'sent_for_revision'])) {
            // Для in_progress и sent_for_revision задач нужна проверка назначения
            // Используем сравнение с приведением типов для надежности
            if ((int)$task->assigned_to !== (int)$user->id) {
                return response()->json([
                    'message' => 'Unauthorized: task is assigned to another moderator',
                    'task_status' => $task->status,
                    'task_assigned_to' => $task->assigned_to,
                    'user_id' => $user->id
                ], 403);
            }
        } else {
            // Для других статусов - только если назначена этому модератору
            if ((int)$task->assigned_to !== (int)$user->id) {
                return response()->json([
                    'message' => 'Unauthorized: task status does not allow editing',
                    'task_status' => $task->status,
                    'task_assigned_to' => $task->assigned_to,
                    'user_id' => $user->id
                ], 403);
            }
        }

        $validated = $request->validate([
            'additional_info' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Получаем или создаем результат задачи
            $result = TaskResult::firstOrCreate(
                ['task_id' => $task->id],
                ['moderator_id' => $user->id]
            );

            // Обновляем дополнительную информацию
            $result->update(['additional_info' => $validated['additional_info'] ?? null]);

            DB::commit();

            return response()->json([
                'message' => 'Additional info updated successfully',
                'result' => $result->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating additional info: ' . $e->getMessage()], 500);
        }
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

