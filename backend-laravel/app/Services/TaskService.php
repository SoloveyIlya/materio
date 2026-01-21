<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskSchedule;
use App\Models\TaskTemplate;
use App\Models\User;
use App\Jobs\SendTask;
use App\Events\TaskAssigned;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

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
                // Создаём таск, но не назначаем модератору сразу.
                // Модератор будет получать таски только когда админ/расписание отправит их (TaskSchedule / SendTask).
                $task = Task::create([
                    'domain_id' => $domainId,
                    'template_id' => $template->id,
                    'category_id' => $template->category_id,
                    'assigned_to' => null,
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
                // Создаём таск без немедленного назначения — назначение происходит при отправке (TaskSchedule / SendTask)
                $task = Task::create([
                    'domain_id' => $domainId,
                    'template_id' => $template->id,
                    'category_id' => $template->category_id,
                    'assigned_to' => null,
                    'title' => $template->title,
                    'description' => $template->description,
                    'price' => $template->price,
                    'completion_hours' => $template->completion_hours,
                    'guides_links' => $template->guides_links,
                    'attached_services' => $template->attached_services,
                    'work_day' => $taskWorkDay,
                    'status' => 'pending',
                    'assigned_at' => null,
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

    /**
     * Планирование отправки тасков для модератора с учетом настроек
     * Использует уже созданные таски или создает из шаблонов, планирует их отправку в указанном временном диапазоне
     */
    public function scheduleTasksForModerator(User $moderator, int $workDay): array
    {
        $profile = $moderator->moderatorProfile;
        
        // Проверяем наличие настроек
        if (!$profile || !$profile->task_timezone || !$profile->task_start_time || !$profile->task_end_time) {
            Log::warning("User {$moderator->id} doesn't have task scheduling settings configured");
            return [];
        }

        $domainId = $moderator->domain_id;
        
        // Сначала проверяем, есть ли уже созданные таски для этого дня, назначенные модератору
        $existingTasks = Task::where('domain_id', $domainId)
            ->where('work_day', $workDay)
            ->where(function ($query) use ($moderator) {
                $query->where('assigned_to', $moderator->id)
                      ->orWhereNull('assigned_to'); // Также таски без назначения, которые можно назначить
            })
            ->where('status', 'pending')
            ->whereDoesntHave('schedules', function ($query) use ($moderator) {
                $query->where('user_id', $moderator->id)
                      ->where('is_sent', false);
            })
            ->get();
        
        $tasksToSchedule = [];
        
        // Если есть уже созданные таски, используем их
        if ($existingTasks->count() > 0) {
            foreach ($existingTasks as $task) {
                // Если таск без назначения, назначаем его модератору
                if (!$task->assigned_to) {
                    $task->update(['assigned_to' => $moderator->id]);
                    // Broadcast event to notify moderator about the newly assigned task
                    broadcast(new TaskAssigned($task))->toOthers();
                }
                $tasksToSchedule[] = $task;
            }
        } else {
            // Если нет созданных тасков, создаем из шаблонов
            $templates = TaskTemplate::where('domain_id', $domainId)
                ->where('is_active', true)
                ->where(function ($query) use ($workDay) {
                    $query->whereNull('work_day')
                          ->orWhere('work_day', $workDay);
                })
                ->orderBy('work_day')
                ->get();

            foreach ($templates as $template) {
                // Определяем work_day для таска
                $taskWorkDay = $template->work_day ?? $workDay;

                // Проверяем, не существует ли уже такой таск
                $existingTask = Task::where('domain_id', $domainId)
                    ->where(function ($query) use ($moderator) {
                        $query->where('assigned_to', $moderator->id)
                              ->orWhereNull('assigned_to');
                    })
                    ->where('template_id', $template->id)
                    ->where('work_day', $taskWorkDay)
                    ->first();
                
                // Также проверяем в расписании
                $existingSchedule = TaskSchedule::where('user_id', $moderator->id)
                    ->where('work_day', $taskWorkDay)
                    ->whereHas('task', function ($query) use ($template) {
                        $query->where('template_id', $template->id);
                    })
                    ->where('is_sent', false)
                    ->exists();

                if ($existingTask || $existingSchedule) {
                    continue; // Таск уже существует или запланирован
                }

                // Создаем таск без назначения (assigned_to = null)
                $task = Task::create([
                    'domain_id' => $domainId,
                    'template_id' => $template->id,
                    'category_id' => $template->category_id,
                    'assigned_to' => null, // Пока не назначен
                    'title' => $template->title,
                    'description' => $template->description,
                    'price' => $template->price,
                    'completion_hours' => $template->completion_hours,
                    'guides_links' => $template->guides_links,
                    'attached_services' => $template->attached_services,
                    'work_day' => $taskWorkDay,
                    'status' => 'pending',
                    'assigned_at' => null, // Будет установлено при отправке
                ]);

                $tasksToSchedule[] = $task;
            }
        }

        // Теперь планируем отправку всех тасков
        $scheduledTasks = [];
        $currentTime = Carbon::now($profile->task_timezone);
        
        // Вычисляем дату дня работы модератора
        $workStartDate = Carbon::parse($moderator->work_start_date, $profile->task_timezone);
        $workDayDate = $workStartDate->copy()->addDays($workDay - 1);
        
        // Получаем начало и конец временного диапазона
        $startTimeStr = is_string($profile->task_start_time) 
            ? $profile->task_start_time 
            : Carbon::parse($profile->task_start_time)->format('H:i:s');
        $endTimeStr = is_string($profile->task_end_time) 
            ? $profile->task_end_time 
            : Carbon::parse($profile->task_end_time)->format('H:i:s');
            
        $startTime = Carbon::parse($workDayDate->format('Y-m-d') . ' ' . $startTimeStr, $profile->task_timezone);
        $endTime = Carbon::parse($workDayDate->format('Y-m-d') . ' ' . $endTimeStr, $profile->task_timezone);
        
        // Если день работы уже наступил, но текущее время еще в диапазоне - начинаем с текущего времени
        if ($currentTime->gte($workDayDate->startOfDay()) && $currentTime->lte($endTime)) {
            if ($currentTime->gt($startTime)) {
                $startTime = $currentTime->copy();
            }
        }

        $scheduledAt = $startTime->copy();
        $minInterval = $profile->task_min_interval ?? 1;
        $maxInterval = $profile->task_max_interval ?? 5;

        foreach ($tasksToSchedule as $task) {
            // Генерируем рандомный интервал между тасками
            $randomInterval = rand($minInterval, $maxInterval);
            
            // Вычисляем время отправки
            $scheduledAt->addMinutes($randomInterval);
            
            // Если вышли за пределы временного диапазона, переносим на следующий день
            if ($scheduledAt->gt($endTime)) {
                $nextDay = $scheduledAt->copy()->addDay();
                $scheduledAt = Carbon::parse($nextDay->format('Y-m-d') . ' ' . $startTimeStr, $profile->task_timezone);
                $endTime = Carbon::parse($nextDay->format('Y-m-d') . ' ' . $endTimeStr, $profile->task_timezone);
                
                // Добавляем рандомный интервал от начала нового дня
                $randomInterval = rand($minInterval, $maxInterval);
                $scheduledAt->addMinutes($randomInterval);
            }

            // Создаем запись в расписании
            $schedule = TaskSchedule::create([
                'task_id' => $task->id,
                'user_id' => $moderator->id,
                'work_day' => $task->work_day ?? $workDay,
                'scheduled_at' => $scheduledAt->copy(),
                'is_sent' => false,
            ]);

            // Планируем отправку через очередь
            SendTask::dispatch($task, $moderator)
                ->delay($scheduledAt->copy());

            $scheduledTasks[] = [
                'task' => $task,
                'scheduled_at' => $scheduledAt->copy(),
            ];

            Log::info("Task {$task->id} scheduled for user {$moderator->id} at {$scheduledAt->toDateTimeString()}");
        }

        return $scheduledTasks;
    }

    /**
     * Планирование тасков первого дня для модератора
     */
    public function scheduleFirstDayTasks(User $moderator): array
    {
        if (!$moderator->work_start_date) {
            $moderator->update([
                'work_start_date' => Carbon::now($moderator->timezone ?? 'UTC')->toDateString(),
            ]);
        }

        return $this->scheduleTasksForModerator($moderator, 1);
    }
}

