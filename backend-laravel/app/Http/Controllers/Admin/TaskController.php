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
            $query->where('status', $request->status);
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

        $task->load(['category', 'template', 'assignedUser', 'result.moderator']);

        return response()->json($task);
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
