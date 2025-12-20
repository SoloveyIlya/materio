<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestQuestion;
use App\Models\TestAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TestController extends Controller
{
    public function index(Request $request)
    {
        $query = Test::with(['level', 'questions.answers'])
            ->where('domain_id', $request->user()->domain_id);

        if ($request->has('level_id')) {
            $query->where('level_id', $request->level_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $tests = $query->orderBy('order')->get();

        return response()->json($tests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'level_id' => 'nullable|exists:test_levels,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|file|image|max:10240',
            'duration_minutes' => 'required|integer|min:1',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'questions' => 'nullable|array',
            'questions.*.question' => 'required|string',
            'questions.*.image' => 'nullable|file|image|max:10240',
            'questions.*.video' => 'nullable|string',
            'questions.*.order' => 'nullable|integer|min:0',
            'questions.*.answers' => 'required|array|min:2',
            'questions.*.answers.*.answer' => 'required|string',
            'questions.*.answers.*.is_correct' => 'required|boolean',
            'questions.*.answers.*.order' => 'nullable|integer|min:0',
        ]);

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['order'] = $validated['order'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;

        // Обработка загрузки изображения
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('tests/images', 'public');
            $validated['image'] = Storage::url($path);
        }

        // Сохраняем вопросы отдельно
        $questions = $validated['questions'] ?? [];
        unset($validated['questions']);

        $test = Test::create($validated);

        // Создаем вопросы и ответы
        foreach ($questions as $questionIndex => $questionData) {
            $questionImage = null;
            if ($request->hasFile("questions.{$questionIndex}.image")) {
                $path = $request->file("questions.{$questionIndex}.image")->store('tests/questions/images', 'public');
                $questionImage = Storage::url($path);
            }

            $question = TestQuestion::create([
                'test_id' => $test->id,
                'question' => $questionData['question'],
                'image' => $questionImage,
                'video' => $questionData['video'] ?? null,
                'order' => $questionData['order'] ?? $questionIndex,
            ]);

            // Создаем ответы
            foreach ($questionData['answers'] as $answerIndex => $answerData) {
                TestAnswer::create([
                    'question_id' => $question->id,
                    'answer' => $answerData['answer'],
                    'is_correct' => $answerData['is_correct'],
                    'order' => $answerData['order'] ?? $answerIndex,
                ]);
            }
        }

        return response()->json($test->load(['level', 'questions.answers']), 201);
    }

    public function show(Request $request, Test $test)
    {
        if ($test->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($test->load(['level', 'questions.answers']));
    }

    public function update(Request $request, Test $test)
    {
        if ($test->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'level_id' => 'nullable|exists:test_levels,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|file|image|max:10240',
            'duration_minutes' => 'sometimes|required|integer|min:1',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'questions' => 'nullable|array',
            'questions.*.id' => 'nullable|exists:test_questions,id',
            'questions.*.question' => 'required|string',
            'questions.*.image' => 'nullable|file|image|max:10240',
            'questions.*.video' => 'nullable|string',
            'questions.*.order' => 'nullable|integer|min:0',
            'questions.*.answers' => 'required|array|min:2',
            'questions.*.answers.*.id' => 'nullable|exists:test_answers,id',
            'questions.*.answers.*.answer' => 'required|string',
            'questions.*.answers.*.is_correct' => 'required|boolean',
            'questions.*.answers.*.order' => 'nullable|integer|min:0',
        ]);

        // Обработка загрузки нового изображения
        if ($request->hasFile('image')) {
            // Удаляем старое изображение
            if ($test->image) {
                $relativePath = str_replace('/storage/', '', parse_url($test->image, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
            $path = $request->file('image')->store('tests/images', 'public');
            $validated['image'] = Storage::url($path);
        } else {
            // Сохраняем существующее изображение
            $validated['image'] = $test->image;
        }

        // Сохраняем вопросы отдельно
        $questions = $validated['questions'] ?? [];
        unset($validated['questions']);

        $test->update($validated);

        // Обновляем/создаем/удаляем вопросы
        $existingQuestionIds = [];
        foreach ($questions as $questionIndex => $questionData) {
            $questionImage = $questionData['image'] ?? null;
            
            // Если есть новое изображение
            if ($request->hasFile("questions.{$questionIndex}.image")) {
                // Удаляем старое изображение если есть
                if (isset($questionData['id'])) {
                    $existingQuestion = TestQuestion::find($questionData['id']);
                    if ($existingQuestion && $existingQuestion->image) {
                        $relativePath = str_replace('/storage/', '', parse_url($existingQuestion->image, PHP_URL_PATH));
                        Storage::disk('public')->delete($relativePath);
                    }
                }
                $path = $request->file("questions.{$questionIndex}.image")->store('tests/questions/images', 'public');
                $questionImage = Storage::url($path);
            } elseif (isset($questionData['id'])) {
                // Сохраняем существующее изображение
                $existingQuestion = TestQuestion::find($questionData['id']);
                $questionImage = $existingQuestion->image ?? null;
            }

            if (isset($questionData['id'])) {
                // Обновляем существующий вопрос
                $question = TestQuestion::find($questionData['id']);
                $question->update([
                    'question' => $questionData['question'],
                    'image' => $questionImage,
                    'video' => $questionData['video'] ?? null,
                    'order' => $questionData['order'] ?? $questionIndex,
                ]);
                $existingQuestionIds[] = $question->id;
            } else {
                // Создаем новый вопрос
                $question = TestQuestion::create([
                    'test_id' => $test->id,
                    'question' => $questionData['question'],
                    'image' => $questionImage,
                    'video' => $questionData['video'] ?? null,
                    'order' => $questionData['order'] ?? $questionIndex,
                ]);
                $existingQuestionIds[] = $question->id;
            }

            // Обновляем/создаем/удаляем ответы
            $existingAnswerIds = [];
            foreach ($questionData['answers'] as $answerIndex => $answerData) {
                if (isset($answerData['id'])) {
                    // Обновляем существующий ответ
                    $answer = TestAnswer::find($answerData['id']);
                    $answer->update([
                        'answer' => $answerData['answer'],
                        'is_correct' => $answerData['is_correct'],
                        'order' => $answerData['order'] ?? $answerIndex,
                    ]);
                    $existingAnswerIds[] = $answer->id;
                } else {
                    // Создаем новый ответ
                    $answer = TestAnswer::create([
                        'question_id' => $question->id,
                        'answer' => $answerData['answer'],
                        'is_correct' => $answerData['is_correct'],
                        'order' => $answerData['order'] ?? $answerIndex,
                    ]);
                    $existingAnswerIds[] = $answer->id;
                }
            }

            // Удаляем ответы, которых нет в запросе
            TestAnswer::where('question_id', $question->id)
                ->whereNotIn('id', $existingAnswerIds)
                ->delete();
        }

        // Удаляем вопросы, которых нет в запросе
        TestQuestion::where('test_id', $test->id)
            ->whereNotIn('id', $existingQuestionIds)
            ->delete();

        return response()->json($test->load(['level', 'questions.answers']));
    }

    public function destroy(Request $request, Test $test)
    {
        if ($test->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Удаляем изображение
        if ($test->image) {
            $relativePath = str_replace('/storage/', '', parse_url($test->image, PHP_URL_PATH));
            Storage::disk('public')->delete($relativePath);
        }

        // Удаляем изображения вопросов
        foreach ($test->questions as $question) {
            if ($question->image) {
                $relativePath = str_replace('/storage/', '', parse_url($question->image, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
        }

        $test->delete();

        return response()->json(null, 204);
    }
}
