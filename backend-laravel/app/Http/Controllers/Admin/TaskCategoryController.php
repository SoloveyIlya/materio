<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TaskCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json([
                'message' => 'User domain not set'
            ], 400);
        }
        
        $categories = TaskCategory::where('domain_id', $user->domain_id)
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json([
                'message' => 'User domain not set'
            ], 400);
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:task_categories,slug',
            'description' => 'nullable|string',
        ]);

        $category = TaskCategory::create([
            'domain_id' => $user->domain_id,
            ...$validated,
        ]);

        return response()->json($category, 201);
    }

    public function show(Request $request, TaskCategory $taskCategory): JsonResponse
    {
        if ($taskCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        return response()->json($taskCategory);
    }

    public function update(Request $request, TaskCategory $taskCategory): JsonResponse
    {
        $user = $request->user();
        
        if ($taskCategory->domain_id !== $user->domain_id) {
            \Log::warning('TaskCategory update forbidden', [
                'category_id' => $taskCategory->id,
                'category_domain' => $taskCategory->domain_id,
                'user_domain' => $user->domain_id,
            ]);
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        \Log::info('TaskCategory update request', [
            'category_id' => $taskCategory->id,
            'request_data' => $request->all(),
        ]);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:task_categories,slug,' . $taskCategory->id,
            'description' => 'nullable|string',
        ]);

        $taskCategory->update($validated);

        \Log::info('TaskCategory updated successfully', [
            'category_id' => $taskCategory->id,
            'category_data' => $taskCategory->toArray(),
        ]);

        return response()->json($taskCategory);
    }

    public function destroy(Request $request, TaskCategory $taskCategory): JsonResponse
    {
        $user = $request->user();
        
        if ($taskCategory->domain_id !== $user->domain_id) {
            \Log::warning('TaskCategory delete forbidden', [
                'category_id' => $taskCategory->id,
                'category_domain' => $taskCategory->domain_id,
                'user_domain' => $user->domain_id,
            ]);
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        \Log::info('TaskCategory delete request', [
            'category_id' => $taskCategory->id,
            'category_name' => $taskCategory->name,
        ]);
        
        $taskCategory->delete();

        \Log::info('TaskCategory deleted successfully', [
            'category_id' => $taskCategory->id,
        ]);

        return response()->json(['message' => 'Category deleted successfully']);
    }
}

