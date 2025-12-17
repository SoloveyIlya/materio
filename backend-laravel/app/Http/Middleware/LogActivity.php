<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Логируем только для аутентифицированных пользователей
        if ($request->user()) {
            $this->logActivity($request, $response);
        }

        return $response;
    }

    protected function logActivity(Request $request, Response $response): void
    {
        // Пропускаем логирование для некоторых маршрутов (например, API для логов)
        $skipRoutes = ['api/admin/activity-logs', 'api/moderator/activity-logs'];
        $currentRoute = $request->path();
        
        foreach ($skipRoutes as $skipRoute) {
            if (str_contains($currentRoute, $skipRoute)) {
                return;
            }
        }

        // Определяем тип события
        $eventType = $this->determineEventType($request);

        // Определяем действие
        $action = $this->determineAction($request);

        ActivityLog::create([
            'domain_id' => $request->user()->domain_id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'event_type' => $eventType,
            'route' => $request->path(),
            'method' => $request->method(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'data' => $this->getRequestData($request),
            'description' => $this->getDescription($request, $action, $eventType),
        ]);
    }

    protected function determineEventType(Request $request): ?string
    {
        $method = $request->method();
        $path = $request->path();

        // Определяем тип события на основе маршрута и метода
        if ($method === 'GET' && !str_contains($path, 'api')) {
            return 'page_view';
        } elseif (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return 'action';
        }

        return null;
    }

    protected function determineAction(Request $request): string
    {
        $method = $request->method();
        $path = $request->path();

        // Определяем действие на основе HTTP метода
        return match ($method) {
            'GET' => 'view',
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'unknown',
        };
    }

    protected function getRequestData(Request $request): array
    {
        // Собираем данные запроса (исключаем чувствительные данные)
        $data = $request->except(['password', 'password_confirmation', 'token']);

        return $data;
    }

    protected function getDescription(Request $request, string $action, ?string $eventType): ?string
    {
        $path = $request->path();
        $method = $request->method();

        if ($eventType === 'page_view') {
            return "Просмотр страницы: {$path}";
        }

        // Для других действий формируем описание на основе маршрута
        $resource = $this->extractResourceFromPath($path);
        
        return match ($action) {
            'create' => "Создание {$resource}",
            'update' => "Обновление {$resource}",
            'delete' => "Удаление {$resource}",
            default => "Действие: {$method} {$path}",
        };
    }

    protected function extractResourceFromPath(string $path): string
    {
        // Извлекаем название ресурса из пути
        $parts = explode('/', $path);
        $resource = end($parts);

        // Убираем параметры (ID и т.д.)
        if (is_numeric($resource)) {
            $resource = $parts[count($parts) - 2] ?? 'ресурса';
        }

        return str_replace('-', ' ', $resource);
    }
}
