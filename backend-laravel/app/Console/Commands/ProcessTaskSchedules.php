<?php

namespace App\Console\Commands;

use App\Models\TaskSchedule;
use App\Models\User;
use App\Services\TaskService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessTaskSchedules extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tasks:process-schedules';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process task schedules - send scheduled tasks and plan tasks for next day';

    protected TaskService $taskService;

    public function __construct(TaskService $taskService)
    {
        parent::__construct();
        $this->taskService = $taskService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing task schedules...');

        // 1. Отправляем таски, которые должны быть отправлены сейчас
        $this->sendScheduledTasks();

        // 2. Планируем таски для следующего дня для всех модераторов
        $this->scheduleNextDayTasks();

        $this->info('Task schedules processed successfully.');
    }

    /**
     * Отправка запланированных тасков, которые должны быть отправлены сейчас
     */
    protected function sendScheduledTasks(): void
    {
        $now = Carbon::now();
        
        // Получаем все неотправленные таски, которые должны быть отправлены
        $schedules = TaskSchedule::where('is_sent', false)
            ->where('scheduled_at', '<=', $now)
            ->with(['task', 'user'])
            ->get();

        $count = 0;
        foreach ($schedules as $schedule) {
            try {
                // Проверяем, что таск и пользователь существуют
                if (!$schedule->task || !$schedule->user) {
                    $schedule->update(['is_sent' => true]);
                    continue;
                }

                // Отправляем таск через Job
                \App\Jobs\SendTask::dispatch($schedule->task, $schedule->user);
                
                $schedule->update([
                    'is_sent' => true,
                    'sent_at' => $now,
                ]);

                $count++;
                $this->line("Task {$schedule->task->id} sent to user {$schedule->user->id}");
            } catch (\Exception $e) {
                Log::error("Failed to send scheduled task {$schedule->id}: " . $e->getMessage());
                $this->error("Failed to send task {$schedule->id}: " . $e->getMessage());
            }
        }

        $this->info("Sent {$count} scheduled tasks.");
    }

    /**
     * Планирование тасков для следующего дня
     */
    protected function scheduleNextDayTasks(): void
    {
        // Получаем всех модераторов с настроенными параметрами тасков
        $moderators = User::whereHas('roles', function ($query) {
            $query->where('name', 'moderator');
        })
        ->whereHas('moderatorProfile', function ($query) {
            $query->whereNotNull('task_timezone')
                  ->whereNotNull('task_start_time')
                  ->whereNotNull('task_end_time');
        })
        ->with('moderatorProfile')
        ->get();

        $count = 0;
        foreach ($moderators as $moderator) {
            try {
                $currentWorkDay = $moderator->getCurrentWorkDay();
                
                if (!$currentWorkDay) {
                    continue; // Модератор еще не начал работу
                }

                // Планируем таски для текущего дня, если они еще не запланированы
                // Это нужно для случая, когда модератор начал работу, но таски еще не запланированы
                $existingSchedulesForToday = TaskSchedule::where('user_id', $moderator->id)
                    ->where('work_day', $currentWorkDay)
                    ->where('is_sent', false)
                    ->count();

                if ($existingSchedulesForToday == 0) {
                    // Планируем таски для текущего дня
                    $scheduledTasks = $this->taskService->scheduleTasksForModerator($moderator, $currentWorkDay);
                    
                    if (count($scheduledTasks) > 0) {
                        $count++;
                        $this->line("Scheduled tasks for user {$moderator->id} for work day {$currentWorkDay}");
                    }
                }

                // Проверяем, не запланированы ли уже таски для следующего дня
                $nextWorkDay = $currentWorkDay + 1;
                $existingSchedules = TaskSchedule::where('user_id', $moderator->id)
                    ->where('work_day', $nextWorkDay)
                    ->where('is_sent', false)
                    ->count();

                if ($existingSchedules > 0) {
                    continue; // Таски для следующего дня уже запланированы
                }

                // Планируем таски для следующего дня
                $scheduledTasks = $this->taskService->scheduleTasksForModerator($moderator, $nextWorkDay);
                
                if (count($scheduledTasks) > 0) {
                    $count++;
                    $this->line("Scheduled tasks for user {$moderator->id} for work day {$nextWorkDay}");
                }
            } catch (\Exception $e) {
                Log::error("Failed to schedule tasks for user {$moderator->id}: " . $e->getMessage());
                $this->error("Failed to schedule tasks for user {$moderator->id}: " . $e->getMessage());
            }
        }

        $this->info("Scheduled tasks for {$count} moderators.");
    }
}
