<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskTemplate;
use App\Models\User;
use Carbon\Carbon;

class TaskService
{
    /**
     * Автогенерация первичных 10 тасков для модератора при старте работы
     */
    public function generatePrimaryTasksForModerator(User $moderator): array
    {
        if (!$moderator->work_start_date) {
            $moderator->update([
                'work_start_date' => Carbon::now($moderator->timezone ?? 'UTC')->toDateString(),
            ]);
        }

        $domainId = $moderator->domain_id;
        $primaryTemplates = TaskTemplate::where('domain_id', $domainId)
            ->where('is_primary', true)
            ->where('is_active', true)
            ->orderBy('work_day')
            ->get();

        $generatedTasks = [];

        foreach ($primaryTemplates as $template) {
            // Проверяем, не существует ли уже таск для этого дня работы
            $existingTask = Task::where('domain_id', $domainId)
                ->where('assigned_to', $moderator->id)
                ->where('template_id', $template->id)
                ->where('work_day', $template->work_day)
                ->first();

            if (!$existingTask) {
                $task = Task::create([
                    'domain_id' => $domainId,
                    'template_id' => $template->id,
                    'category_id' => $template->category_id,
                    'assigned_to' => $moderator->id,
                    'title' => $template->title,
                    'description' => $template->description,
                    'price' => $template->price,
                    'completion_hours' => $template->completion_hours,
                    'guides_links' => $template->guides_links,
                    'attached_services' => $template->attached_services,
                    'work_day' => $template->work_day,
                    'status' => 'pending',
                ]);

                $generatedTasks[] = $task;
            }
        }

        return $generatedTasks;
    }

    /**
     * Выдача тасков по дням работы модератора
     */
    public function assignTasksForWorkDay(User $moderator, int $workDay): array
    {
        $currentWorkDay = $moderator->getCurrentWorkDay();

        if ($workDay > $currentWorkDay) {
            return []; // Нельзя выдать таски для будущих дней
        }

        $domainId = $moderator->domain_id;
        
        // Получаем шаблоны, которые подходят для текущего дня:
        // 1. Шаблоны без work_day (null) - универсальные, создаются для любого дня
        // 2. Шаблоны с work_day равным текущему дню
        // 3. Шаблоны с work_day меньше текущего дня (если еще не были созданы)
        $templates = TaskTemplate::where('domain_id', $domainId)
            ->where('is_active', true)
            ->where(function ($query) use ($workDay) {
                $query->whereNull('work_day') // Универсальные шаблоны
                      ->orWhere('work_day', $workDay) // Для текущего дня
                      ->orWhere(function ($q) use ($workDay) {
                          // Для прошедших дней, если еще не созданы
                          $q->where('work_day', '<', $workDay)
                            ->where('work_day', '>', 0);
                      });
            })
            ->get();

        $assignedTasks = [];

        foreach ($templates as $template) {
            // Проверяем задержку между тасками
            if (!$this->canAssignTask($moderator, $template)) {
                continue;
            }

            // Определяем work_day для создаваемого таска
            // Если у шаблона есть work_day, используем его, иначе используем текущий день
            $taskWorkDay = $template->work_day ?? $workDay;

            // Проверяем, не существует ли уже такой таск
            // Для универсальных шаблонов (work_day = null) проверяем, не был ли создан таск из этого шаблона для текущего дня
            $existingTask = Task::where('domain_id', $domainId)
                ->where('assigned_to', $moderator->id)
                ->where('template_id', $template->id)
                ->where('work_day', $taskWorkDay)
                ->first();

            if (!$existingTask) {
                $task = Task::create([
                    'domain_id' => $domainId,
                    'template_id' => $template->id,
                    'category_id' => $template->category_id,
                    'assigned_to' => $moderator->id,
                    'title' => $template->title,
                    'description' => $template->description,
                    'price' => $template->price,
                    'completion_hours' => $template->completion_hours,
                    'guides_links' => $template->guides_links,
                    'attached_services' => $template->attached_services,
                    'work_day' => $taskWorkDay,
                    'status' => 'pending',
                    'assigned_at' => Carbon::now(),
                ]);

                $assignedTasks[] = $task;
            }
        }

        return $assignedTasks;
    }

    /**
     * Проверка возможности выдачи таска с учетом задержки
     */
    protected function canAssignTask(User $moderator, TaskTemplate $template): bool
    {
        $profile = $moderator->moderatorProfile;
        if (!$profile) {
            return true; // Если нет профиля, разрешаем
        }

        $minimumMinutes = $profile->minimum_minutes_between_tasks ?? 5;

        // Проверяем последний назначенный таск
        $lastTask = Task::where('assigned_to', $moderator->id)
            ->whereNotNull('assigned_at')
            ->orderBy('assigned_at', 'desc')
            ->first();

        if (!$lastTask || !$lastTask->assigned_at) {
            return true; // Нет предыдущих тасков
        }

        $minutesSinceLastTask = Carbon::now()->diffInMinutes($lastTask->assigned_at);

        return $minutesSinceLastTask >= $minimumMinutes;
    }

    /**
     * Автоматическая выдача тасков для текущего дня работы модератора
     */
    public function autoAssignTasksForCurrentDay(User $moderator): array
    {
        $currentWorkDay = $moderator->getCurrentWorkDay();
        
        if (!$currentWorkDay) {
            // Первый день - генерируем первичные таски
            return $this->generatePrimaryTasksForModerator($moderator);
        }

        return $this->assignTasksForWorkDay($moderator, $currentWorkDay);
    }
}

