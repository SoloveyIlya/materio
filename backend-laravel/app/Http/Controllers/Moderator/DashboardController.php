<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\ModeratorEarning;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Базовый запрос для задач модератора
        $taskQuery = function ($q) use ($user) {
            $q->where('assigned_to', $user->id)
              ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                  $assignmentQuery->where('assigned_to', $user->id);
              });
        };
        
        // Количество выполненных тасков (approved)
        $completedTasks = Task::where($taskQuery)
            ->where('status', 'approved')
            ->count();

        // Количество задач в процессе выполнения
        $inProgressTasks = Task::where($taskQuery)
            ->where('status', 'in_progress')
            ->count();

        // Общее количество тасков (все задачи модератора: завершенные + в процессе)
        $totalTasks = Task::where($taskQuery)
            ->whereIn('status', [
                'approved', 
                'rejected', 
                'completed_by_moderator', 
                'under_admin_review', 
                'sent_for_revision',
                'in_progress'
            ])
            ->count();

        // Процент успешно выполненных (approved/total, если есть завершенные задачи)
        $successRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

        // Количество проработанных дней
        $workDays = 0;
        if ($user->work_start_date) {
            $startDate = \Carbon\Carbon::parse($user->work_start_date);
            $now = \Carbon\Carbon::now($user->timezone ?? 'UTC');
            $workDays = max(1, $startDate->diffInDays($now) + 1);
        }

        // Сумма заработанных денег
        $totalEarnings = ModeratorEarning::where('moderator_id', $user->id)
            ->sum('amount');

        return response()->json([
            'completed_tasks' => $completedTasks,
            'in_progress_tasks' => $inProgressTasks,
            'total_tasks' => $totalTasks,
            'success_rate' => $successRate,
            'work_days' => $workDays,
            'work_start_date' => $user->work_start_date,
            'timezone' => $user->timezone ?? 'UTC',
            'total_earnings' => number_format($totalEarnings, 2, '.', ''),
        ]);
    }

    public function getCounts(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            $counts = [];

            // Непрочитанные сообщения в чате от админа
            $administratorId = $user->administrator_id;
            if ($administratorId) {
                $unreadChatMessages = Message::where('domain_id', $user->domain_id)
                    ->where('type', 'message')
                    ->where('from_user_id', $administratorId)
                    ->where('to_user_id', $user->id)
                    ->where('is_read', false)
                    ->where('is_deleted', false)
                    ->count();
                $counts['chat'] = $unreadChatMessages;
            } else {
                $counts['chat'] = 0;
            }

            // Новые тикеты в support (статус open или in_progress для тикетов модератора)
            $newSupportTickets = Ticket::where('domain_id', $user->domain_id)
                ->where('user_id', $user->id)
                ->whereIn('status', ['open', 'in_progress'])
                ->count();
            $counts['support'] = $newSupportTickets;

            // Количество задач со статусом pending (ожидают выполнения) для модератора
            $pendingTasks = Task::where('domain_id', $user->domain_id)
                ->where('status', 'pending')
                ->count();
            $counts['tasks'] = $pendingTasks;
            
            // Логирование для отладки
            \Log::debug('Moderator tasks count', [
                'user_id' => $user->id,
                'domain_id' => $user->domain_id,
                'pending_tasks_count' => $pendingTasks,
            ]);

            return response()->json($counts);
        } catch (\Exception $e) {
            \Log::error('Get counts error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);
            
            return response()->json([
                'chat' => 0,
                'support' => 0,
                'tasks' => 0,
            ]);
        }
    }
}
