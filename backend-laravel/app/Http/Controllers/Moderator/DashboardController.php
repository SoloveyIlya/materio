<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\ModeratorEarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Количество выполненных тасков (approved)
        $completedTasks = Task::where('assigned_to', $user->id)
            ->where('status', 'approved')
            ->count();

        // Общее количество тасков
        $totalTasks = Task::where('assigned_to', $user->id)
            ->whereIn('status', ['approved', 'rejected', 'completed_by_moderator', 'under_admin_review', 'sent_for_revision'])
            ->count();

        // Процент успешно выполненных
        $successRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

        // Количество проработанных дней
        $workDays = $user->work_start_date 
            ? max(1, now($user->timezone ?? 'UTC')->diffInDays($user->work_start_date) + 1)
            : 0;

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
}
