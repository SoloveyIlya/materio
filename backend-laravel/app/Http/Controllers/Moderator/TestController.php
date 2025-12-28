<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestResult;
use App\Models\TestAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        // Определяем, прошел ли тест (обычно >= 70%, но можно настроить)
        $passingPercentage = 70; // Можно вынести в настройки теста
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

        return response()->json([
            'message' => 'Test submitted successfully',
            'result' => $testResult,
            'score' => $correctAnswers,
            'total' => $totalQuestions,
            'percentage' => $percentage,
            'is_passed' => $isPassed,
        ], 201);
    }
}

