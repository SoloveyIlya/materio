<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['roles', 'administrator', 'domain'])
            ->where('domain_id', $request->user()->domain_id);

        // Фильтры
        if ($request->has('role')) {
            $roleName = $request->role;
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('name', $roleName);
            });
        }

        if ($request->has('online_only')) {
            $query->where('is_online', true);
        }

        if ($request->has('administrator_id')) {
            if ($request->administrator_id === 'my') {
                $query->where('administrator_id', $request->user()->id);
            } else {
                $query->where('administrator_id', $request->administrator_id);
            }
        }

        $users = $query->orderBy('created_at', 'desc')->get();

        return response()->json($users);
    }

    public function show(Request $request, User $user)
    {
        if ($user->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->load([
            'roles',
            'administrator',
            'moderators',
            'tasks' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'tasks.category',
            'moderatorProfile',
            'adminProfile',
            'domain',
        ]);

        // Статистика
        $stats = [
            'total_tasks' => $user->tasks()->count(),
            'completed_tasks' => $user->tasks()->where('status', 'completed')->count(),
            'in_progress_tasks' => $user->tasks()->where('status', 'in_progress')->count(),
            'pending_tasks' => $user->tasks()->where('status', 'pending')->count(),
        ];

        return response()->json([
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, User $user)
    {
        if ($user->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'timezone' => 'nullable|string',
            'work_start_date' => 'nullable|date',
            'administrator_id' => 'nullable|exists:users,id',
        ]);

        $user->update($validated);

        return response()->json($user->load(['roles', 'administrator']));
    }

    public function sendTestTask(Request $request, User $user)
    {
        if ($user->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Проверяем, что пользователь - модератор
        if (!$user->hasRole('moderator')) {
            return response()->json(['message' => 'User is not a moderator'], 400);
        }

        // Находим категорию "Test" или создаем тестовую задачу
        $testCategory = \App\Models\TaskCategory::where('domain_id', $request->user()->domain_id)
            ->where('slug', 'test')
            ->first();

        if (!$testCategory) {
            return response()->json(['message' => 'Test category not found'], 404);
        }

        $task = \App\Models\Task::create([
            'domain_id' => $request->user()->domain_id,
            'category_id' => $testCategory->id,
            'assigned_to' => $user->id,
            'title' => 'Test Task',
            'description' => 'This is a test task created by administrator',
            'status' => 'pending',
            'assigned_at' => now(),
        ]);

        return response()->json([
            'message' => 'Test task sent',
            'task' => $task,
        ]);
    }
}
