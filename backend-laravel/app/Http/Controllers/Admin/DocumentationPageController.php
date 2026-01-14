<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentationPage;
use App\Models\Tool;
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

        // Загружаем информацию о tools для каждой страницы
        $domainId = $request->user()->domain_id;
        $pages->each(function ($page) use ($domainId) {
            if ($page->tools && is_array($page->tools) && count($page->tools) > 0) {
                $tools = Tool::whereIn('id', $page->tools)
                    ->where('domain_id', $domainId)
                    ->get(['id', 'name', 'slug', 'description', 'url']);
                $page->tools_data = $tools;
            }
        });

        return response()->json($pages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:documentation_categories,id',
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'content_blocks' => 'nullable|string', // JSON string from FormData
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|image|max:10240', // 10MB max
            'videos' => 'nullable|array',
            'videos.*.type' => 'required_with:videos.*|in:local,embed',
            'videos.*.url' => 'required_with:videos.*',
            'videos.*.file' => 'required_if:videos.*.type,local|file|mimes:mp4,webm,ogg|max:102400', // 100MB max
            'tools' => 'nullable|array',
            'tools.*' => 'exists:tools,id',
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
        
        // Convert empty string to null for content
        if (isset($validated['content']) && $validated['content'] === '') {
            $validated['content'] = null;
        }

        // Обработка content_blocks (JSON string)
        $contentBlocks = [];
        if ($request->has('content_blocks')) {
            $contentBlocksJson = $request->input('content_blocks');
            if (is_string($contentBlocksJson)) {
                $contentBlocks = json_decode($contentBlocksJson, true) ?? [];
            } elseif (is_array($contentBlocksJson)) {
                $contentBlocks = $contentBlocksJson;
            }
        }

        // Обработка загрузки изображений
        $uploadedImagePaths = [];
        if ($request->hasFile('images')) {
            $images = $request->file('images');
            
            // Если images - массив
            if (is_array($images)) {
                foreach ($images as $image) {
                    if ($image && $image->isValid()) {
                        $path = $image->store('documentation/images', 'public');
                        $uploadedImagePaths[] = Storage::url($path);
                    }
                }
            } else {
                // Если одно изображение
                if ($images->isValid()) {
                    $path = $images->store('documentation/images', 'public');
                    $uploadedImagePaths[] = Storage::url($path);
                }
            }
        }

        // Обновляем content_blocks с загруженными изображениями
        $imageIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'image' && isset($block['isNew']) && $block['isNew']) {
                if ($imageIndex < count($uploadedImagePaths)) {
                    $block['url'] = $uploadedImagePaths[$imageIndex];
                    unset($block['isNew']);
                    unset($block['file']);
                }
                $imageIndex++;
            }
        }
        unset($block);

        // Сохраняем все URL изображений (из content_blocks и отдельно загруженные)
        $allImagePaths = $uploadedImagePaths;
        foreach ($contentBlocks as $block) {
            if ($block['type'] === 'image' && isset($block['url']) && !in_array($block['url'], $allImagePaths)) {
                $allImagePaths[] = $block['url'];
            }
        }
        if (!empty($allImagePaths)) {
            $validated['images'] = $allImagePaths;
        }

        // Обработка видео
        $processedVideos = [];
        if ($request->has('videos')) {
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
        }

        // Обновляем content_blocks с загруженными видео
        $videoIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'video' && isset($block['isNew']) && $block['isNew']) {
                if ($videoIndex < count($processedVideos)) {
                    $block['videoType'] = $processedVideos[$videoIndex]['type'];
                    $block['url'] = $processedVideos[$videoIndex]['url'];
                    unset($block['isNew']);
                    unset($block['file']);
                }
                $videoIndex++;
            }
        }
        unset($block);

        // Сохраняем все видео
        foreach ($contentBlocks as $block) {
            if ($block['type'] === 'video' && isset($block['url'])) {
                $videoExists = false;
                foreach ($processedVideos as $video) {
                    if ($video['url'] === $block['url']) {
                        $videoExists = true;
                        break;
                    }
                }
                if (!$videoExists) {
                    $processedVideos[] = [
                        'type' => $block['videoType'] ?? 'embed',
                        'url' => $block['url'],
                    ];
                }
            }
        }
        if (!empty($processedVideos)) {
            $validated['videos'] = $processedVideos;
        }

        // Сохраняем content_blocks
        if (!empty($contentBlocks)) {
            $validated['content_blocks'] = $contentBlocks;
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
        
        $documentationPage->load(['category', 'category.parent']);
        
        // Загружаем информацию о tools, если они есть
        if ($documentationPage->tools && is_array($documentationPage->tools) && count($documentationPage->tools) > 0) {
            $tools = Tool::whereIn('id', $documentationPage->tools)
                ->where('domain_id', $request->user()->domain_id)
                ->get(['id', 'name', 'slug', 'description', 'url']);
            $documentationPage->tools_data = $tools;
        }
        
        return response()->json($documentationPage);
    }

    public function update(Request $request, DocumentationPage $documentationPage)
    {
        if ($documentationPage->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:documentation_categories,id',
            'title' => 'sometimes|required|string|max:255',
            'content' => 'nullable|string',
            'content_blocks' => 'nullable|string', // JSON string from FormData
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|image|max:10240',
            'videos' => 'nullable|array',
            'videos.*.type' => 'required_with:videos.*|in:local,embed',
            'videos.*.url' => 'required_with:videos.*',
            'videos.*.file' => 'required_if:videos.*.type,local|file|mimes:mp4,webm,ogg|max:102400',
            'tools' => 'nullable|array',
            'tools.*' => 'exists:tools,id',
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
        
        // Convert empty string to null for content
        if (isset($validated['content']) && $validated['content'] === '') {
            $validated['content'] = null;
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

        // Обработка content_blocks (JSON string)
        $contentBlocks = [];
        if ($request->has('content_blocks')) {
            $contentBlocksJson = $request->input('content_blocks');
            if (is_string($contentBlocksJson)) {
                $contentBlocks = json_decode($contentBlocksJson, true) ?? [];
            } elseif (is_array($contentBlocksJson)) {
                $contentBlocks = $contentBlocksJson;
            }
        } elseif (isset($documentationPage->content_blocks)) {
            // Сохраняем существующие content_blocks если новые не переданы
            $contentBlocks = $documentationPage->content_blocks;
        }

        // Обработка загрузки новых изображений
        $uploadedImagePaths = [];
        if ($request->hasFile('images')) {
            $images = $request->file('images');
            if (is_array($images)) {
                foreach ($images as $image) {
                    if ($image && $image->isValid()) {
                        $path = $image->store('documentation/images', 'public');
                        $uploadedImagePaths[] = Storage::url($path);
                    }
                }
            } else {
                if ($images->isValid()) {
                    $path = $images->store('documentation/images', 'public');
                    $uploadedImagePaths[] = Storage::url($path);
                }
            }
        }

        // Обновляем content_blocks с загруженными изображениями
        $imageIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'image' && isset($block['isNew']) && $block['isNew']) {
                if ($imageIndex < count($uploadedImagePaths)) {
                    $block['url'] = $uploadedImagePaths[$imageIndex];
                    unset($block['isNew']);
                    unset($block['file']);
                }
                $imageIndex++;
            }
        }
        unset($block);

        // Сохраняем все URL изображений
        $existingImages = $documentationPage->images ?? [];
        $allImagePaths = array_merge($existingImages, $uploadedImagePaths);
        foreach ($contentBlocks as $block) {
            if ($block['type'] === 'image' && isset($block['url']) && !in_array($block['url'], $allImagePaths)) {
                $allImagePaths[] = $block['url'];
            }
        }
        if (!empty($allImagePaths) || $request->has('content_blocks')) {
            $validated['images'] = $allImagePaths;
        }

        // Обработка видео
        $processedVideos = $documentationPage->videos ?? [];
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
        }

        // Обновляем content_blocks с загруженными видео
        $videoIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'video' && isset($block['isNew']) && $block['isNew']) {
                if ($videoIndex < count($processedVideos)) {
                    $block['videoType'] = $processedVideos[$videoIndex]['type'];
                    $block['url'] = $processedVideos[$videoIndex]['url'];
                    unset($block['isNew']);
                    unset($block['file']);
                }
                $videoIndex++;
            }
        }
        unset($block);

        // Сохраняем все видео
        foreach ($contentBlocks as $block) {
            if ($block['type'] === 'video' && isset($block['url'])) {
                $videoExists = false;
                foreach ($processedVideos as $video) {
                    if (isset($video['url']) && $video['url'] === $block['url']) {
                        $videoExists = true;
                        break;
                    }
                }
                if (!$videoExists) {
                    $processedVideos[] = [
                        'type' => $block['videoType'] ?? 'embed',
                        'url' => $block['url'],
                    ];
                }
            }
        }
        if (!empty($processedVideos) || $request->has('content_blocks')) {
            $validated['videos'] = $processedVideos;
        }

        // Сохраняем content_blocks
        if ($request->has('content_blocks')) {
            $validated['content_blocks'] = $contentBlocks;
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
