<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskCategory;
use App\Models\TrainingQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Получаем задачи с категорией Test
        $testCategory = TaskCategory::where('domain_id', $user->domain_id)
            ->where('name', 'Test')
            ->first();

        if (!$testCategory) {
            return response()->json([
                'tasks' => [],
                'recommendations' => [],
            ]);
        }

        $query = Task::where('category_id', $testCategory->id)
            ->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                      $assignmentQuery->where('assigned_to', $user->id);
                  });
            })
            ->with(['category', 'template', 'result']);

        $tasks = $query->orderBy('created_at', 'desc')->get();

        // Recommendations before tests
        $recommendations = [
            'Read the instructions carefully',
            'Check all task requirements',
            'Use the provided guides',
            'Take screenshots at each step',
        ];

        return response()->json([
            'tasks' => $tasks,
            'recommendations' => $recommendations,
        ]);
    }

    public function questions(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = TrainingQuestion::where('domain_id', $user->domain_id)
            ->where('moderator_id', $user->id)
            ->with(['task', 'answeredBy']);

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        if ($request->has('resolved')) {
            $query->where('is_resolved', $request->boolean('resolved'));
        }

        $questions = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'questions' => $questions,
        ]);
    }

    public function storeQuestion(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'question' => 'required|string|max:1000',
            'task_id' => 'nullable|exists:tasks,id',
        ]);

        // Проверяем, что таск принадлежит модератору, если указан
        if (isset($validated['task_id'])) {
            $task = Task::find($validated['task_id']);
            if (!$task || !$task->isAssignedTo($user->id)) {
                return response()->json(['message' => 'Task not found or not assigned to you'], 403);
            }
        }

        $question = TrainingQuestion::create([
            'domain_id' => $user->domain_id,
            'moderator_id' => $user->id,
            'task_id' => $validated['task_id'] ?? null,
            'question' => $validated['question'],
        ]);

        return response()->json($question->load(['task', 'answeredBy']), 201);
    }
}
