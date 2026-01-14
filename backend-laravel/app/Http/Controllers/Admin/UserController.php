<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        
        if (!$currentUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = User::withTrashed()
            ->with(['roles', 'administrator', 'domain'])
            ->where('domain_id', $currentUser->domain_id);

        // Фильтры
        if ($request->has('role')) {
            $roleName = $request->role;
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('name', $roleName);
            });
        } elseif (str_contains($request->path(), 'moderators')) {
            // Автоматически фильтруем по роли moderator, если запрос идет на /admin/moderators
            // и параметр role не передан
            $query->whereHas('roles', function ($q) {
                $q->where('name', 'moderator');
            });
        }

        if ($request->has('online_only')) {
            $query->where('is_online', true);
        }

        if ($request->has('administrator_id')) {
            if ($request->administrator_id === 'my') {
                $query->where('administrator_id', $request->user()->id);
            } elseif ($request->administrator_id === 'null') {
                // Показываем пользователей, которые ни за кем не закреплены
                $query->whereNull('administrator_id');
            } else {
                $query->where('administrator_id', $request->administrator_id);
            }
        }

        $users = $query->orderBy('created_at', 'desc')->get();

        return response()->json($users);
    }

    public function show(Request $request, $id)
    {
        try {
            $currentUser = $request->user();
            
            // Логируем запрос для отладки
            \Log::info('UserController@show', [
                'requested_user_id' => $id,
                'current_user_id' => $currentUser?->id,
                'current_user_domain_id' => $currentUser?->domain_id,
            ]);

            if (!$currentUser) {
                \Log::warning('No authenticated user');
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Получаем пользователя, включая удаленных (для админов)
            $user = User::withTrashed()->find($id);
            
            if (!$user) {
                \Log::warning('User not found in database', [
                    'user_id' => $id,
                    'all_users_count' => User::withTrashed()->count(),
                ]);
                return response()->json([
                    'message' => 'User not found',
                    'user_id' => $id
                ], 404);
            }

            \Log::info('User found', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_domain_id' => $user->domain_id,
                'user_deleted_at' => $user->deleted_at,
                'current_user_domain_id' => $currentUser->domain_id,
            ]);

            if ($user->domain_id !== $currentUser->domain_id) {
                \Log::warning('Domain mismatch', [
                    'user_id' => $user->id,
                    'user_domain_id' => $user->domain_id,
                    'current_user_domain_id' => $currentUser->domain_id,
                ]);
                return response()->json([
                    'message' => 'Forbidden - Domain mismatch',
                    'user_domain_id' => $user->domain_id,
                    'current_domain_id' => $currentUser->domain_id
                ], 403);
            }

            $user->load([
                'roles',
                'administrator',
                'moderators',
                'tasks' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
                'tasks.categories',
                'moderatorProfile',
                'adminProfile',
                'domain',
                'userDocuments.requiredDocument',
                'testResults.test',
            ]);

            // Статистика - используем загруженные задачи из коллекции
            $loadedTasks = $user->tasks ?? collect();
            $stats = [
                'total_tasks' => $loadedTasks->count(),
                'completed_tasks' => $loadedTasks->where('status', 'approved')->count(),
                'in_progress_tasks' => $loadedTasks->where('status', 'in_progress')->count()
                    + $loadedTasks->where('status', 'completed_by_moderator')->count()
                    + $loadedTasks->where('status', 'under_admin_review')->count(),
                'pending_tasks' => $loadedTasks->where('status', 'pending')->count(),
            ];

            // Загружаем все тесты для отображения
            $tests = \App\Models\Test::where('domain_id', $currentUser->domain_id)
                ->where('is_active', true)
                ->with('level')
                ->orderBy('order', 'asc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Загружаем обязательные документы
            $requiredDocuments = \App\Models\RequiredDocument::where('domain_id', $currentUser->domain_id)
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
        } catch (\Exception $e) {
            \Log::error('Error in UserController@show', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $id ?? null,
            ]);
            return response()->json([
                'message' => 'Internal server error',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while loading user',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $currentUser = $request->user();
        
        if (!$currentUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'timezone' => 'nullable|string',
            'administrator_id' => 'nullable|exists:users,id',
        ]);

        // Определяем администратора: если не указан, используем текущего админа
        $administratorId = !empty($validated['administrator_id']) ? $validated['administrator_id'] : $currentUser->id;

        // Проверяем, что указанный администратор существует и является админом
        $administrator = User::find($administratorId);
        if (!$administrator || !$administrator->isAdmin()) {
            return response()->json(['message' => 'Invalid administrator'], 400);
        }

        // Проверяем, что администратор в том же домене
        if ($administrator->domain_id !== $currentUser->domain_id) {
            return response()->json(['message' => 'Administrator must be in the same domain'], 400);
        }

        // Создаем пользователя-модератора
        $user = User::create([
            'domain_id' => $currentUser->domain_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']), // Явно хешируем пароль
            'registration_password' => $validated['password'],
            'timezone' => $validated['timezone'] ?? 'UTC',
            'administrator_id' => $administratorId,
        ]);

        // Создаем роль moderator, если её нет
        $role = \App\Models\Role::firstOrCreate(
            ['name' => 'moderator'],
            [
                'display_name' => 'Moderator',
                'description' => 'Moderator access',
            ]
        );

        // Присваиваем роль moderator
        $user->roles()->attach($role->id);

        // Создаем профиль модератора
        \App\Models\ModeratorProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['minimum_minutes_between_tasks' => 5]
        );

        // Синхронизируем аватарку админа с новым модератором
        if ($administrator->avatar) {
            $this->syncAdminAvatarToModerator($administrator, $user);
        }

        // Загружаем связи
        $user->load(['roles', 'administrator', 'moderatorProfile']);
        $user->makeVisible('registration_password');

        return response()->json([
            'user' => $user,
            'message' => 'Moderator created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::withTrashed()->find($id);
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

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
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        // Если передан пароль, хешируем его и обновляем registration_password
        if (isset($validated['password'])) {
            $validated['registration_password'] = $validated['password'];
            $validated['password'] = Hash::make($validated['password']);
        }

        // Проверяем, изменился ли administrator_id (для синхронизации аватарки)
        // Загружаем роли для корректной проверки isModerator()
        $user->load('roles');
        $oldAdministratorId = $user->administrator_id;
        $administratorChanged = isset($validated['administrator_id']) && 
                                $validated['administrator_id'] !== $oldAdministratorId &&
                                $user->isModerator();

        // Обработка загрузки аватарки
        if ($request->hasFile('avatar')) {
            $avatarFile = $request->file('avatar');
            
            // Удаляем старую аватарку, если она есть
            if ($user->avatar) {
                // Если аватарка содержит URL, извлекаем относительный путь
                $oldAvatarPath = $user->avatar;
                if (strpos($oldAvatarPath, '/storage/') !== false) {
                    $oldAvatarPath = str_replace('/storage/', '', parse_url($oldAvatarPath, PHP_URL_PATH));
                }
                
                if (Storage::disk('public')->exists($oldAvatarPath)) {
                    Storage::disk('public')->delete($oldAvatarPath);
                }
            }
            
            // Сохраняем новую аватарку
            $path = $avatarFile->store('avatars', 'public');
            $validated['avatar'] = Storage::disk('public')->url($path);
            
            // Если это админ, обновляем аватарку у всех закрепленных пользователей
            if ($user->isAdmin()) {
                $assignedUsers = User::where('administrator_id', $user->id)->get();
                foreach ($assignedUsers as $assignedUser) {
                    // Удаляем старую аватарку закрепленного пользователя, если она есть
                    if ($assignedUser->avatar) {
                        $oldUserAvatarPath = $assignedUser->avatar;
                        if (strpos($oldUserAvatarPath, '/storage/') !== false) {
                            $oldUserAvatarPath = str_replace('/storage/', '', parse_url($oldUserAvatarPath, PHP_URL_PATH));
                        }
                        
                        if (Storage::disk('public')->exists($oldUserAvatarPath)) {
                            Storage::disk('public')->delete($oldUserAvatarPath);
                        }
                    }
                    
                    // Копируем файл для каждого пользователя, чтобы у каждого была своя копия
                    $newPath = 'avatars/user_' . $assignedUser->id . '_' . time() . '.' . $avatarFile->getClientOriginalExtension();
                    Storage::disk('public')->copy($path, $newPath);
                    $assignedUser->update(['avatar' => Storage::disk('public')->url($newPath)]);
                }
            }
        }

        $user->update($validated);

        // Если модератор был перезакреплен к другому админу, синхронизируем аватарку нового админа
        if ($administratorChanged) {
            $newAdministratorId = $validated['administrator_id'] ?? null;
            if ($newAdministratorId) {
                $newAdministrator = User::find($newAdministratorId);
                if ($newAdministrator && $newAdministrator->avatar) {
                    $this->syncAdminAvatarToModerator($newAdministrator, $user);
                    // Перезагружаем пользователя после синхронизации аватарки
                    $user->refresh();
                }
            }
        }

        // Перезагружаем пользователя, чтобы вернуть актуальные данные, включая registration_password
        $user->refresh();
        $user->makeVisible('registration_password');

        return response()->json([
            'user' => $user->load(['roles', 'administrator']),
            'registration_password' => $user->registration_password
        ]);
    }

    public function sendTestTask(Request $request, $id)
    {
        $user = User::withTrashed()->find($id);
        
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

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

    /**
     * Синхронизирует аватарку админа с модератором
     * Копирует файл аватарки админа и присваивает его модератору
     */
    private function syncAdminAvatarToModerator(User $administrator, User $moderator): void
    {
        if (!$administrator->avatar || !$moderator->id) {
            return;
        }

        try {
            // Извлекаем путь к файлу из URL аватарки админа
            $adminAvatarPath = $administrator->avatar;
            if (strpos($adminAvatarPath, '/storage/') !== false) {
                $adminAvatarPath = str_replace('/storage/', '', parse_url($adminAvatarPath, PHP_URL_PATH));
            } else {
                $adminAvatarPath = str_replace(Storage::disk('public')->url(''), '', $adminAvatarPath);
            }
            
            // Удаляем первый слеш, если есть
            $adminAvatarPath = ltrim($adminAvatarPath, '/');
            
            // Проверяем, существует ли файл
            if (!Storage::disk('public')->exists($adminAvatarPath)) {
                \Log::warning('Admin avatar file not found', [
                    'admin_id' => $administrator->id,
                    'path' => $adminAvatarPath,
                ]);
                return;
            }

            // Получаем расширение файла
            $extension = pathinfo($adminAvatarPath, PATHINFO_EXTENSION);
            if (!$extension) {
                // Если расширение не найдено, пробуем определить по содержимому
                try {
                    $mimeType = Storage::disk('public')->mimeType($adminAvatarPath);
                    switch ($mimeType) {
                        case 'image/jpeg':
                            $extension = 'jpg';
                            break;
                        case 'image/png':
                            $extension = 'png';
                            break;
                        case 'image/gif':
                            $extension = 'gif';
                            break;
                        case 'image/webp':
                            $extension = 'webp';
                            break;
                        default:
                            $extension = 'jpg';
                    }
                } catch (\Exception $e) {
                    $extension = 'jpg'; // По умолчанию jpg
                }
            }

            // Удаляем старую аватарку модератора, если она есть
            if ($moderator->avatar) {
                $oldModeratorAvatarPath = $moderator->avatar;
                if (strpos($oldModeratorAvatarPath, '/storage/') !== false) {
                    $oldModeratorAvatarPath = str_replace('/storage/', '', parse_url($oldModeratorAvatarPath, PHP_URL_PATH));
                } else {
                    $oldModeratorAvatarPath = str_replace(Storage::disk('public')->url(''), '', $oldModeratorAvatarPath);
                }
                
                $oldModeratorAvatarPath = ltrim($oldModeratorAvatarPath, '/');
                
                if ($oldModeratorAvatarPath && Storage::disk('public')->exists($oldModeratorAvatarPath)) {
                    Storage::disk('public')->delete($oldModeratorAvatarPath);
                }
            }

            // Копируем файл для модератора с новым именем
            $newPath = 'avatars/user_' . $moderator->id . '_' . time() . '.' . $extension;
            Storage::disk('public')->copy($adminAvatarPath, $newPath);
            
            // Обновляем аватарку модератора
            $moderator->update(['avatar' => Storage::disk('public')->url($newPath)]);
            
            \Log::info('Admin avatar synced to moderator', [
                'admin_id' => $administrator->id,
                'moderator_id' => $moderator->id,
                'new_path' => $newPath,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error syncing admin avatar to moderator', [
                'admin_id' => $administrator->id,
                'moderator_id' => $moderator->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
