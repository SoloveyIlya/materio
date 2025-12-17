<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\DocumentationCategory;
use App\Models\DocumentationPage;
use Illuminate\Http\Request;

class DocumentationController extends Controller
{
    public function categories(Request $request)
    {
        $categories = DocumentationCategory::with([
            'parent', 
            'children',
            'pages' => function ($query) {
                $query->where('is_published', true)->orderBy('order');
            }
        ])
            ->where('domain_id', $request->user()->domain_id)
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();

        return response()->json($categories);
    }

    public function category(Request $request, DocumentationCategory $category)
    {
        if ($category->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $category->load(['parent', 'children', 'pages' => function ($query) {
            $query->where('is_published', true)->orderBy('order');
        }]);

        return response()->json($category);
    }

    public function page(Request $request, DocumentationPage $page)
    {
        if ($page->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$page->is_published) {
            return response()->json(['message' => 'Page not published'], 404);
        }

        $page->load(['category', 'category.parent']);

        return response()->json($page);
    }
}
