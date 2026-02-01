<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTaskSendingConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'admin_id',
        'days_config',
        'is_active',
        'started_at',
    ];

    protected $casts = [
        'days_config' => 'array',
        'is_active' => 'boolean',
        'started_at' => 'datetime',
    ];

    /**
     * Модератор, для которого настроена отправка
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Админ, который создал конфигурацию
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Получить конфигурацию для конкретного дня
     */
    public function getDayConfig(int $workDay): ?array
    {
        $daysConfig = $this->days_config ?? [];
        return $daysConfig[$workDay] ?? null;
    }

    /**
     * Установить конфигурацию для конкретного дня
     */
    public function setDayConfig(int $workDay, array $config): void
    {
        $daysConfig = $this->days_config ?? [];
        $daysConfig[$workDay] = $config;
        $this->days_config = $daysConfig;
        $this->save();
    }

    /**
     * Проверить, настроен ли конкретный день
     */
    public function hasDayConfig(int $workDay): bool
    {
        return isset($this->days_config[$workDay]);
    }

    /**
     * Получить все настроенные дни
     */
    public function getConfiguredDays(): array
    {
        return array_keys($this->days_config ?? []);
    }

    /**
     * Получить выбранные таски для дня
     */
    public function getSelectedTasksForDay(int $workDay): array
    {
        $dayConfig = $this->getDayConfig($workDay);
        return $dayConfig['selected_tasks'] ?? [];
    }

    /**
     * Получить временной диапазон для дня
     */
    public function getTimeRangeForDay(int $workDay): ?array
    {
        $dayConfig = $this->getDayConfig($workDay);
        if (!$dayConfig) {
            return null;
        }
        
        return [
            'start_time' => $dayConfig['start_time'] ?? '07:00',
            'end_time' => $dayConfig['end_time'] ?? '17:00',
            'timezone' => $dayConfig['timezone'] ?? 'America/New_York',
        ];
    }

    /**
     * Получить дату отправки для дня
     */
    public function getSendDateForDay(int $workDay): ?string
    {
        $dayConfig = $this->getDayConfig($workDay);
        return $dayConfig['send_date'] ?? null;
    }
}
