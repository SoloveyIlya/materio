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
            // Собираем все ID инструментов: из page.tools и из content_blocks
            $toolIds = [];
            if ($page->tools && is_array($page->tools) && count($page->tools) > 0) {
                $toolIds = array_merge($toolIds, $page->tools);
            }
            
            // Извлекаем toolId из content_blocks
            if ($page->content_blocks && is_array($page->content_blocks)) {
                foreach ($page->content_blocks as $block) {
                    if (isset($block['type']) && $block['type'] === 'tool' && isset($block['toolId'])) {
                        $toolId = is_numeric($block['toolId']) ? (int)$block['toolId'] : $block['toolId'];
                        if (!in_array($toolId, $toolIds)) {
                            $toolIds[] = $toolId;
                        }
                    }
                }
            }

            // Загружаем информацию о tools
            if (count($toolIds) > 0) {
                $tools = Tool::whereIn('id', $toolIds)
                    ->where('domain_id', $domainId)
                    ->get(['id', 'name', 'slug', 'description', 'url']);
                $page->tools_data = $tools;
            }
        });

        return response()->json($pages);
    }

    public function store(Request $request)
    {
        // Debug logging
        \Log::info('DocumentationPage store - Request data:', [
            'all_input_keys' => array_keys($request->all()),
            'all_files_keys' => array_keys($request->allFiles()),
            'videos_input' => $request->input('videos'),
            'has_videos' => $request->has('videos'),
        ]);
        
        $validated = $request->validate([
            'category_id' => 'required|exists:documentation_categories,id',
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'content_blocks' => 'nullable|string', // JSON string from FormData
            'images' => 'nullable|array',
            'images.*' => 'nullable|file|image|max:10240', // 10MB max
            'tools' => 'nullable|array',
            'tools.*' => 'exists:tools,id',
            'related_task_categories' => 'nullable|array',
            'related_task_categories.*' => 'exists:task_categories,id',
            'related_tasks' => 'nullable|array',
            'related_tasks.*' => 'exists:tasks,id',
            'order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        // Валидация видео вручную (не используем стандартную валидацию для вложенных массивов с файлами)
        $videoErrors = [];
        $videosInput = $request->input('videos');
        
        // Собираем videos из всех параметров запроса
        $videos = [];
        if (is_array($videosInput)) {
            $videos = $videosInput;
        } else {
            // Пытаемся собрать из всех параметров
            $allInput = $request->all();
            foreach ($allInput as $key => $value) {
                if (preg_match('/^videos\[(\d+)\]\[(\w+)\]$/', $key, $matches)) {
                    $index = (int)$matches[1];
                    $field = $matches[2];
                    if (!isset($videos[$index])) {
                        $videos[$index] = [];
                    }
                    $videos[$index][$field] = $value;
                }
            }
        }
        
        // Валидируем каждое видео
        foreach ($videos as $index => $video) {
            if (is_array($video) && isset($video['type'])) {
                if ($video['type'] === 'embed') {
                    if (empty($video['url'])) {
                        $videoErrors["videos.{$index}.url"] = ['URL is required for embed video'];
                    }
                } elseif ($video['type'] === 'local') {
                    // Проверяем наличие файла
                    $hasFile = false;
                    $videoFile = null;
                    
                    // Пробуем получить файл разными способами
                    // Способ 1: стандартный путь с точкой
                    if ($request->hasFile("videos.{$index}.file")) {
                        $videoFile = $request->file("videos.{$index}.file");
                    }
                    // Способ 2: путь с квадратными скобками
                    elseif ($request->hasFile("videos[{$index}][file]")) {
                        $videoFile = $request->file("videos[{$index}][file]");
                    }
                    // Способ 3: прямой доступ через массив запроса
                    elseif (isset($_FILES["videos"]["name"][$index]["file"])) {
                        // Используем прямой доступ к $_FILES
                        if (isset($_FILES["videos"]["tmp_name"][$index]["file"]) && is_uploaded_file($_FILES["videos"]["tmp_name"][$index]["file"])) {
                            $videoFile = $request->file("videos.{$index}.file");
                        }
                    }
                    // Способ 4: проверяем все файлы в запросе
                    else {
                        $allFiles = $request->allFiles();
                        foreach ($allFiles as $key => $file) {
                            // Проверяем паттерн videos[число][file]
                            if (preg_match('/^videos\[(\d+)\]\[file\]$/', $key, $matches)) {
                                $fileIndex = (int)$matches[1];
                                if ($fileIndex === $index) {
                                    $videoFile = $file;
                                    break;
                                }
                            }
                            // Проверяем паттерн videos.число.file
                            elseif ($key === "videos.{$index}.file") {
                                $videoFile = $file;
                                break;
                            }
                            // Проверяем все варианты ключей
                            elseif (preg_match('/videos.*' . $index . '.*file/i', $key)) {
                                $videoFile = $file;
                                break;
                            }
                        }
                    }
                    
                    if ($videoFile && $videoFile->isValid()) {
                        // Проверяем MIME тип и размер
                        $allowedMimes = ['video/mp4', 'video/webm', 'video/ogg'];
                        $maxSize = 102400; // 100MB в KB
                        
                        if (!in_array($videoFile->getMimeType(), $allowedMimes)) {
                            $videoErrors["videos.{$index}.file"] = ['Allowed formats: mp4, webm, ogg'];
                        } elseif ($videoFile->getSize() > $maxSize * 1024) {
                            $videoErrors["videos.{$index}.file"] = ['Maximum file size: 100MB'];
                        } else {
                            $hasFile = true;
                        }
                    }
                    
                    if (!$hasFile) {
                        $videoErrors["videos.{$index}.file"] = ['File is required for local video'];
                    }
                } else {
                    $videoErrors["videos.{$index}.type"] = ['Video type must be local or embed'];
                }
            }
        }
        
        if (!empty($videoErrors)) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $videoErrors
            ], 422);
        }

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
                        $url = Storage::url($path);
                        // Убеждаемся, что URL полный (с APP_URL)
                        if (!str_starts_with($url, 'http')) {
                            $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                        }
                        $uploadedImagePaths[] = $url;
                    }
                }
            } else {
                // Если одно изображение
                if ($images->isValid()) {
                    $path = $images->store('documentation/images', 'public');
                    $url = Storage::url($path);
                    // Убеждаемся, что URL полный (с APP_URL)
                    if (!str_starts_with($url, 'http')) {
                        $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                    }
                    $uploadedImagePaths[] = $url;
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
        // Пробуем получить videos разными способами
        $videos = $request->input('videos');
        
        // Если videos не массив, пытаемся собрать его из всех параметров запроса
        if (!is_array($videos)) {
            $videos = [];
            $allInput = $request->all();
            foreach ($allInput as $key => $value) {
                if (preg_match('/^videos\[(\d+)\]\[(\w+)\]$/', $key, $matches)) {
                    $index = (int)$matches[1];
                    $field = $matches[2];
                    if (!isset($videos[$index])) {
                        $videos[$index] = [];
                    }
                    $videos[$index][$field] = $value;
                }
            }
        }
        
        if (is_array($videos) && !empty($videos)) {
            foreach ($videos as $index => $video) {
                if (is_array($video) && isset($video['type'])) {
                    if ($video['type'] === 'embed' && isset($video['url']) && !empty($video['url'])) {
                        // Для embed просто сохраняем URL
                        $processedVideos[] = [
                            'type' => 'embed',
                            'url' => $video['url'],
                        ];
                    } elseif ($video['type'] === 'local') {
                        // Для локальных видео загружаем файл
                        $videoFile = null;
                        
                        // Пробуем получить файл разными способами
                        // Способ 1: через стандартный путь
                        if ($request->hasFile("videos.{$index}.file")) {
                            $videoFile = $request->file("videos.{$index}.file");
                        }
                        // Способ 2: через альтернативный путь
                        elseif ($request->hasFile("videos[{$index}][file]")) {
                            $videoFile = $request->file("videos[{$index}][file]");
                        }
                        // Способ 3: проверяем все файлы в запросе
                        else {
                            $allFiles = $request->allFiles();
                            foreach ($allFiles as $key => $file) {
                                if (preg_match('/^videos\[(\d+)\]\[file\]$/', $key, $matches)) {
                                    $fileIndex = (int)$matches[1];
                                    if ($fileIndex === $index) {
                                        $videoFile = $file;
                                        break;
                                    }
                                } elseif ($key === "videos.{$index}.file") {
                                    $videoFile = $file;
                                    break;
                                }
                            }
                        }
                        
                        if ($videoFile && $videoFile->isValid()) {
                            $path = $videoFile->store('documentation/videos', 'public');
                            $url = Storage::url($path);
                            // Убеждаемся, что URL полный (с APP_URL)
                            if (!str_starts_with($url, 'http')) {
                                $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                            }
                            $processedVideos[] = [
                                'type' => 'local',
                                'url' => $url,
                            ];
                        }
                    }
                }
            }
        }

        // Обновляем content_blocks с загруженными видео
        // Сначала обрабатываем новые видео (с isNew: true)
        $videoIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'video' && isset($block['isNew']) && $block['isNew']) {
                if ($videoIndex < count($processedVideos)) {
                    $block['videoType'] = $processedVideos[$videoIndex]['type'];
                    $block['url'] = $processedVideos[$videoIndex]['url'];
                    unset($block['isNew']);
                    unset($block['file']);
                    $videoIndex++;
                }
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
        
        // Собираем все ID инструментов: из tools и из content_blocks
        $toolIds = [];
        if ($documentationPage->tools && is_array($documentationPage->tools) && count($documentationPage->tools) > 0) {
            $toolIds = array_merge($toolIds, $documentationPage->tools);
        }
        
        // Извлекаем toolId из content_blocks
        if ($documentationPage->content_blocks && is_array($documentationPage->content_blocks)) {
            foreach ($documentationPage->content_blocks as $block) {
                if (isset($block['type']) && $block['type'] === 'tool' && isset($block['toolId'])) {
                    $toolId = is_numeric($block['toolId']) ? (int)$block['toolId'] : $block['toolId'];
                    if (!in_array($toolId, $toolIds)) {
                        $toolIds[] = $toolId;
                    }
                }
            }
        }

        // Загружаем информацию о tools
        if (count($toolIds) > 0) {
            $tools = Tool::whereIn('id', $toolIds)
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
            'tools' => 'nullable|array',
            'tools.*' => 'exists:tools,id',
            'related_task_categories' => 'nullable|array',
            'related_task_categories.*' => 'exists:task_categories,id',
            'related_tasks' => 'nullable|array',
            'related_tasks.*' => 'exists:tasks,id',
            'order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        // Валидация видео вручную (не используем стандартную валидацию для вложенных массивов с файлами)
        $videoErrors = [];
        $videosInput = $request->input('videos');
        
        // Собираем videos из всех параметров запроса
        $videos = [];
        if (is_array($videosInput)) {
            $videos = $videosInput;
        } else {
            // Пытаемся собрать из всех параметров
            $allInput = $request->all();
            foreach ($allInput as $key => $value) {
                if (preg_match('/^videos\[(\d+)\]\[(\w+)\]$/', $key, $matches)) {
                    $index = (int)$matches[1];
                    $field = $matches[2];
                    if (!isset($videos[$index])) {
                        $videos[$index] = [];
                    }
                    $videos[$index][$field] = $value;
                }
            }
        }
        
        // Валидируем каждое видео
        foreach ($videos as $index => $video) {
            if (is_array($video) && isset($video['type'])) {
                if ($video['type'] === 'embed') {
                    if (empty($video['url'])) {
                        $videoErrors["videos.{$index}.url"] = ['URL is required for embed video'];
                    }
                } elseif ($video['type'] === 'local') {
                    // Проверяем наличие файла
                    $hasFile = false;
                    $videoFile = null;
                    
                    // Пробуем получить файл разными способами
                    // Способ 1: стандартный путь с точкой
                    if ($request->hasFile("videos.{$index}.file")) {
                        $videoFile = $request->file("videos.{$index}.file");
                    }
                    // Способ 2: путь с квадратными скобками
                    elseif ($request->hasFile("videos[{$index}][file]")) {
                        $videoFile = $request->file("videos[{$index}][file]");
                    }
                    // Способ 3: прямой доступ через массив запроса
                    elseif (isset($_FILES["videos"]["name"][$index]["file"])) {
                        // Используем прямой доступ к $_FILES
                        if (isset($_FILES["videos"]["tmp_name"][$index]["file"]) && is_uploaded_file($_FILES["videos"]["tmp_name"][$index]["file"])) {
                            $videoFile = $request->file("videos.{$index}.file");
                        }
                    }
                    // Способ 4: проверяем все файлы в запросе
                    else {
                        $allFiles = $request->allFiles();
                        foreach ($allFiles as $key => $file) {
                            // Проверяем паттерн videos[число][file]
                            if (preg_match('/^videos\[(\d+)\]\[file\]$/', $key, $matches)) {
                                $fileIndex = (int)$matches[1];
                                if ($fileIndex === $index) {
                                    $videoFile = $file;
                                    break;
                                }
                            }
                            // Проверяем паттерн videos.число.file
                            elseif ($key === "videos.{$index}.file") {
                                $videoFile = $file;
                                break;
                            }
                            // Проверяем все варианты ключей
                            elseif (preg_match('/videos.*' . $index . '.*file/i', $key)) {
                                $videoFile = $file;
                                break;
                            }
                        }
                    }
                    
                    if ($videoFile && $videoFile->isValid()) {
                        // Проверяем MIME тип и размер
                        $allowedMimes = ['video/mp4', 'video/webm', 'video/ogg'];
                        $maxSize = 102400; // 100MB в KB
                        
                        if (!in_array($videoFile->getMimeType(), $allowedMimes)) {
                            $videoErrors["videos.{$index}.file"] = ['Allowed formats: mp4, webm, ogg'];
                        } elseif ($videoFile->getSize() > $maxSize * 1024) {
                            $videoErrors["videos.{$index}.file"] = ['Maximum file size: 100MB'];
                        } else {
                            $hasFile = true;
                        }
                    }
                    
                    if (!$hasFile) {
                        $videoErrors["videos.{$index}.file"] = ['File is required for local video'];
                    }
                } else {
                    $videoErrors["videos.{$index}.type"] = ['Video type must be local or embed'];
                }
            }
        }
        
        if (!empty($videoErrors)) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $videoErrors
            ], 422);
        }

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
                        $url = Storage::url($path);
                        // Убеждаемся, что URL полный (с APP_URL)
                        if (!str_starts_with($url, 'http')) {
                            $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                        }
                        $uploadedImagePaths[] = $url;
                    }
                }
            } else {
                if ($images->isValid()) {
                    $path = $images->store('documentation/images', 'public');
                    $url = Storage::url($path);
                    // Убеждаемся, что URL полный (с APP_URL)
                    if (!str_starts_with($url, 'http')) {
                        $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                    }
                    $uploadedImagePaths[] = $url;
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
        // Пробуем получить videos разными способами
        $videos = $request->input('videos');
        
        // Если videos не массив, пытаемся собрать его из всех параметров запроса
        if (!is_array($videos) && $request->has('videos')) {
            $videos = [];
            $allInput = $request->all();
            foreach ($allInput as $key => $value) {
                if (preg_match('/^videos\[(\d+)\]\[(\w+)\]$/', $key, $matches)) {
                    $index = (int)$matches[1];
                    $field = $matches[2];
                    if (!isset($videos[$index])) {
                        $videos[$index] = [];
                    }
                    $videos[$index][$field] = $value;
                }
            }
        }
        
        if (is_array($videos) && !empty($videos)) {
            $processedVideos = [];
            foreach ($videos as $index => $video) {
                if (is_array($video) && isset($video['type'])) {
                    if ($video['type'] === 'embed' && isset($video['url']) && !empty($video['url'])) {
                        $processedVideos[] = [
                            'type' => 'embed',
                            'url' => $video['url'],
                        ];
                    } elseif ($video['type'] === 'local') {
                        // Для локальных видео загружаем файл
                        $videoFile = null;
                        
                        // Пробуем получить файл разными способами
                        // Способ 1: через стандартный путь
                        if ($request->hasFile("videos.{$index}.file")) {
                            $videoFile = $request->file("videos.{$index}.file");
                        }
                        // Способ 2: через альтернативный путь
                        elseif ($request->hasFile("videos[{$index}][file]")) {
                            $videoFile = $request->file("videos[{$index}][file]");
                        }
                        // Способ 3: проверяем все файлы в запросе
                        else {
                            $allFiles = $request->allFiles();
                            foreach ($allFiles as $key => $file) {
                                if (preg_match('/^videos\[(\d+)\]\[file\]$/', $key, $matches)) {
                                    $fileIndex = (int)$matches[1];
                                    if ($fileIndex === $index) {
                                        $videoFile = $file;
                                        break;
                                    }
                                } elseif ($key === "videos.{$index}.file") {
                                    $videoFile = $file;
                                    break;
                                }
                            }
                        }
                        
                        if ($videoFile && $videoFile->isValid()) {
                            $path = $videoFile->store('documentation/videos', 'public');
                            $url = Storage::url($path);
                            // Убеждаемся, что URL полный (с APP_URL)
                            if (!str_starts_with($url, 'http')) {
                                $url = rtrim(config('app.url'), '/') . '/' . ltrim($url, '/');
                            }
                            $processedVideos[] = [
                                'type' => 'local',
                                'url' => $url,
                            ];
                        }
                    }
                }
            }
        }

        // Обновляем content_blocks с загруженными видео
        // Сначала обрабатываем новые видео (с isNew: true)
        $videoIndex = 0;
        foreach ($contentBlocks as &$block) {
            if ($block['type'] === 'video' && isset($block['isNew']) && $block['isNew']) {
                if ($videoIndex < count($processedVideos)) {
                    $block['videoType'] = $processedVideos[$videoIndex]['type'];
                    $block['url'] = $processedVideos[$videoIndex]['url'];
                    unset($block['isNew']);
                    unset($block['file']);
                    $videoIndex++;
                }
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
