<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class TimezoneService
{
    /**
     * Определяет таймзону по IP адресу
     * Использует бесплатный API ip-api.com (до 45 запросов в минуту)
     * 
     * @param string|null $ip
     * @return string|null
     */
    public function getTimezoneByIp(?string $ip): ?string
    {
        // Если IP не передан или это localhost/приватный IP, возвращаем null
        if (!$ip || 
            $ip === '127.0.0.1' || 
            $ip === '::1' || 
            !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null;
        }

        // Кешируем результат на 24 часа, чтобы не делать лишние запросы
        $cacheKey = "timezone_ip_{$ip}";
        
        return Cache::remember($cacheKey, now()->addHours(24), function () use ($ip) {
            try {
                // Используем ip-api.com (бесплатный, до 45 запросов/мин без регистрации)
                $response = Http::timeout(3)->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'timezone,status,message'
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['status']) && $data['status'] === 'success' && isset($data['timezone'])) {
                        return $data['timezone'];
                    }
                }

                // Fallback: пробуем другой сервис (ipapi.co)
                return $this->getTimezoneByIpFallback($ip);
            } catch (\Exception $e) {
                Log::warning("Failed to get timezone for IP {$ip}: " . $e->getMessage());
                return null;
            }
        });
    }

    /**
     * Резервный метод определения таймзоны через ipapi.co
     * 
     * @param string $ip
     * @return string|null
     */
    protected function getTimezoneByIpFallback(string $ip): ?string
    {
        try {
            $response = Http::timeout(3)->get("https://ipapi.co/{$ip}/timezone/");

            if ($response->successful()) {
                $timezone = trim($response->body());
                
                // Проверяем, что это валидная таймзона
                if ($timezone && $timezone !== 'None' && $this->isValidTimezone($timezone)) {
                    return $timezone;
                }
            }
        } catch (\Exception $e) {
            Log::warning("Fallback timezone service failed for IP {$ip}: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Проверяет, является ли строка валидной таймзоной
     * 
     * @param string $timezone
     * @return bool
     */
    protected function isValidTimezone(string $timezone): bool
    {
        try {
            $timezones = timezone_identifiers_list();
            return in_array($timezone, $timezones, true);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Определяет таймзону браузера пользователя (если передана с фронтенда)
     * 
     * @param string|null $browserTimezone
     * @return string
     */
    public function getBrowserTimezone(?string $browserTimezone): string
    {
        if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
            return $browserTimezone;
        }

        return 'UTC';
    }
}
