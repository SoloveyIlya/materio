<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentationPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentationPageController extends Controller
{
    public function index(Request $request)
    {
        $query = DocumentationPage::with(['category', 'category.parent'])
            ->where('domain_id', $request->user()->domain_id);

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $pages = $query->orderBy('order')->get();

        return response()->json($pages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:documentation_categories,id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|image|max:10240', // 10MB max
            'videos' => 'nullable|array',
            'videos.*.type' => 'required_with:videos.*|in:local,embed',
            'videos.*.url' => 'required_with:videos.*',
            'videos.*.file' => 'required_if:videos.*.type,local|file|mimes:mp4,webm,ogg|max:102400', // 100MB max
            'related_task_categories' => 'nullable|array',
            'related_task_categories.*' => 'exists:task_categories,id',
            'related_tasks' => 'nullable|array',
            'related_tasks.*' => 'exists:tasks,id',
            'order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['slug'] = Str::slug($validated['title']);
        $validated['order'] = $validated['order'] ?? 0;
        $validated['is_published'] = $validated['is_published'] ?? false;

        // Обработка загрузки изображений
        if ($request->hasFile('images')) {
            $imagePaths = [];
            $images = $request->file('images');
            
            // Если images - массив
            if (is_array($images)) {
                foreach ($images as $image) {
                    if ($image && $image->isValid()) {
                        $path = $image->store('documentation/images', 'public');
                        $imagePaths[] = Storage::url($path);
                    }
                }
            } else {
                // Если одно изображение
                if ($images->isValid()) {
                    $path = $images->store('documentation/images', 'public');
                    $imagePaths[] = Storage::url($path);
                }
            }
            
            if (!empty($imagePaths)) {
                $validated['images'] = $imagePaths;
            }
        }

        // Обработка видео
        if ($request->has('videos')) {
            $processedVideos = [];
            foreach ($request->input('videos') as $index => $video) {
                if ($video['type'] === 'embed') {
                    // Для embed просто сохраняем URL
                    $processedVideos[] = [
                        'type' => 'embed',
                        'url' => $video['url'],
                    ];
                } elseif ($video['type'] === 'local' && $request->hasFile("videos.{$index}.file")) {
                    // Для локальных видео загружаем файл
                    $videoFile = $request->file("videos.{$index}.file");
                    $path = $videoFile->store('documentation/videos', 'public');
                    $processedVideos[] = [
                        'type' => 'local',
                        'url' => Storage::url($path),
                    ];
                }
            }
            $validated['videos'] = $processedVideos;
        }

        // Проверка уникальности slug
        $slugCount = DocumentationPage::where('domain_id', $validated['domain_id'])
            ->where('slug', $validated['slug'])
            ->count();
        
        if ($slugCount > 0) {
            $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
        }

        $page = DocumentationPage::create($validated);

        return response()->json($page->load(['category']), 201);
    }

    public function show(Request $request, DocumentationPage $documentationPage)
    {
        if ($documentationPage->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        return response()->json($documentationPage->load(['category', 'category.parent']));
    }

    public function update(Request $request, DocumentationPage $documentationPage)
    {
        if ($documentationPage->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:documentation_categories,id',
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|image|max:10240',
            'videos' => 'nullable|array',
            'videos.*.type' => 'required_with:videos.*|in:local,embed',
            'videos.*.url' => 'required_with:videos.*',
            'videos.*.file' => 'required_if:videos.*.type,local|file|mimes:mp4,webm,ogg|max:102400',
            'related_task_categories' => 'nullable|array',
            'related_task_categories.*' => 'exists:task_categories,id',
            'related_tasks' => 'nullable|array',
            'related_tasks.*' => 'exists:tasks,id',
            'order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        // Преобразуем boolean значения
        if (isset($validated['is_published'])) {
            $validated['is_published'] = filter_var($validated['is_published'], FILTER_VALIDATE_BOOLEAN);
        }

        // Обновление slug если изменился title
        if (isset($validated['title']) && $validated['title'] !== $documentationPage->title) {
            $validated['slug'] = Str::slug($validated['title']);
            
            $slugCount = DocumentationPage::where('domain_id', $documentationPage->domain_id)
                ->where('slug', $validated['slug'])
                ->where('id', '!=', $documentationPage->id)
                ->count();
            
            if ($slugCount > 0) {
                $validated['slug'] = $validated['slug'] . '-' . ($slugCount + 1);
            }
        }

        // Обработка загрузки новых изображений
        if ($request->hasFile('images')) {
            $existingImages = $documentationPage->images ?? [];
            $newImagePaths = [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('documentation/images', 'public');
                $newImagePaths[] = Storage::url($path);
            }
            $validated['images'] = array_merge($existingImages, $newImagePaths);
        }

        // Обработка видео аналогично
        if ($request->has('videos')) {
            $processedVideos = [];
            foreach ($request->input('videos') as $index => $video) {
                if ($video['type'] === 'embed') {
                    $processedVideos[] = [
                        'type' => 'embed',
                        'url' => $video['url'],
                    ];
                } elseif ($video['type'] === 'local' && $request->hasFile("videos.{$index}.file")) {
                    $videoFile = $request->file("videos.{$index}.file");
                    $path = $videoFile->store('documentation/videos', 'public');
                    $processedVideos[] = [
                        'type' => 'local',
                        'url' => Storage::url($path),
                    ];
                }
            }
            $validated['videos'] = $processedVideos;
        }

        $documentationPage->update($validated);

        return response()->json($documentationPage->load(['category']));
    }

    public function destroy(Request $request, DocumentationPage $documentationPage)
    {
        if ($documentationPage->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Удаление связанных файлов
        if ($documentationPage->images) {
            foreach ($documentationPage->images as $imagePath) {
                $relativePath = str_replace('/storage/', '', parse_url($imagePath, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
        }

        if ($documentationPage->videos) {
            foreach ($documentationPage->videos as $video) {
                if ($video['type'] === 'local') {
                    $relativePath = str_replace('/storage/', '', parse_url($video['url'], PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
            }
        }

        $documentationPage->delete();

        return response()->json(null, 204);
    }
}
