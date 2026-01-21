<?php

namespace App\Jobs;

use App\Models\Task;
use App\Models\TaskSchedule;
use App\Models\User;
use App\Events\TaskAssigned;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTask implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Task $task,
        public User $user
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Назначаем таск модератору
            $this->task->update([
                'assigned_to' => $this->user->id,
                'assigned_at' => now(),
                'status' => 'pending', // Таск готов к работе
            ]);

            // Обновляем статус в расписании
            $schedule = TaskSchedule::where('task_id', $this->task->id)
                ->where('user_id', $this->user->id)
                ->where('is_sent', false)
                ->first();

            if ($schedule) {
                $schedule->update([
                    'is_sent' => true,
                    'sent_at' => now(),
                ]);
            }

            // Broadcast event to notify moderator about the new task
            broadcast(new TaskAssigned($this->task))->toOthers();

            Log::info("Task {$this->task->id} sent to user {$this->user->id}");
        } catch (\Exception $e) {
            Log::error("Failed to send task {$this->task->id} to user {$this->user->id}: " . $e->getMessage());
            throw $e;
        }
    }
}
