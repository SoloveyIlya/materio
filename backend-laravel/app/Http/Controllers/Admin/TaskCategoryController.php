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
        $domainId = $request->user()->domain_id;
        
        $categories = TaskCategory::where('domain_id', $domainId)
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:task_categories,slug',
            'description' => 'nullable|string',
        ]);

        $category = TaskCategory::create([
            'domain_id' => $request->user()->domain_id,
            ...$validated,
        ]);

        return response()->json($category, 201);
    }

    public function show(TaskCategory $taskCategory): JsonResponse
    {
        return response()->json($taskCategory);
    }

    public function update(Request $request, TaskCategory $taskCategory): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:task_categories,slug,' . $taskCategory->id,
            'description' => 'nullable|string',
        ]);

        $taskCategory->update($validated);

        return response()->json($taskCategory);
    }

    public function destroy(TaskCategory $taskCategory): JsonResponse
    {
        $taskCategory->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }
}

