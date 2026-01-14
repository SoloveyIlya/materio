<?php

namespace App\Http\Middleware;

use App\Services\TimezoneService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackUserActivity
{
    protected TimezoneService $timezoneService;

    public function __construct(TimezoneService $timezoneService)
    {
        $this->timezoneService = $timezoneService;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Обновляем информацию о пользователе при каждом запросе
        if ($request->user()) {
            $user = $request->user();
            $currentIp = $request->ip();
            $previousIp = $user->ip_address;
            
            // Обновляем IP, user agent, location, platform
            $user->ip_address = $currentIp;
            $user->user_agent = $request->userAgent();
            $user->last_seen_at = now();
            $user->is_online = true;

            // Определяем platform из user agent
            $userAgent = $request->userAgent();
            $user->platform = $this->detectPlatform($userAgent);

            // Определяем location (упрощенная версия - можно интегрировать GeoIP)
            $user->location = $this->detectLocation($currentIp);

            // Определяем таймзону по IP, если она не установлена, установлена как UTC, или IP изменился
            if (!$user->timezone || $user->timezone === 'UTC' || ($previousIp && $previousIp !== $currentIp)) {
                $timezone = $this->timezoneService->getTimezoneByIp($currentIp);
                if ($timezone) {
                    $user->timezone = $timezone;
                }
            }

            $user->save();
        }

        return $response;
    }

    protected function detectPlatform(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        if (preg_match('/Windows/i', $userAgent)) {
            return 'Windows';
        } elseif (preg_match('/Mac/i', $userAgent)) {
            return 'macOS';
        } elseif (preg_match('/Linux/i', $userAgent)) {
            return 'Linux';
        } elseif (preg_match('/Android/i', $userAgent)) {
            return 'Android';
        } elseif (preg_match('/iPhone|iPad|iPod/i', $userAgent)) {
            return 'iOS';
        }

        return 'Unknown';
    }

    protected function detectLocation(?string $ip): ?string
    {
        // Упрощенная версия - в продакшене можно использовать GeoIP сервис
        // Например, через пакет geoip или внешний API
        if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
            return 'Local';
        }

        // Здесь можно добавить интеграцию с GeoIP сервисом
        // Пока возвращаем null или базовую информацию
        return null;
    }
}
