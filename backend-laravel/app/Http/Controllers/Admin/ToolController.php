<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tool;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ToolController extends Controller
{
    public function index(Request $request)
    {
        $query = Tool::with('guide')
            ->where('domain_id', $request->user()->domain_id);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $tools = $query->orderBy('name')->get();

        return response()->json($tools);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url' => 'nullable|url',
            'guide_id' => 'nullable|exists:documentation_pages,id',
            'is_active' => 'nullable|boolean',
        ]);

        // Преобразуем boolean значения и очищаем пустые строки
        if (isset($validated['guide_id']) && $validated['guide_id'] === '') {
            $validated['guide_id'] = null;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);
        }

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['slug'] = Str::slug($validated['name']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        // Проверка уникальности slug
        $slugCount = Tool::where('domain_id', $validated['domain_id'])
            ->where('slug', $validated['slug'])
            ->count();
        
        if ($slugCount > 0) {
            $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
        }

        $tool = Tool::create($validated);

        return response()->json($tool->load('guide'), 201);
    }

    public function show(Request $request, Tool $tool)
    {
        if ($tool->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        return response()->json($tool->load('guide'));
    }

    public function update(Request $request, Tool $tool)
    {
        if ($tool->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'url' => 'nullable|url',
            'guide_id' => 'nullable|exists:documentation_pages,id',
            'is_active' => 'nullable|boolean',
        ]);

        // Преобразуем boolean значения и очищаем пустые строки
        if (isset($validated['guide_id']) && $validated['guide_id'] === '') {
            $validated['guide_id'] = null;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);
        }

        if (isset($validated['name']) && $validated['name'] !== $tool->name) {
            $validated['slug'] = Str::slug($validated['name']);
            
            $slugCount = Tool::where('domain_id', $tool->domain_id)
                ->where('slug', $validated['slug'])
                ->where('id', '!=', $tool->id)
                ->count();
            
            if ($slugCount > 0) {
                $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
            }
        }

        $tool->update($validated);

        return response()->json($tool->load('guide'));
    }

    public function destroy(Request $request, Tool $tool)
    {
        if ($tool->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        $tool->delete();

        return response()->json(null, 204);
    }
}
