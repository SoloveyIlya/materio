<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentationCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentationCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = DocumentationCategory::with(['parent', 'children'])
            ->where('domain_id', $request->user()->domain_id);

        // Фильтр по родительской категории (null = корневые категории)
        if ($request->has('parent_id')) {
            if ($request->parent_id === 'null' || $request->parent_id === null) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        $categories = $query->orderBy('order')->get();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:documentation_categories,id',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['slug'] = Str::slug($validated['name']);
        $validated['order'] = $validated['order'] ?? 0;

        // Проверка уникальности slug в рамках домена
        $slugCount = DocumentationCategory::where('domain_id', $validated['domain_id'])
            ->where('slug', $validated['slug'])
            ->count();
        
        if ($slugCount > 0) {
            $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
        }

        $category = DocumentationCategory::create($validated);

        return response()->json($category->load(['parent', 'children']), 201);
    }

    public function show(Request $request, DocumentationCategory $documentationCategory)
    {
        if ($documentationCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        return response()->json($documentationCategory->load(['parent', 'children', 'pages']));
    }

    public function update(Request $request, DocumentationCategory $documentationCategory)
    {
        if ($documentationCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'parent_id' => [
                'nullable',
                'exists:documentation_categories,id',
                function ($attribute, $value, $fail) use ($documentationCategory) {
                    if ($value == $documentationCategory->id) {
                        $fail('Категория не может быть родителем самой себя.');
                    }
                },
            ],
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $documentationCategory->name) {
            $validated['slug'] = Str::slug($validated['name']);
            
            // Проверка уникальности slug
            $slugCount = DocumentationCategory::where('domain_id', $documentationCategory->domain_id)
                ->where('slug', $validated['slug'])
                ->where('id', '!=', $documentationCategory->id)
                ->count();
            
            if ($slugCount > 0) {
                $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
            }
        }

        $documentationCategory->update($validated);

        return response()->json($documentationCategory->load(['parent', 'children']));
    }

    public function destroy(Request $request, DocumentationCategory $documentationCategory)
    {
        if ($documentationCategory->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        $documentationCategory->delete();

        return response()->json(null, 204);
    }
}
