<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskResult;
use App\Models\ModeratorEarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json(['message' => 'User domain not set'], 400);
        }

        $query = Task::where('domain_id', $user->domain_id)
            ->with(['category', 'template', 'assignedUser', 'result']);

        if ($request->has('status')) {
            $status = $request->status;
            // Если статус содержит запятую, это множественный статус
            if (strpos($status, ',') !== false) {
                $statuses = array_map('trim', explode(',', $status));
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $tasks = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($tasks);
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->load([
            'category', 
            'template', 
            'assignedUser', 
            'result.moderator',
            'result' => function($query) {
                $query->with('moderator');
            }
        ]);

        // Форматируем результат для удобного отображения
        if ($task->result) {
            $result = $task->result;
            // Парсим answers если это JSON строка
            if (is_string($result->answers)) {
                try {
                    $result->answers = json_decode($result->answers, true);
                } catch (\Exception $e) {
                    // Оставляем как строку, если не JSON
                }
            }
        }

        return response()->json($task);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json(['message' => 'User domain not set'], 400);
        }

        $validated = $request->validate([
            'template_id' => 'nullable|exists:task_templates,id',
            'category_id' => 'required|exists:task_categories,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'completion_hours' => 'required|integer|min:1',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'due_at' => 'nullable|date',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer',
            'is_main_task' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // Если устанавливаем как main task, снимаем флаг с других задач
            if (!empty($validated['is_main_task'])) {
                Task::where('domain_id', $user->domain_id)
                    ->where('is_main_task', true)
                    ->update(['is_main_task' => false]);
            }

            $task = Task::create([
                'domain_id' => $user->domain_id,
                'assigned_at' => $validated['assigned_to'] ? now() : null,
                ...$validated,
            ]);

            DB::commit();

            return response()->json($task->load(['category', 'template', 'assignedUser']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating task: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'template_id' => 'nullable|exists:task_templates,id',
            'category_id' => 'sometimes|exists:task_categories,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'completion_hours' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'due_at' => 'nullable|date',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer',
            'is_main_task' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // Если устанавливаем как main task, снимаем флаг с других задач
            if (isset($validated['is_main_task']) && $validated['is_main_task'] && !$task->is_main_task) {
                Task::where('domain_id', $user->domain_id)
                    ->where('is_main_task', true)
                    ->where('id', '!=', $task->id)
                    ->update(['is_main_task' => false]);
            }

            $task->update($validated);

            DB::commit();

            return response()->json($task->fresh()->load(['category', 'template', 'assignedUser', 'result']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating task: ' . $e->getMessage()], 500);
        }
    }

    public function moderateResult(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject,revision',
            'comment' => 'nullable|string',
        ]);

        $result = $task->result;
        if (!$result) {
            return response()->json(['message' => 'Task result not found'], 404);
        }

        DB::beginTransaction();
        try {
            // Обновляем статус таска
            $newStatus = match($validated['action']) {
                'approve' => 'approved',
                'reject' => 'rejected',
                'revision' => 'sent_for_revision',
            };

            $task->update([
                'status' => $newStatus,
            ]);

            // Сохраняем комментарий админа
            if (isset($validated['comment'])) {
                $result->update([
                    'admin_comment' => $validated['comment'],
                ]);
            }

            // Если таск одобрен, начисляем зарплату
            if ($validated['action'] === 'approve') {
                ModeratorEarning::create([
                    'moderator_id' => $task->assigned_to,
                    'task_id' => $task->id,
                    'amount' => $task->price,
                    'earned_at' => now(),
                    'notes' => 'Task approved: ' . $task->title,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Task moderated successfully',
                'task' => $task->fresh()->load(['category', 'template', 'assignedUser', 'result']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error moderating task: ' . $e->getMessage()], 500);
        }
    }
}
