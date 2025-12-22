<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\DocumentationCategory;
use App\Models\DocumentationPage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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

        // Преобразуем пути к изображениям в полные URL для всех страниц
        $appUrl = config('app.url');
        $categories->each(function ($category) use ($appUrl) {
            if ($category->pages) {
                $category->pages->transform(function ($page) use ($appUrl) {
                    if ($page->images && is_array($page->images)) {
                        $page->images = array_map(function ($imagePath) use ($appUrl) {
                            if (filter_var($imagePath, FILTER_VALIDATE_URL)) {
                                return $imagePath;
                            }
                            if (Str::startsWith($imagePath, '/storage/')) {
                                return rtrim($appUrl, '/') . $imagePath;
                            }
                            return rtrim($appUrl, '/') . '/storage/' . ltrim($imagePath, '/');
                        }, $page->images);
                    }
                    return $page;
                });
            }
        });

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

        // Преобразуем пути к изображениям в полные URL для всех страниц
        $appUrl = config('app.url');
        if ($category->pages) {
            $category->pages->transform(function ($page) use ($appUrl) {
                if ($page->images && is_array($page->images)) {
                    $page->images = array_map(function ($imagePath) use ($appUrl) {
                        if (filter_var($imagePath, FILTER_VALIDATE_URL)) {
                            return $imagePath;
                        }
                        if (Str::startsWith($imagePath, '/storage/')) {
                            return rtrim($appUrl, '/') . $imagePath;
                        }
                        return rtrim($appUrl, '/') . '/storage/' . ltrim($imagePath, '/');
                    }, $page->images);
                }
                return $page;
            });
        }

        return response()->json($category);
    }

    public function pages(Request $request)
    {
        $query = DocumentationPage::where('domain_id', $request->user()->domain_id)
            ->where('is_published', true);

        if ($request->has('popular')) {
            // Пока возвращаем все опубликованные страницы (можно добавить логику популярности позже)
            $query->orderBy('created_at', 'desc');
        }

        $pages = $query->with('category')->get();

        // Преобразуем пути к изображениям в полные URL для всех страниц
        $appUrl = config('app.url');
        $pages->transform(function ($page) use ($appUrl) {
            if ($page->images && is_array($page->images)) {
                $page->images = array_map(function ($imagePath) use ($appUrl) {
                    if (filter_var($imagePath, FILTER_VALIDATE_URL)) {
                        return $imagePath;
                    }
                    if (Str::startsWith($imagePath, '/storage/')) {
                        return rtrim($appUrl, '/') . $imagePath;
                    }
                    return rtrim($appUrl, '/') . '/storage/' . ltrim($imagePath, '/');
                }, $page->images);
            }
            return $page;
        });

        return response()->json($pages);
    }

    public function page(Request $request, $id)
    {
        // Пробуем найти по ID или slug
        $page = DocumentationPage::where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('slug', $id);
            })
            ->where('domain_id', $request->user()->domain_id)
            ->first();

        if (!$page) {
            return response()->json(['message' => 'Page not found'], 404);
        }

        if (!$page->is_published) {
            return response()->json(['message' => 'Page not published'], 404);
        }

        $page->load(['category', 'category.parent']);

        $appUrl = config('app.url');

        // Преобразуем пути к изображениям в полные URL
        if ($page->images && is_array($page->images)) {
            $page->images = array_map(function ($imagePath) use ($appUrl) {
                // Если путь уже полный URL, возвращаем как есть
                if (filter_var($imagePath, FILTER_VALIDATE_URL)) {
                    return $imagePath;
                }
                // Если путь начинается с /storage/, добавляем APP_URL
                if (Str::startsWith($imagePath, '/storage/')) {
                    return rtrim($appUrl, '/') . $imagePath;
                }
                // Если путь относительный, добавляем /storage/
                return rtrim($appUrl, '/') . '/storage/' . ltrim($imagePath, '/');
            }, $page->images);
        }

        // Преобразуем пути к изображениям в HTML контенте
        if ($page->content) {
            $page->content = preg_replace_callback(
                '/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i',
                function ($matches) use ($appUrl) {
                    $src = $matches[1];
                    // Если это уже полный URL, оставляем как есть
                    if (filter_var($src, FILTER_VALIDATE_URL)) {
                        return $matches[0];
                    }
                    // Если путь начинается с /storage/, преобразуем в полный URL
                    if (Str::startsWith($src, '/storage/')) {
                        $fullUrl = rtrim($appUrl, '/') . $src;
                        return str_replace($src, $fullUrl, $matches[0]);
                    }
                    return $matches[0];
                },
                $page->content
            );
        }

        // Преобразуем пути к изображениям в content_blocks
        if ($page->content_blocks && is_array($page->content_blocks)) {
            $page->content_blocks = array_map(function ($block) use ($appUrl) {
                if (isset($block['type']) && $block['type'] === 'image' && isset($block['url'])) {
                    $imageUrl = $block['url'];
                    // Если путь уже полный URL, оставляем как есть
                    if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                        // Если путь начинается с /storage/, добавляем APP_URL
                        if (Str::startsWith($imageUrl, '/storage/')) {
                            $block['url'] = rtrim($appUrl, '/') . $imageUrl;
                        } else {
                            // Если путь относительный, добавляем /storage/
                            $block['url'] = rtrim($appUrl, '/') . '/storage/' . ltrim($imageUrl, '/');
                        }
                    }
                } elseif (isset($block['type']) && $block['type'] === 'video' && isset($block['url'])) {
                    $videoUrl = $block['url'];
                    // Преобразуем только локальные видео (не embed URL)
                    if (!filter_var($videoUrl, FILTER_VALIDATE_URL) && 
                        (!isset($block['videoType']) || $block['videoType'] === 'local')) {
                        if (Str::startsWith($videoUrl, '/storage/')) {
                            $block['url'] = rtrim($appUrl, '/') . $videoUrl;
                        } else {
                            $block['url'] = rtrim($appUrl, '/') . '/storage/' . ltrim($videoUrl, '/');
                        }
                    }
                }
                return $block;
            }, $page->content_blocks);
        }

        return response()->json($page);
    }
}
