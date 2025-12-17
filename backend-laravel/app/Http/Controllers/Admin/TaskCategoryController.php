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
        if ($taskCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:task_categories,slug,' . $taskCategory->id,
            'description' => 'nullable|string',
        ]);

        $taskCategory->update($validated);

        return response()->json($taskCategory);
    }

    public function destroy(Request $request, TaskCategory $taskCategory): JsonResponse
    {
        if ($taskCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        $taskCategory->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }
}

