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
        
        // Количество выполненных тасков (approved)
        $completedTasks = Task::where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                      $assignmentQuery->where('assigned_to', $user->id);
                  });
            })
            ->where('status', 'approved')
            ->count();

        // Общее количество тасков (все завершенные)
        $totalTasks = Task::where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                      $assignmentQuery->where('assigned_to', $user->id);
                  });
            })
            ->whereIn('status', ['approved', 'rejected', 'completed_by_moderator', 'under_admin_review', 'sent_for_revision'])
            ->count();

        // Процент успешно выполненных (approved/total)
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

            // Непрочитанные тикеты в support (тикеты модератора с непрочитанными ответами)
            $unreadSupportTickets = Ticket::where('domain_id', $user->domain_id)
                ->where('user_id', $user->id)
                ->whereHas('messages', function ($q) use ($user) {
                    $q->where('from_user_id', '!=', $user->id)
                      ->where('to_user_id', $user->id)
                      ->where('is_read', false)
                      ->where('type', 'support');
                })
                ->count();
            $counts['support'] = $unreadSupportTickets;

            // Задачи на проверке для модератора нет
            $counts['tasks'] = 0;

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
