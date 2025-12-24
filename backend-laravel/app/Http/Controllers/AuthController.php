<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            // Получаем домен по умолчанию или создаем его
            $domain = $request->domain_id 
                ? \App\Models\Domain::find($request->domain_id)
                : \App\Models\Domain::where('domain', 'default')->first();

            if (!$domain) {
                // Создаем домен по умолчанию, если его нет
                $domain = \App\Models\Domain::create([
                    'domain' => 'default',
                    'name' => 'Default Domain',
                    'settings' => [],
                    'is_active' => true,
                ]);
            }

            $user = User::create([
                'domain_id' => $domain->id,
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password, // Laravel автоматически захеширует через casts в модели
                'registration_password' => $request->password, // ВНИМАНИЕ: Хранение в открытом виде небезопасно! Добавлено по требованию ТЗ
                'timezone' => $request->timezone ?? 'UTC',
            ]);

            // Присваиваем роль moderator по умолчанию, если не указана
            $roleName = $request->role ?? 'moderator';
            
            // Создаем роли, если их нет
            $role = \App\Models\Role::firstOrCreate(
                ['name' => $roleName],
                [
                    'display_name' => $roleName === 'admin' ? 'Administrator' : 'Moderator',
                    'description' => $roleName === 'admin' ? 'Full system access' : 'Moderator access',
                ]
            );
            
            // Также создаем другую роль, если нужна
            if ($roleName === 'moderator') {
                \App\Models\Role::firstOrCreate(
                    ['name' => 'admin'],
                    [
                        'display_name' => 'Administrator',
                        'description' => 'Full system access',
                    ]
                );
            } else {
                \App\Models\Role::firstOrCreate(
                    ['name' => 'moderator'],
                    [
                        'display_name' => 'Moderator',
                        'description' => 'Moderator access',
                    ]
                );
            }
            
            $user->roles()->attach($role->id);
            
            // Создаем профиль в зависимости от роли
            if ($roleName === 'moderator') {
                \App\Models\ModeratorProfile::firstOrCreate(
                    ['user_id' => $user->id],
                    ['minimum_minutes_between_tasks' => 5]
                );
            } elseif ($roleName === 'admin') {
                \App\Models\AdminProfile::firstOrCreate(['user_id' => $user->id]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $user->load('roles', 'moderatorProfile', 'adminProfile'),
                'token' => $token,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Registration error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'message' => 'Ошибка при регистрации: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            // Проверяем, существует ли пользователь
            $user = User::where('email', $request->email)->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'Неверный email или пароль',
                ], 401);
            }

            // Пытаемся аутентифицировать
            if (!Auth::attempt($request->only('email', 'password'))) {
                // Логируем попытку входа для отладки
                \Log::warning('Login attempt failed', [
                    'email' => $request->email,
                    'user_exists' => true,
                    'user_id' => $user->id,
                ]);
                
                return response()->json([
                    'message' => 'Неверный email или пароль',
                ], 401);
            }

            // Загружаем пользователя с отношениями
            $user = User::where('email', $request->email)
                ->with('roles', 'moderatorProfile', 'adminProfile', 'domain')
                ->firstOrFail();
            
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage(), [
                'email' => $request->email,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Ошибка при входе: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'moderatorProfile', 'adminProfile', 'domain');
        
        return response()->json($user);
    }
}

