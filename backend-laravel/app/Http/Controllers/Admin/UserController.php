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
            'userDocuments.requiredDocument',
            'testResults.test',
        ]);

        // Статистика
        $stats = [
            'total_tasks' => $user->tasks()->count(),
            'completed_tasks' => $user->tasks()->where('status', 'completed')->count(),
            'in_progress_tasks' => $user->tasks()->where('status', 'in_progress')->count(),
            'pending_tasks' => $user->tasks()->where('status', 'pending')->count(),
        ];

        // Загружаем все тесты для отображения
        $tests = \App\Models\Test::where('domain_id', $request->user()->domain_id)
            ->where('is_active', true)
            ->with('level')
            ->orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Загружаем обязательные документы
        $requiredDocuments = \App\Models\RequiredDocument::where('domain_id', $request->user()->domain_id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        // Явно добавляем registration_password в ответ, так как он может быть скрыт
        $user->makeVisible('registration_password');

        return response()->json([
            'user' => $user,
            'stats' => $stats,
            'tests' => $tests,
            'required_documents' => $requiredDocuments,
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
            'password' => 'sometimes|required|string|min:6',
        ]);

        // Если передан пароль, хешируем его и обновляем registration_password
        if (isset($validated['password'])) {
            $validated['registration_password'] = $validated['password'];
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        // Перезагружаем пользователя, чтобы вернуть актуальные данные, включая registration_password
        $user->refresh();
        $user->makeVisible('registration_password');

        return response()->json([
            'user' => $user->load(['roles', 'administrator']),
            'registration_password' => $user->registration_password
        ]);
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
