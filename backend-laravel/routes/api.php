<?php

use App\Http\Controllers\Admin\TaskCategoryController;
use App\Http\Controllers\Admin\TaskTemplateController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Moderator\TaskController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
    });
});

// Admin routes
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    // Task Categories
    Route::apiResource('task-categories', TaskCategoryController::class);
    
    // Task Templates
    Route::apiResource('task-templates', TaskTemplateController::class);
});

// Moderator routes
Route::prefix('moderator')->middleware(['auth:sanctum', 'role:moderator'])->group(function () {
    // Tasks
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks/start-work', [TaskController::class, 'startWork']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::post('/tasks/{task}/start', [TaskController::class, 'start']);
    Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::get('/work-day', [TaskController::class, 'getCurrentWorkDay']);
});
