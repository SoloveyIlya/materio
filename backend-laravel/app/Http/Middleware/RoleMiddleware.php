<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = $request->user();
        
        // Загружаем роли, если они не загружены
        if (!$user->relationLoaded('roles')) {
            $user->load('roles');
        }
        
        $userRoles = $user->roles->pluck('name')->toArray();
        
        // Логирование для отладки (можно убрать в продакшене)
        \Log::debug('RoleMiddleware check', [
            'user_id' => $user->id,
            'user_roles' => $userRoles,
            'required_roles' => $roles,
            'has_access' => !empty(array_intersect($roles, $userRoles))
        ]);
        
        if (empty(array_intersect($roles, $userRoles))) {
            return response()->json([
                'message' => 'Unauthorized. Required roles: ' . implode(', ', $roles) . '. Your roles: ' . implode(', ', $userRoles ?: ['none'])
            ], 403);
        }

        return $next($request);
    }
}

