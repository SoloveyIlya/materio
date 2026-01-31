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

        // Пропускаем mark-offline endpoints чтобы не устанавливать is_online=true перед явным mark-offline
        if ($request->is('api/user/mark-offline*')) {
            return $response;
        }

        // Обновляем информацию о пользователе при каждом запросе
        if ($request->user()) {
            $user = $request->user();
            $previousOnlineStatus = $user->is_online;
            
            // Получаем реальный IP адрес клиента
            $currentIp = $this->getClientIp($request);
            $previousIp = $user->ip_address;
            
            // Проверяем, не истек ли таймаут для других пользователей (чтобы обновить их статус)
            // Таймаут: 30 секунд без активности (для более быстрой реакции на disconnect)
            $offlineTimeoutSeconds = config('app.user_offline_timeout_seconds', 30);
            $offlineThreshold = now()->subSeconds($offlineTimeoutSeconds);
            
            // Обновляем статус пользователей, которые не были активны в течение таймаута
            $usersToOffline = \App\Models\User::where('is_online', true)
                ->whereNotNull('last_seen_at')
                ->where('last_seen_at', '<', $offlineThreshold)
                ->get();
            
            foreach ($usersToOffline as $offlineUser) {
                $offlineUser->is_online = false;
                $offlineUser->save();
                // Broadcast status change for users going offline due to timeout
                broadcast(new \App\Events\UserStatusChanged($offlineUser->id, $offlineUser->domain_id, false, $offlineUser->last_seen_at))->toOthers();
            }
            
            // Обновляем IP, user agent, location, platform
            $user->ip_address = $currentIp;
            $user->user_agent = $request->userAgent();
            $user->last_seen_at = now();
            
            // Устанавливаем is_online только если он изменился (чтобы не было ложных broadcast)
            if (!$user->is_online) {
                $user->is_online = true;
            }

            // Определяем platform из user agent
            $userAgent = $request->userAgent();
            $user->platform = $this->detectPlatform($userAgent);

            // Определяем location (страна) по IP через сервис
            // Обновляем страну если IP изменился, location не установлен, или это прокси IP с неправильной страной
            $isProxyIp = $this->isKnownProxyIp($currentIp);
            $shouldUpdateLocation = $previousIp !== $currentIp || !$user->location;
            
            // Если это прокси IP и текущая страна не соответствует timezone, тоже обновляем
            if ($isProxyIp && $user->location) {
                $countryFromTimezone = $this->getCountryFromTimezone($user->timezone);
                if ($countryFromTimezone && $user->location !== $countryFromTimezone) {
                    $shouldUpdateLocation = true;
                    \Log::info('Proxy IP detected with incorrect country, will update from timezone', [
                        'user_id' => $user->id,
                        'current_location' => $user->location,
                        'timezone' => $user->timezone,
                        'expected_country' => $countryFromTimezone,
                    ]);
                }
            }
            
            if ($shouldUpdateLocation) {
                // Получаем подробную локацию (город, регион, страна)
                $detectedLocation = $this->timezoneService->getLocationByIp($currentIp);
                
                // Если IP принадлежит известному прокси/балансировщику (Google, Cloudflare и т.д.)
                // используем fallback по timezone вместо локации прокси
                if ($isProxyIp) {
                    $countryFromTimezone = $this->getCountryFromTimezone($user->timezone);
                    if ($countryFromTimezone) {
                        $detectedLocation = $countryFromTimezone;
                        \Log::info('User location determined from timezone (proxy IP detected)', [
                            'user_id' => $user->id,
                            'ip' => $currentIp,
                            'ip_location' => $this->timezoneService->getLocationByIp($currentIp),
                            'timezone' => $user->timezone,
                            'location' => $detectedLocation,
                        ]);
                    }
                }
                
                if ($detectedLocation) {
                    $user->location = $detectedLocation;
                    \Log::info('User location updated', [
                        'user_id' => $user->id,
                        'ip' => $currentIp,
                        'location' => $detectedLocation,
                        'previous_ip' => $previousIp,
                        'previous_location' => $user->getOriginal('location'),
                        'is_proxy_ip' => $isProxyIp,
                    ]);
                }
            }

            // Определяем таймзону по IP (если IP изменился или таймзона не установлена)
            // Приоритет отдаем реальному IP адресу, так как browser_timezone может быть неверным
            $shouldUpdateTimezone = !$user->timezone || $user->timezone === 'UTC' || ($previousIp && $previousIp !== $currentIp);
            
            if ($shouldUpdateTimezone) {
                $timezone = $this->timezoneService->getTimezoneByIp($currentIp);
                if ($timezone) {
                    // Логируем обновление таймзоны
                    if ($user->timezone !== $timezone) {
                        \Log::info('User timezone updated', [
                            'user_id' => $user->id,
                            'old_timezone' => $user->timezone,
                            'new_timezone' => $timezone,
                            'ip' => $currentIp,
                            'previous_ip' => $previousIp,
                            'reason' => !$user->timezone ? 'not_set' : ($user->timezone === 'UTC' ? 'was_utc' : 'ip_changed'),
                        ]);
                    }
                    $user->timezone = $timezone;
                }
            }
            
            // Browser timezone используем только как fallback, если не смогли определить по IP
            if (!$user->timezone || $user->timezone === 'UTC') {
                $browserTimezone = $request->header('X-Timezone') ?? $request->input('browser_timezone');
                if ($browserTimezone) {
                    $timezone = $this->timezoneService->getBrowserTimezone($browserTimezone);
                    if ($timezone && $timezone !== 'UTC') {
                        $user->timezone = $timezone;
                    }
                }
            }

            $user->save();
            
            // Broadcast user status change if online status changed
            if ($previousOnlineStatus !== $user->is_online) {
                broadcast(new \App\Events\UserStatusChanged($user->id, $user->domain_id, $user->is_online, $user->last_seen_at))->toOthers();
            }
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

    /**
     * Проверяет, является ли IP адресом известного прокси/балансировщика
     * 
     * @param string|null $ip
     * @return bool
     */
    protected function isKnownProxyIp(?string $ip): bool
    {
        if (!$ip) {
            return false;
        }

        // Список известных прокси/балансировщиков
        $knownProxyRanges = [
            // Google Cloud
            '142.251.',
            '172.217.',
            '216.58.',
            // Cloudflare
            '104.16.',
            '104.17.',
            '104.18.',
            '104.19.',
            '104.20.',
            '104.21.',
            '104.22.',
            '104.23.',
            '104.24.',
            '104.25.',
            '104.26.',
            '104.27.',
            '104.28.',
            '104.29.',
            '104.30.',
            '104.31.',
            // AWS
            '13.32.',
            '13.33.',
            '13.34.',
            '13.35.',
            // Azure
            '13.107.',
            '20.190.',
        ];

        foreach ($knownProxyRanges as $range) {
            if (str_starts_with($ip, $range)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Определяет страну по timezone (fallback метод)
     * 
     * @param string|null $timezone
     * @return string|null
     */
    protected function getCountryFromTimezone(?string $timezone): ?string
    {
        if (!$timezone) {
            return null;
        }

        // Маппинг основных timezone на страны
        $timezoneToCountry = [
            'Europe/Minsk' => 'Belarus',
            'Europe/Moscow' => 'Russia',
            'Europe/Kiev' => 'Ukraine',
            'Europe/Warsaw' => 'Poland',
            'Europe/Berlin' => 'Germany',
            'Europe/London' => 'United Kingdom',
            'Europe/Paris' => 'France',
            'Europe/Rome' => 'Italy',
            'Europe/Madrid' => 'Spain',
            'America/New_York' => 'United States',
            'America/Los_Angeles' => 'United States',
            'America/Chicago' => 'United States',
            'Asia/Tokyo' => 'Japan',
            'Asia/Shanghai' => 'China',
            'Asia/Dubai' => 'United Arab Emirates',
            'Asia/Kolkata' => 'India',
            'Australia/Sydney' => 'Australia',
            'America/Toronto' => 'Canada',
            'America/Sao_Paulo' => 'Brazil',
        ];

        return $timezoneToCountry[$timezone] ?? null;
    }

    /**
     * Получает реальный IP адрес клиента, учитывая прокси и заголовки
     * 
     * @param \Illuminate\Http\Request $request
     * @return string|null
     */
    protected function getClientIp(Request $request): ?string
    {
        // Laravel метод ip() уже учитывает TrustProxies
        $ip = $request->ip();
        
        // Логируем все доступные заголовки для отладки
        $allHeaders = [
            'CF-Connecting-IP' => $request->header('CF-Connecting-IP'),
            'X-Real-IP' => $request->header('X-Real-IP'),
            'X-Forwarded-For' => $request->header('X-Forwarded-For'),
            'X-Forwarded' => $request->header('X-Forwarded'),
            'Forwarded-For' => $request->header('Forwarded-For'),
            'Forwarded' => $request->header('Forwarded'),
            'REMOTE_ADDR' => $request->server('REMOTE_ADDR'),
        ];
        
        \Log::debug('IP Detection - All headers', [
            'laravel_ip' => $ip,
            'headers' => $allHeaders,
            'user_agent' => $request->userAgent(),
        ]);
        
        // Проверяем заголовки в порядке приоритета для определения реального IP клиента
        $headers = [
            'CF-Connecting-IP', // Cloudflare - всегда реальный IP клиента (высший приоритет)
            'X-Real-IP',        // Nginx reverse proxy
            'X-Forwarded-For',  // Стандартный заголовок прокси (может содержать цепочку IP)
            'X-Forwarded',      // Альтернативный формат
            'Forwarded-For',    // Стандартный Forwarded заголовок
            'Forwarded',        // RFC 7239 Forwarded header
        ];
        
        foreach ($headers as $header) {
            $headerValue = $request->header($header);
            if ($headerValue) {
                // X-Forwarded-For и подобные могут содержать несколько IP через запятую
                // Последний IP в цепочке - это оригинальный IP клиента (самый доверенный)
                // НО первый IP - это то, что добавил первый прокси (может быть подделан)
                // В реальности нужно проверять весь путь, но обычно последний IP - реальный клиент
                $ips = array_map('trim', explode(',', $headerValue));
                
                // Пробуем оба варианта: последний (реальный клиент) и первый (если только один прокси)
                $candidateIps = array_filter($ips, function($ip) {
                    return !empty($ip) && filter_var($ip, FILTER_VALIDATE_IP);
                });
                
                // Берем последний IP из цепочки (оригинальный клиент)
                $clientIp = !empty($candidateIps) ? end($candidateIps) : null;
                
                // Если последний IP не подходит, пробуем первый
                if (!$clientIp || !filter_var($clientIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    $clientIp = !empty($candidateIps) ? reset($candidateIps) : null;
                }
                
                // Проверяем, что это валидный публичный IP (не приватный/локальный)
                if ($clientIp && filter_var($clientIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    // Если получили IP из заголовка, который отличается от стандартного метода Laravel
                    if ($clientIp !== $ip) {
                        \Log::info('Client IP extracted from header', [
                            'header' => $header,
                            'header_value' => $headerValue,
                            'extracted_ip' => $clientIp,
                            'laravel_ip' => $ip,
                            'all_ips_in_chain' => $ips,
                        ]);
                    }
                    return $clientIp;
                }
            }
        }
        
        // Если получили IP от Google/прокси, логируем предупреждение
        if ($ip && (
            str_starts_with($ip, '142.251.') || 
            str_starts_with($ip, '172.217.') ||
            str_starts_with($ip, '216.58.')
        )) {
            \Log::warning('Possible proxy IP detected (Google)', [
                'ip' => $ip,
                'headers' => $allHeaders,
                'note' => 'Real client IP may be in X-Forwarded-For header',
            ]);
        }
        
        // Если не удалось определить из заголовков, используем стандартный метод Laravel
        return $ip;
    }
}
