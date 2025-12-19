<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TrainingQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingQuestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = TrainingQuestion::where('domain_id', $user->domain_id)
            ->with(['moderator', 'task', 'answeredBy']);

        if ($request->has('moderator_id')) {
            $query->where('moderator_id', $request->moderator_id);
        }

        if ($request->has('resolved')) {
            $query->where('is_resolved', $request->boolean('resolved'));
        }

        $questions = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($questions);
    }

    public function answer(Request $request, TrainingQuestion $question): JsonResponse
    {
        $user = $request->user();

        if ($question->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'answer' => 'required|string|max:2000',
        ]);

        $question->update([
            'answer' => $validated['answer'],
            'answered_by' => $user->id,
            'answered_at' => now(),
            'is_resolved' => true,
        ]);

        return response()->json($question->load(['moderator', 'task', 'answeredBy']));
    }

    public function markResolved(TrainingQuestion $question, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($question->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $question->update([
            'is_resolved' => true,
        ]);

        return response()->json($question->load(['moderator', 'task', 'answeredBy']));
    }
}
