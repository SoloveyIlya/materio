<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskCategory;
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

        // Рекомендации перед тестами (можно расширить)
        $recommendations = [
            'Внимательно прочитайте инструкции',
            'Проверьте все требования к задаче',
            'Используйте предоставленные гайды',
            'Делайте скриншоты на каждом этапе',
        ];

        return response()->json([
            'tasks' => $tasks,
            'recommendations' => $recommendations,
        ]);
    }

    public function questions(Request $request): JsonResponse
    {
        // Здесь можно добавить систему вопросов/ответов для Training center
        // Пока возвращаем пустой массив
        return response()->json([
            'questions' => [],
        ]);
    }
}
