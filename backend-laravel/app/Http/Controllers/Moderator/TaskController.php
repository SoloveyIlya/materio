<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            ->with(['category', 'template', 'assignments']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('work_day')) {
            $query->where('work_day', $request->work_day);
        }

        $tasks = $query->orderBy('assigned_at', 'desc')->get();

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

        $task->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        
        // Обновляем completed_at в TaskAssignment, если есть
        $assignment = $task->assignments()->where('assigned_to', $user->id)->first();
        if ($assignment && !$assignment->completed_at) {
            $assignment->update(['completed_at' => now()]);
        }

        return response()->json($task->fresh()->load(['category', 'template', 'assignments']));
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
}

