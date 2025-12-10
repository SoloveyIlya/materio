<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TaskTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $domainId = $request->user()->domain_id;
        
        $query = TaskTemplate::where('domain_id', $domainId)
            ->with('category');

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('is_primary')) {
            $query->where('is_primary', $request->boolean('is_primary'));
        }

        $templates = $query->orderBy('work_day')->orderBy('title')->get();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:task_categories,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'completion_hours' => 'required|integer|min:1',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer|min:1|max:10',
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $template = TaskTemplate::create([
            'domain_id' => $request->user()->domain_id,
            ...$validated,
        ]);

        return response()->json($template->load('category'), 201);
    }

    public function show(TaskTemplate $taskTemplate): JsonResponse
    {
        return response()->json($taskTemplate->load('category'));
    }

    public function update(Request $request, TaskTemplate $taskTemplate): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:task_categories,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'completion_hours' => 'required|integer|min:1',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer|min:1|max:10',
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $taskTemplate->update($validated);

        return response()->json($taskTemplate->load('category'));
    }

    public function destroy(TaskTemplate $taskTemplate): JsonResponse
    {
        $taskTemplate->delete();

        return response()->json(['message' => 'Template deleted successfully']);
    }
}

