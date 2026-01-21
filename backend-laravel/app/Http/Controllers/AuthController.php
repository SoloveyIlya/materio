<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\TimezoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected TimezoneService $timezoneService;

    public function __construct(TimezoneService $timezoneService)
    {
        $this->timezoneService = $timezoneService;
    }

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

            // Определяем таймзону: сначала из запроса, потом из браузера, потом по IP, иначе UTC
            $timezone = $request->timezone;
            
            if (!$timezone || $timezone === 'UTC') {
                // Пробуем получить таймзону браузера из заголовка или запроса
                $browserTimezone = $request->header('X-Timezone') ?? $request->input('browser_timezone');
                if ($browserTimezone) {
                    $timezone = $this->timezoneService->getBrowserTimezone($browserTimezone);
                }
            }
            
            // Если таймзона все еще не определена, пробуем определить по IP
            if (!$timezone || $timezone === 'UTC') {
                $ip = $request->ip();
                $timezone = $this->timezoneService->getTimezoneByIp($ip) ?? 'UTC';
            }

            $user = User::create([
                'domain_id' => $domain->id,
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password), // Явно хешируем пароль
                'registration_password' => $request->password, // ВНИМАНИЕ: Хранение в открытом виде небезопасно! Добавлено по требованию ТЗ
                'timezone' => $timezone,
                'ip_address' => $request->ip(),
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
            
            // Обновляем timezone из браузера при входе, если она передана
            $browserTimezone = $request->header('X-Timezone') ?? $request->input('browser_timezone');
            if ($browserTimezone) {
                $timezone = $this->timezoneService->getBrowserTimezone($browserTimezone);
                if ($timezone) {
                    $user->timezone = $timezone;
                    $user->save();
                }
            }
            
            // Обновляем статус активности при входе
            $user->last_seen_at = now();
            $user->is_online = true;
            $user->ip_address = $request->ip();
            $user->user_agent = $request->userAgent();
            $user->save();
            
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
        $user = $request->user();
        
        // Устанавливаем пользователя как офлайн при выходе
        if ($user) {
            $user->is_online = false;
            $user->save();
        }
        
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function markOffline(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Устанавливаем пользователя как офлайн при отключении WebSocket
        if ($user) {
            $user->is_online = false;
            $user->save();
            
            // Broadcast user status change event
            broadcast(new \App\Events\UserStatusChanged($user->id, $user->domain_id, false, $user->last_seen_at))->toOthers();
        }
        
        return response()->json([
            'message' => 'User marked as offline',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Обновляем timezone из браузера, если она передана
        $browserTimezone = $request->header('X-Timezone') ?? $request->input('browser_timezone');
        if ($browserTimezone) {
            $timezone = $this->timezoneService->getBrowserTimezone($browserTimezone);
            if ($timezone && $timezone !== $user->timezone) {
                $user->timezone = $timezone;
                $user->save();
            }
        }
        
        // Загружаем пользователя с отношениями
        $user = $user->load('roles', 'moderatorProfile', 'adminProfile', 'domain', 'testResults.test', 'userDocuments.requiredDocument');
        
        // Автоматически создаем moderatorProfile, если пользователь - модератор и у него нет профиля
        if ($user->isModerator() && !$user->moderatorProfile) {
            \App\Models\ModeratorProfile::create([
                'user_id' => $user->id,
                'minimum_minutes_between_tasks' => 5
            ]);
            // Перезагружаем пользователя с новым профилем
            $user = $user->fresh(['moderatorProfile']);
        }
        
        return response()->json($user);
    }
}

