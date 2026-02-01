<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\DocumentationCategoryController;
use App\Http\Controllers\Admin\DocumentationPageController;
use App\Http\Controllers\Admin\SupportController as AdminSupportController;
use App\Http\Controllers\Admin\TestController;
use App\Http\Controllers\Admin\TestLevelController;
use App\Http\Controllers\Admin\RequiredDocumentController;
use App\Http\Controllers\Admin\TaskCategoryController;
use App\Http\Controllers\Admin\TaskController as AdminTaskController;
use App\Http\Controllers\Admin\TaskTemplateController;
use App\Http\Controllers\Admin\ToolController;
use App\Http\Controllers\Admin\TrainingQuestionController;
use App\Http\Controllers\Admin\ProfileController as AdminProfileController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\Moderator\DashboardController;
use App\Http\Controllers\Moderator\DocumentationController;
use App\Http\Controllers\Moderator\ProfileController;
use App\Http\Controllers\Moderator\SupportController;
use App\Http\Controllers\Moderator\TaskController;
use App\Http\Controllers\Moderator\TestController as ModeratorTestController;
use App\Http\Controllers\Moderator\ToolController as ModeratorToolController;
use App\Http\Controllers\Moderator\TrainingController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
    });
});

// User routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/user/mark-offline', [AuthController::class, 'markOffline']);
});

// Mark offline endpoint that accepts token in query (for sendBeacon)
Route::post('/user/mark-offline-beacon', [AuthController::class, 'markOfflineBeacon']);

// Admin routes
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin', 'activity'])->group(function () {
    // Task Categories
    Route::apiResource('task-categories', TaskCategoryController::class);
    
    // Task Templates
    Route::apiResource('task-templates', TaskTemplateController::class);

    // Documentation
    Route::apiResource('documentation-categories', DocumentationCategoryController::class);
    Route::apiResource('documentation-pages', DocumentationPageController::class);
    Route::post('/documentation-pages/{documentationPage}', [DocumentationPageController::class, 'update']); // For method spoofing with FormData
    Route::post('/documentation-pages/{documentationPage}', [DocumentationPageController::class, 'update']); // For method spoofing with FormData

    // Tests
    Route::apiResource('test-levels', TestLevelController::class);
    Route::apiResource('tests', TestController::class);

    // Required Documents
    Route::apiResource('required-documents', RequiredDocumentController::class);
    Route::post('/required-documents/{requiredDocument}', [RequiredDocumentController::class, 'update']); // Для поддержки FormData с _method: 'PUT'
    
    // User Documents (admin uploads document for user)
    Route::post('/user-documents', [RequiredDocumentController::class, 'uploadForUser']);

    // Tools
    Route::apiResource('tools', ToolController::class);

    // Dashboard
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);
    Route::get('/dashboard/counts', [AdminDashboardController::class, 'getCounts']);
    Route::post('/users/{user}/hide-from-dashboard', [AdminDashboardController::class, 'hideDeletedUser']);

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::post('/users/{id}/send-tasks', [UserController::class, 'sendTasks']);
    Route::get('/users/{id}/task-sending-config', [UserController::class, 'getTaskSendingConfig']);
    Route::get('/users/{id}/check-tests', [UserController::class, 'checkTestsStatus']);

    // Moderators (алиас для users с фильтром)
    Route::get('/moderators', [UserController::class, 'index']);
    Route::post('/moderators', [UserController::class, 'store']);

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/{activityLog}', [ActivityLogController::class, 'show']);

    // Tasks
    Route::get('/tasks', [AdminTaskController::class, 'index']);
    Route::post('/tasks', [AdminTaskController::class, 'store']);
    Route::get('/tasks/{task}', [AdminTaskController::class, 'show']);
    Route::put('/tasks/{task}', [AdminTaskController::class, 'update']);
    Route::post('/tasks/{task}', [AdminTaskController::class, 'update']); // Для поддержки FormData с _method: 'PUT'
    Route::delete('/tasks/{task}', [AdminTaskController::class, 'destroy']);
    Route::post('/tasks/{task}/moderate', [AdminTaskController::class, 'moderateResult']);
    Route::post('/tasks/{task}/view', [AdminTaskController::class, 'logView']);

    // Training Questions
    Route::get('/training-questions', [TrainingQuestionController::class, 'index']);
    Route::post('/training-questions/{question}/answer', [TrainingQuestionController::class, 'answer']);
    Route::post('/training-questions/{question}/resolve', [TrainingQuestionController::class, 'markResolved']);

    // Support Tickets
    Route::get('/support', [AdminSupportController::class, 'index']);
    Route::get('/support/{ticket}', [AdminSupportController::class, 'show']);
    Route::put('/support/{ticket}', [AdminSupportController::class, 'update']);
    Route::post('/support/{ticket}/reply', [AdminSupportController::class, 'reply']);

    // Profile
    Route::put('/profile', [AdminProfileController::class, 'updateProfile']);
    Route::post('/profile', [AdminProfileController::class, 'updateProfile']); // For FormData with method spoofing
    Route::put('/profile/password', [AdminProfileController::class, 'changePassword']);
    Route::put('/profile/work-schedule', [AdminProfileController::class, 'updateWorkSchedule']);
    Route::get('/profile/work-schedule', [AdminProfileController::class, 'getWorkSchedule']);
});

// Moderator routes
Route::prefix('moderator')->middleware(['auth:sanctum', 'role:moderator', 'activity'])->group(function () {
    // Tasks
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks/start-work', [TaskController::class, 'startWork']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::post('/tasks/{task}/start', [TaskController::class, 'start']);
    Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::post('/tasks/{task}/report', [TaskController::class, 'createReport']);
    Route::put('/tasks/{task}/report/tool', [TaskController::class, 'updateToolData']);
    Route::put('/tasks/{task}/report/additional', [TaskController::class, 'updateAdditionalInfo']);
    Route::get('/work-day', [TaskController::class, 'getCurrentWorkDay']);

    // Documentation
    Route::get('/documentation/categories', [DocumentationController::class, 'categories']);
    Route::get('/documentation/categories/{category}', [DocumentationController::class, 'category']);
    Route::get('/documentation/pages', [DocumentationController::class, 'pages']);
    Route::get('/documentation/pages/{id}', [DocumentationController::class, 'page']);

    // Tools
    Route::get('/tools', [ModeratorToolController::class, 'index']);
    Route::get('/tools/{tool}', [ModeratorToolController::class, 'show']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/counts', [DashboardController::class, 'getCounts']);

    // Training Center
    Route::get('/training', [TrainingController::class, 'index']);
    Route::get('/training/questions', [TrainingController::class, 'questions']);
    Route::post('/training/questions', [TrainingController::class, 'storeQuestion']);

    // Tests
    Route::get('/tests', [ModeratorTestController::class, 'index']);
    Route::get('/tests/{test}', [ModeratorTestController::class, 'show']);
    Route::post('/tests/submit', [ModeratorTestController::class, 'submit']);
    Route::get('/tests/status/all', [ModeratorTestController::class, 'allTestsStatus']);

    // Profile
    Route::get('/required-documents', [ProfileController::class, 'getRequiredDocuments']);
    Route::put('/required-documents/{requiredDocument}', [ProfileController::class, 'updateRequiredDocument']);
    Route::post('/required-documents/{requiredDocument}', [ProfileController::class, 'updateRequiredDocument']); // For FormData with method spoofing
    Route::post('/user-documents', [ProfileController::class, 'uploadUserDocument']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);
    Route::put('/profile/work-schedule', [ProfileController::class, 'updateWorkSchedule']);
    Route::get('/profile/work-schedule', [ProfileController::class, 'getWorkSchedule']);

    // Support
    Route::get('/support', [SupportController::class, 'index']);
    Route::post('/support', [SupportController::class, 'store']);
    Route::get('/support/{ticket}', [SupportController::class, 'show']);
});

// Messages/Chat routes (для админов и модераторов)
Route::prefix('messages')->middleware(['auth:sanctum', 'activity'])->group(function () {
    Route::get('/', [MessageController::class, 'index']);
    Route::post('/', [MessageController::class, 'store']);
    Route::put('/{message}', [MessageController::class, 'update']);
    Route::delete('/{message}', [MessageController::class, 'destroy']);
    Route::post('/{message}/read', [MessageController::class, 'markAsRead']);
    Route::post('/mark-chat-read', [MessageController::class, 'markChatAsRead']);
});

// Test broadcasting without middleware
Route::post('/broadcasting/test', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'success' => true,
        'channel_name' => $request->input('channel_name'),
        'socket_id' => $request->input('socket_id'),
        'has_token' => $request->bearerToken() ? true : false,
        'token_value' => $request->bearerToken() ? substr($request->bearerToken(), 0, 20).'...' : null,
        'user' => $request->user() ? $request->user()->id : null
    ]);
});

// Test with middleware
Route::post('/broadcasting/test-auth', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'success' => true,
        'user_id' => $request->user()->id,
        'user_name' => $request->user()->name,
    ]);
})->middleware('auth:sanctum');

// Broadcasting authentication - парсим form data и передаем Laravel broadcaster
Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
    // Загружаем каналы broadcasting один раз
    static $channelsLoaded = false;
    if (!$channelsLoaded) {
        require base_path('routes/channels.php');
        $channelsLoaded = true;
    }
    
    // Преобразуем form data в параметры запроса, если они не были распарсены
    if (empty($request->all()) && $request->getContent()) {
        parse_str($request->getContent(), $parsed);
        if (!empty($parsed)) {
            $request->merge($parsed);
        }
    }
    
    \Log::info('Broadcasting auth request', [
        'user_id' => auth()->id(),
        'channel' => $request->input('channel_name'),
        'socket_id' => $request->input('socket_id'),
    ]);
    
    // Используем стандартную авторизацию Laravel Broadcasting
    $broadcaster = app(\Illuminate\Contracts\Broadcasting\Broadcaster::class);
    $response = $broadcaster->auth($request);
    
    \Log::info('Broadcasting auth response', [
        'channel' => $request->input('channel_name'),
        'success' => !empty($response),
    ]);
    
    return $response;
})->middleware('auth:sanctum');

// Telegram routes
Route::prefix('telegram')->group(function () {
    Route::post('/webhook', [\App\Http\Controllers\TelegramController::class, 'webhook']);
    Route::post('/link', [\App\Http\Controllers\TelegramController::class, 'link'])
        ->middleware('auth:sanctum');
});
