<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestResult;
use App\Models\TestAnswer;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Test::with(['level', 'questions.answers'])
            ->where('domain_id', $user->domain_id)
            ->where('is_active', true);

        if ($request->has('level_id')) {
            $query->where('level_id', $request->level_id);
        }

        $tests = $query->orderBy('order')->get();

        return response()->json($tests);
    }

    public function show(Request $request, Test $test): JsonResponse
    {
        $user = $request->user();

        // Проверяем, что тест принадлежит домену модератора
        if ($test->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Test not found'], 404);
        }

        // Загружаем тест с вопросами и ответами, отсортированными по order
        $test->load([
            'level',
            'questions' => function ($query) {
                $query->orderBy('order');
            },
            'questions.answers' => function ($query) {
                $query->orderBy('order');
            }
        ]);

        return response()->json($test);
    }
    public function submit(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'test_id' => 'required|exists:tests,id',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:test_questions,id',
            'answers.*.answer_id' => 'nullable|exists:test_answers,id',
            'time_spent' => 'nullable|integer|min:0',
        ]);

        $test = Test::with(['questions.answers'])->findOrFail($validated['test_id']);

        // Проверяем, что тест принадлежит домену модератора
        if ($test->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Test not found'], 404);
        }

        // Проверяем, что тест активен
        if (!$test->is_active) {
            return response()->json(['message' => 'Test is not active'], 400);
        }

        // Подсчитываем результаты
        $totalQuestions = $test->questions->count();
        $correctAnswers = 0;
        $answersData = [];

        foreach ($validated['answers'] as $answerData) {
            $question = $test->questions->find($answerData['question_id']);
            
            if (!$question) {
                continue;
            }

            $selectedAnswerId = $answerData['answer_id'] ?? null;
            $isCorrect = false;

            if ($selectedAnswerId) {
                $selectedAnswer = $question->answers->find($selectedAnswerId);
                if ($selectedAnswer && $selectedAnswer->is_correct) {
                    $isCorrect = true;
                    $correctAnswers++;
                }
            }

            $answersData[] = [
                'question_id' => $question->id,
                'answer_id' => $selectedAnswerId,
                'is_correct' => $isCorrect,
            ];
        }

        // Вычисляем процент
        $percentage = $totalQuestions > 0 ? round(($correctAnswers / $totalQuestions) * 100) : 0;

        // Тест считается пройденным только при 100% правильных ответов
        $passingPercentage = 100;
        $isPassed = $percentage >= $passingPercentage;

        // Проверяем время (если время превышено, тест не засчитывается как пройденный)
        $timeSpent = $validated['time_spent'] ?? 0;
        $allowedTime = $test->duration_minutes * 60; // в секундах
        
        if ($timeSpent > $allowedTime) {
            $isPassed = false;
        }

        // Создаем или обновляем результат теста
        $testResult = TestResult::updateOrCreate(
            [
                'user_id' => $user->id,
                'test_id' => $test->id,
            ],
            [
                'score' => $correctAnswers,
                'total_questions' => $totalQuestions,
                'percentage' => $percentage,
                'answers' => $answersData,
                'completed_at' => now(),
                'is_passed' => $isPassed,
            ]
        );

        // Если тест пройден успешно, обновляем статус задачи с категорией "Test"
        if ($isPassed) {
            DB::transaction(function () use ($user, $test) {
                // Находим задачу с категорией "Test" для этого пользователя
                // которая еще не пройдена (статус "pending" или "in_progress")
                // и связана с этим тестом (по title или другим признакам)
                $task = Task::where('domain_id', $user->domain_id)
                    ->where(function ($query) use ($user) {
                        $query->where('assigned_to', $user->id)
                              ->orWhereNull('assigned_to');
                    })
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->whereHas('categories', function ($q) {
                        $q->where('name', 'Test');
                    })
                    ->first();

                if ($task) {
                    // Обновляем статус задачи на "test_passed" и устанавливаем completed_at
                    $task->update([
                        'status' => 'test_passed',
                        'completed_at' => now(),
                    ]);
                }
            });
        }

        return response()->json([
            'message' => 'Test submitted successfully',
            'result' => $testResult,
            'score' => $correctAnswers,
            'total' => $totalQuestions,
            'percentage' => $percentage,
            'is_passed' => $isPassed,
        ], 201);
    }

    /**
     * Получить статус прохождения всех тестов
     */
    public function allTestsStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        // Получаем все тесты для домена модератора
        $allTests = Test::where('domain_id', $user->domain_id)
            ->where('is_active', true)
            ->get();

        // Получаем результаты тестов пользователя
        $userTestResults = TestResult::where('user_id', $user->id)
            ->where('is_passed', true)
            ->pluck('test_id')
            ->toArray();

        // Проверяем, пройдены ли все тесты
        $allPassed = count($allTests) > 0 && count($userTestResults) === count($allTests);

        return response()->json([
            'all_tests_passed' => $allPassed,
            'total_tests' => count($allTests),
            'passed_tests' => count($userTestResults),
        ]);
    }
}

