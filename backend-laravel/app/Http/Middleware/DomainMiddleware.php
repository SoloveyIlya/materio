<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DomainMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user || !$user->domain_id) {
            return response()->json(['message' => 'Domain not set for user'], 403);
        }

        // Устанавливаем domain_id для всех запросов
        $request->merge(['domain_id' => $user->domain_id]);

        return $next($request);
    }
}

