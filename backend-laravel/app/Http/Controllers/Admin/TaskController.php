<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskResult;
use App\Models\ModeratorEarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json(['message' => 'User domain not set'], 400);
        }

        $query = Task::where('domain_id', $user->domain_id)
            ->with(['category', 'template', 'assignedUser', 'documentation', 'tool', 'result']);

        if ($request->has('status')) {
            $status = $request->status;
            // Если статус содержит запятую, это множественный статус
            if (strpos($status, ',') !== false) {
                $statuses = array_map('trim', explode(',', $status));
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $tasks = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($tasks);
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->load([
            'category', 
            'template', 
            'assignedUser', 
            'documentation',
            'tool',
            'result.moderator',
            'result' => function($query) {
                $query->with('moderator');
            }
        ]);

        // Форматируем результат для удобного отображения
        if ($task->result) {
            $result = $task->result;
            // Парсим answers если это JSON строка
            if (is_string($result->answers)) {
                try {
                    $result->answers = json_decode($result->answers, true);
                } catch (\Exception $e) {
                    // Оставляем как строку, если не JSON
                }
            }
        }

        return response()->json($task);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json(['message' => 'User domain not set'], 400);
        }

        $validated = $request->validate([
            'template_id' => 'nullable|exists:task_templates,id',
            'category_id' => 'required|exists:task_categories,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'completion_hours' => 'required|integer|min:1',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'due_at' => 'nullable|date',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer',
            'is_main_task' => 'boolean',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone_number' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'date_of_birth' => 'nullable|date',
            'id_type' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'document_image' => 'nullable|file|image|max:10240',
            'selfie_image' => 'nullable|file|image|max:10240',
            'comment' => 'nullable|string',
            'documentation_id' => 'nullable|exists:documentation_pages,id',
            'tool_id' => 'nullable|exists:tools,id',
        ]);

        DB::beginTransaction();
        try {
            // Handle file uploads
            $data = $validated;
            if ($request->hasFile('document_image')) {
                $path = $request->file('document_image')->store('tasks/documents', 'public');
                $data['document_image'] = Storage::url($path);
            }
            if ($request->hasFile('selfie_image')) {
                $path = $request->file('selfie_image')->store('tasks/selfies', 'public');
                $data['selfie_image'] = Storage::url($path);
            }
            
            // Конвертируем пустые строки в null для nullable полей
            $nullableFields = ['template_id', 'assigned_to', 'documentation_id', 'tool_id', 'description', 
                              'first_name', 'last_name', 'country', 'address', 'phone_number', 'email', 
                              'date_of_birth', 'id_type', 'id_number', 'comment', 'due_at'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field])) {
                    // Конвертируем пустые строки в null
                    if ($data[$field] === '') {
                        $data[$field] = null;
                    }
                    // Для foreign keys также конвертируем '0' в null
                    if (in_array($field, ['template_id', 'assigned_to', 'documentation_id', 'tool_id']) && ($data[$field] === '0' || $data[$field] === 0)) {
                        $data[$field] = null;
                    }
                }
            }

            // Если устанавливаем как main task, снимаем флаг с других задач
            if (!empty($data['is_main_task'])) {
                Task::where('domain_id', $user->domain_id)
                    ->where('is_main_task', true)
                    ->update(['is_main_task' => false]);
            }

            // Конвертируем пустые строки в null для nullable полей
            $nullableFields = ['template_id', 'assigned_to', 'documentation_id', 'tool_id', 'description', 
                              'first_name', 'last_name', 'country', 'address', 'phone_number', 'email', 
                              'date_of_birth', 'id_type', 'id_number', 'comment', 'due_at'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field]) && $data[$field] === '') {
                    $data[$field] = null;
                }
            }
            
            // Устанавливаем due_at на основе completion_hours, если не указан явно
            if (!isset($data['due_at']) && isset($data['completion_hours']) && $data['completion_hours']) {
                $data['due_at'] = now()->addHours($data['completion_hours']);
            }

            $task = Task::create([
                'domain_id' => $user->domain_id,
                'assigned_at' => isset($data['assigned_to']) && $data['assigned_to'] ? now() : null,
                ...$data,
            ]);

            DB::commit();

            return response()->json($task->load(['category', 'template', 'assignedUser', 'documentation', 'tool']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating task: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Отладочная информация
        \Log::info('Task update request data:', [
            'method' => $request->method(),
            'all' => $request->all(),
            'title' => $request->input('title'),
            'category_id' => $request->input('category_id'),
            'price' => $request->input('price'),
            'completion_hours' => $request->input('completion_hours'),
            'status' => $request->input('status'),
            'has_file' => $request->hasFile('document_image'),
        ]);

        $validated = $request->validate([
            'template_id' => 'nullable|exists:task_templates,id',
            'category_id' => 'required|exists:task_categories,id',
            'assigned_to' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'completion_hours' => 'required|integer|min:1',
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'due_at' => 'nullable|date',
            'guides_links' => 'nullable|array',
            'attached_services' => 'nullable|array',
            'work_day' => 'nullable|integer',
            'is_main_task' => 'nullable|boolean',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone_number' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'date_of_birth' => 'nullable|date',
            'id_type' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'document_image' => 'nullable|file|image|max:10240',
            'selfie_image' => 'nullable|file|image|max:10240',
            'comment' => 'nullable|string',
            'documentation_id' => 'nullable|exists:documentation_pages,id',
            'tool_id' => 'nullable|exists:tools,id',
        ]);

        DB::beginTransaction();
        try {
            // Handle file uploads
            $data = $validated;
            if ($request->hasFile('document_image')) {
                // Delete old file if exists
                if ($task->document_image) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->document_image, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $path = $request->file('document_image')->store('tasks/documents', 'public');
                $data['document_image'] = Storage::url($path);
            } else {
                // Сохраняем существующее значение, если файл не загружен
                $data['document_image'] = $task->document_image;
            }
            
            if ($request->hasFile('selfie_image')) {
                // Delete old file if exists
                if ($task->selfie_image) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->selfie_image, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $path = $request->file('selfie_image')->store('tasks/selfies', 'public');
                $data['selfie_image'] = Storage::url($path);
            } else {
                // Сохраняем существующее значение, если файл не загружен
                $data['selfie_image'] = $task->selfie_image;
            }
            
            // Конвертируем пустые строки в null для nullable полей
            $nullableFields = ['template_id', 'assigned_to', 'documentation_id', 'tool_id', 'description', 
                              'first_name', 'last_name', 'country', 'address', 'phone_number', 'email', 
                              'date_of_birth', 'id_type', 'id_number', 'comment', 'due_at'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field])) {
                    // Конвертируем пустые строки в null
                    if ($data[$field] === '') {
                        $data[$field] = null;
                    }
                    // Для foreign keys также конвертируем '0' в null
                    if (in_array($field, ['template_id', 'assigned_to', 'documentation_id', 'tool_id']) && ($data[$field] === '0' || $data[$field] === 0)) {
                        $data[$field] = null;
                    }
                }
            }

            // Если устанавливаем как main task, снимаем флаг с других задач
            if (isset($data['is_main_task']) && $data['is_main_task'] && !$task->is_main_task) {
                Task::where('domain_id', $user->domain_id)
                    ->where('is_main_task', true)
                    ->where('id', '!=', $task->id)
                    ->update(['is_main_task' => false]);
            }

            // Обновляем assigned_at при изменении assigned_to
            if (array_key_exists('assigned_to', $data)) {
                if ($data['assigned_to'] && $data['assigned_to'] != $task->assigned_to) {
                    $data['assigned_at'] = now();
                } elseif (!$data['assigned_to']) {
                    $data['assigned_at'] = null;
                }
            }

            // Обновляем задачу
            $task->update($data);

            DB::commit();

            return response()->json($task->fresh()->load(['category', 'template', 'assignedUser', 'documentation', 'tool', 'result']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating task: ' . $e->getMessage()], 500);
        }
    }

    public function moderateResult(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject,revision',
            'comment' => 'nullable|string',
        ]);

        $result = $task->result;
        if (!$result) {
            return response()->json(['message' => 'Task result not found'], 404);
        }

        DB::beginTransaction();
        try {
            // Обновляем статус таска
            $newStatus = match($validated['action']) {
                'approve' => 'approved',
                'reject' => 'rejected',
                'revision' => 'sent_for_revision',
            };

            $task->update([
                'status' => $newStatus,
            ]);

            // Сохраняем комментарий админа
            if (isset($validated['comment'])) {
                $result->update([
                    'admin_comment' => $validated['comment'],
                ]);
            }

            // Если таск одобрен, начисляем зарплату
            if ($validated['action'] === 'approve') {
                ModeratorEarning::create([
                    'moderator_id' => $task->assigned_to,
                    'task_id' => $task->id,
                    'amount' => $task->price,
                    'earned_at' => now(),
                    'notes' => 'Task approved: ' . $task->title,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Task moderated successfully',
                'task' => $task->fresh()->load(['category', 'template', 'assignedUser', 'result']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error moderating task: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        DB::beginTransaction();
        try {
            // Удаляем связанные файлы
            if ($task->document_image) {
                Storage::disk('public')->delete($task->document_image);
            }
            if ($task->selfie_image) {
                Storage::disk('public')->delete($task->selfie_image);
            }

            // Удаляем таск
            $task->delete();

            DB::commit();

            return response()->json(['message' => 'Task deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error deleting task: ' . $e->getMessage()], 500);
        }
    }
}
