<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskResult;
use App\Models\ModeratorEarning;
use App\Models\TaskView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class TaskController extends Controller
{
    /**
     * Форматирует дату в формат США (MM/DD/YYYY HH:MM AM/PM) с учетом часового пояса
     */
    private function formatDateUSA($date, $timezone = 'UTC'): ?string
    {
        if (!$date) {
            return null;
        }
        
        try {
            $carbon = Carbon::parse($date)->setTimezone($timezone);
            return $carbon->format('m/d/Y h:i A T');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Добавляет отформатированные даты к задаче
     */
    private function addFormattedDates($task, $timezone = 'UTC'): void
    {
        if ($task->created_at) {
            $task->created_at_formatted = $this->formatDateUSA($task->created_at, $timezone);
        }
        if ($task->updated_at) {
            $task->updated_at_formatted = $this->formatDateUSA($task->updated_at, $timezone);
        }
        if ($task->assigned_at) {
            $task->assigned_at_formatted = $this->formatDateUSA($task->assigned_at, $timezone);
        }
        if ($task->completed_at) {
            $task->completed_at_formatted = $this->formatDateUSA($task->completed_at, $timezone);
        }
        if ($task->due_at) {
            $task->due_at_formatted = $this->formatDateUSA($task->due_at, $timezone);
        }
        if ($task->date_of_birth) {
            $task->date_of_birth_formatted = $this->formatDateUSA($task->date_of_birth, $timezone);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->domain_id) {
            return response()->json(['message' => 'User domain not set'], 400);
        }

        $query = Task::where('domain_id', $user->domain_id)
            ->with(['categories', 'template', 'assignedUser', 'documentations', 'tools', 'result', 'views.user']);

        // Определяем, нужно ли исключать задачи без модератора
        // Это нужно для статусов pending и in_progress
        $excludeUnassigned = false;
        if ($request->has('status')) {
            $status = $request->status;
            if (strpos($status, ',') !== false) {
                $statuses = array_map('trim', explode(',', $status));
                $excludeUnassigned = in_array('pending', $statuses) || in_array('in_progress', $statuses);
            } else {
                $excludeUnassigned = $status === 'pending' || $status === 'in_progress';
            }
        }

        // Фильтр по админу - применяется только если явно запрошен
        // По умолчанию показываем ВСЕ задачи домена (единый Task Manager для всех админов)
        if ($request->has('administrator_id')) {
            $administratorId = $request->administrator_id;
            if ($administratorId !== 'all') {
                // Фильтруем таски модераторов выбранного админа
                // Если исключаем задачи без назначения (для pending/in_progress), не добавляем orWhereNull
                if ($excludeUnassigned) {
                    // Для pending/in_progress показываем только задачи с назначенным модератором этого админа
                    $query->whereHas('assignedUser', function ($subQ) use ($administratorId) {
                        $subQ->where('administrator_id', $administratorId);
                    });
                } else {
                    // Для других статусов показываем задачи модераторов этого админа ИЛИ задачи без назначения
                    $query->where(function ($q) use ($administratorId) {
                        $q->whereHas('assignedUser', function ($subQ) use ($administratorId) {
                            $subQ->where('administrator_id', $administratorId);
                        })->orWhereNull('assigned_to');
                    });
                }
            }
            // Если administrator_id === 'all', показываем все задачи (без фильтра)
        }
        // Если administrator_id не передан, показываем все задачи домена (без фильтра)

        if ($request->has('status')) {
            $status = $request->status;
            // Если статус содержит запятую, это множественный статус
            if (strpos($status, ',') !== false) {
                $statuses = array_map('trim', explode(',', $status));
                $query->whereIn('status', $statuses);
                
                // Для статусов pending и in_progress показываем только задачи с назначенным модератором
                // Задачи без модератора (assigned_to = null) не должны попадать в таб "Pending"
                if ($excludeUnassigned) {
                    $query->whereNotNull('assigned_to');
                }
            } else {
                $query->where('status', $status);
                
                // Для статусов pending и in_progress показываем только задачи с назначенным модератором
                if ($excludeUnassigned) {
                    $query->whereNotNull('assigned_to');
                }
            }
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $tasks = $query->orderBy('created_at', 'desc')->paginate(20);

        // Добавляем отформатированные даты в формате США с учетом часового пояса
        $timezone = $user->timezone ?? 'UTC';
        $tasks->getCollection()->transform(function ($task) use ($timezone) {
            $this->addFormattedDates($task, $timezone);
            // Добавляем количество уникальных просмотров (только модераторы)
            if ($task->relationLoaded('views')) {
                $uniqueViewerIds = $task->views->pluck('user_id')->unique()->values();
                // Фильтруем только модераторов
                $moderatorViewerIds = \App\Models\User::whereIn('id', $uniqueViewerIds->toArray())
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'moderator');
                    })
                    ->pluck('id');
                $task->views_count = $moderatorViewerIds->count();
                if ($moderatorViewerIds->count() > 0) {
                    $task->viewers = \App\Models\User::whereIn('id', $moderatorViewerIds->toArray())
                        ->select('id', 'name', 'email', 'avatar')
                        ->get();
                } else {
                    $task->viewers = collect([]);
                }
            } else {
                $task->views_count = 0;
                $task->viewers = collect([]);
            }
            return $task;
        });

        return response()->json($tasks);
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $task->load([
            'categories', 
            'template', 
            'assignedUser', 
            'documentations',
            'tools',
            'result.moderator',
            'result' => function($query) {
                $query->with('moderator');
            },
            'views.user:id,name,email,avatar'
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

        // Добавляем отформатированные даты в формате США с учетом часового пояса
        $timezone = $user->timezone ?? 'UTC';
        $this->addFormattedDates($task, $timezone);
        
        // Добавляем количество уникальных просмотров (только модераторы)
        if ($task->relationLoaded('views')) {
            $uniqueViewerIds = $task->views->pluck('user_id')->unique()->values();
            // Фильтруем только модераторов
            $moderatorViewerIds = \App\Models\User::whereIn('id', $uniqueViewerIds->toArray())
                ->whereHas('roles', function($q) {
                    $q->where('name', 'moderator');
                })
                ->pluck('id');
            $task->views_count = $moderatorViewerIds->count();
            if ($moderatorViewerIds->count() > 0) {
                $task->viewers = \App\Models\User::whereIn('id', $moderatorViewerIds->toArray())
                    ->select('id', 'name', 'email', 'avatar')
                    ->get();
            } else {
                $task->viewers = collect([]);
            }
        } else {
            $uniqueViewerIds = $task->views()->pluck('user_id')->unique()->values();
            // Фильтруем только модераторов
            $moderatorViewerIds = \App\Models\User::whereIn('id', $uniqueViewerIds->toArray())
                ->whereHas('roles', function($q) {
                    $q->where('name', 'moderator');
                })
                ->pluck('id');
            $task->views_count = $moderatorViewerIds->count();
            if ($moderatorViewerIds->count() > 0) {
                $task->viewers = \App\Models\User::whereIn('id', $moderatorViewerIds->toArray())
                    ->select('id', 'name', 'email', 'avatar')
                    ->get();
            } else {
                $task->viewers = collect([]);
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

        // Обрабатываем массивы из FormData
        // Поддерживаем и новые массивы (category_ids[]), и старые одиночные значения (category_id)
        $allData = $request->all();
        
        // Обрабатываем category_ids - сначала проверяем старые поля для обратной совместимости
        $categoryIds = [];
        if (isset($allData['category_id']) && $allData['category_id'] && $allData['category_id'] !== '') {
            // Старый формат - одиночное значение (преобразуем в массив)
            $categoryIds = [is_array($allData['category_id']) ? $allData['category_id'][0] : $allData['category_id']];
        } elseif (isset($allData['category_ids']) && is_array($allData['category_ids']) && !empty($allData['category_ids'])) {
            // Новый формат - массив
            $categoryIds = array_filter($allData['category_ids'], function($id) {
                return $id !== '' && $id !== null;
            });
        }
        
        // Если все еще пусто, пытаемся получить из input (на случай если Laravel не распознал массив)
        if (empty($categoryIds)) {
            $categoryIdsInput = $request->input('category_ids', []);
            if (is_array($categoryIdsInput) && !empty($categoryIdsInput)) {
                $categoryIds = array_filter($categoryIdsInput, function($id) {
                    return $id !== '' && $id !== null;
                });
            }
        }
        
        $request->merge(['category_ids' => array_values($categoryIds)]);
        
        // Аналогично для tool_ids (но это опциональное поле)
        $toolIds = [];
        if (isset($allData['tool_id']) && $allData['tool_id'] && $allData['tool_id'] !== '') {
            $toolIds = [is_array($allData['tool_id']) ? $allData['tool_id'][0] : $allData['tool_id']];
        } elseif (isset($allData['tool_ids']) && is_array($allData['tool_ids']) && !empty($allData['tool_ids'])) {
            $toolIds = array_filter($allData['tool_ids'], function($id) {
                return $id !== '' && $id !== null;
            });
        }
        $request->merge(['tool_ids' => array_values($toolIds)]);
        
        // Обрабатываем documentation_ids (опциональное поле)
        $documentationIds = [];
        if (isset($allData['documentation_id']) && $allData['documentation_id'] && $allData['documentation_id'] !== '') {
            $documentationIds = [is_array($allData['documentation_id']) ? $allData['documentation_id'][0] : $allData['documentation_id']];
        } elseif (isset($allData['documentation_ids']) && is_array($allData['documentation_ids']) && !empty($allData['documentation_ids'])) {
            $documentationIds = array_filter($allData['documentation_ids'], function($id) {
                return $id !== '' && $id !== null;
            });
        }
        $request->merge(['documentation_ids' => array_values($documentationIds)]);

        try {
            $validated = $request->validate([
                'template_id' => 'nullable|exists:task_templates,id',
                'category_ids' => 'required|array|min:1',
                'category_ids.*' => 'exists:task_categories,id',
                'assigned_to' => 'nullable|exists:users,id',
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0|max:99999999.99',
                'completion_hours' => 'required|integer|min:1|max:87600',
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
                'document_image' => 'nullable|file|mimes:jpeg,jpg,png,gif,pdf,doc,docx,txt,rtf|max:10240',
                'selfie_image' => 'nullable|file|image|max:10240',
                'video' => 'nullable|file|mimes:mp4,webm,ogg,mov,avi|max:102400',
                'comment' => 'nullable|string',
                'documentation_ids' => 'nullable|array',
                'documentation_ids.*' => 'exists:documentation_pages,id',
                'tool_ids' => 'nullable|array',
                'tool_ids.*' => 'exists:tools,id',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Task validation failed', [
                'errors' => $e->errors(),
                'input_data' => $request->except(['document_image', 'selfie_image', 'video']),
                'category_ids_input' => $request->input('category_ids'),
                'category_ids_type' => gettype($request->input('category_ids')),
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Handle file uploads
            $data = $validated;
            if ($request->hasFile('document_image')) {
                $file = $request->file('document_image');
                // Генерируем уникальное имя файла для избежания конфликтов
                // Одно и то же изображение может использоваться в разных задачах - каждое получит свой уникальный файл
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/documents', $fileName, 'public');
                $data['document_image'] = Storage::disk('public')->url($path);
                // Сохраняем оригинальное имя файла - оно может повторяться в разных задачах
                $data['document_image_name'] = $file->getClientOriginalName();
            }
            if ($request->hasFile('selfie_image')) {
                $file = $request->file('selfie_image');
                // Генерируем уникальное имя файла для избежания конфликтов
                // Одно и то же изображение может использоваться в разных задачах - каждое получит свой уникальный файл
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/selfies', $fileName, 'public');
                $data['selfie_image'] = Storage::disk('public')->url($path);
            }
            if ($request->hasFile('video')) {
                $file = $request->file('video');
                // Генерируем уникальное имя файла для избежания конфликтов
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/videos', $fileName, 'public');
                $data['video'] = Storage::disk('public')->url($path);
            }
            
            // Устанавливаем дефолтный статус, если не передан
            if (!isset($data['status']) || $data['status'] === '') {
                $data['status'] = 'pending';
            }
            
            // Извлекаем category_ids, tool_ids и documentation_ids для синхронизации связей many-to-many
            $categoryIds = $data['category_ids'] ?? [];
            $toolIds = $data['tool_ids'] ?? [];
            $documentationIds = $data['documentation_ids'] ?? [];
            unset($data['category_ids'], $data['tool_ids'], $data['documentation_ids']);

            // Конвертируем пустые строки в null для nullable полей
            $nullableFields = ['template_id', 'assigned_to', 'documentation_id', 'description', 
                              'first_name', 'last_name', 'country', 'address', 'phone_number', 'email', 
                              'date_of_birth', 'id_type', 'id_number', 'comment', 'due_at', 'work_day'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field])) {
                    // Конвертируем пустые строки в null
                    if ($data[$field] === '') {
                        $data[$field] = null;
                    }
                    // Для foreign keys также конвертируем '0' в null
                    if (in_array($field, ['template_id', 'assigned_to', 'documentation_id']) && ($data[$field] === '0' || $data[$field] === 0)) {
                        $data[$field] = null;
                    }
                    // Для work_day конвертируем в integer, если не null
                    if ($field === 'work_day' && $data[$field] !== null) {
                        $data[$field] = (int)$data[$field];
                    }
                }
            }

            // Если устанавливаем как main task, снимаем флаг с других задач
            if (!empty($data['is_main_task'])) {
                Task::where('domain_id', $user->domain_id)
                    ->where('is_main_task', true)
                    ->update(['is_main_task' => false]);
            }
            
            // Устанавливаем due_at на основе completion_hours, если не указан явно
            // Ограничиваем максимальное количество часов, чтобы избежать выхода за пределы допустимого диапазона дат MySQL
            if (!isset($data['due_at']) || $data['due_at'] === null) {
                if (isset($data['completion_hours']) && $data['completion_hours'] && $data['completion_hours'] > 0) {
                    // Ограничиваем до разумного максимума (например, 10 лет = 87600 часов)
                    $maxHours = min((int)$data['completion_hours'], 87600);
                    try {
                        $calculatedDueAt = now()->addHours($maxHours);
                        // Проверяем, что дата не выходит за пределы допустимого диапазона MySQL (до 9999-12-31 23:59:59)
                        if ($calculatedDueAt->year <= 9999) {
                            $data['due_at'] = $calculatedDueAt->format('Y-m-d H:i:s');
                        }
                    } catch (\Exception $e) {
                        // Если не удалось вычислить дату, оставляем null
                        $data['due_at'] = null;
                    }
                }
            } elseif (isset($data['due_at']) && $data['due_at'] !== null) {
                // Проверяем, что переданная дата не выходит за пределы допустимого диапазона
                try {
                    $dueAtDate = \Carbon\Carbon::parse($data['due_at']);
                    if ($dueAtDate->year > 9999) {
                        // Если дата выходит за пределы, сбрасываем в null
                        $data['due_at'] = null;
                    }
                } catch (\Exception $e) {
                    // Если не удалось распарсить дату, сбрасываем в null
                    $data['due_at'] = null;
                }
            }

            // Логируем work_day для отладки
            \Log::info('Creating task with work_day', [
                'work_day_raw' => $request->input('work_day'),
                'work_day_processed' => $data['work_day'] ?? null,
                'work_day_type' => isset($data['work_day']) ? gettype($data['work_day']) : 'not set',
            ]);

            $task = Task::create([
                'domain_id' => $user->domain_id,
                'assigned_at' => isset($data['assigned_to']) && $data['assigned_to'] ? now() : null,
                ...$data,
            ]);

            // Синхронизируем категории, тулзы и документации
            $task->categories()->sync($categoryIds);
            $task->tools()->sync($toolIds);
            $task->documentations()->sync($documentationIds);

            DB::commit();

            // Загружаем таск с отношениями и проверяем work_day
            $task->refresh();
            \Log::info('Task created', [
                'task_id' => $task->id,
                'work_day' => $task->work_day,
                'work_day_type' => gettype($task->work_day),
            ]);

            $task = $task->load(['categories', 'template', 'assignedUser', 'documentations', 'tools']);
            
            // Добавляем отформатированные даты в формате США с учетом часового пояса
            $timezone = $user->timezone ?? 'UTC';
            $this->addFormattedDates($task, $timezone);

            return response()->json($task, 201);
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
            'has_video_file' => $request->hasFile('video'),
            'current_task_video' => $task->video,
        ]);

        $validated = $request->validate([
            'template_id' => 'nullable|exists:task_templates,id',
            'category_ids' => 'required|array|min:1',
            'category_ids.*' => 'exists:task_categories,id',
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
            'document_image' => 'nullable|file|mimes:jpeg,jpg,png,gif,pdf,doc,docx,txt,rtf|max:10240',
            'selfie_image' => 'nullable|file|image|max:10240',
            'video' => 'nullable|file|mimes:mp4,webm,ogg,mov,avi|max:102400',
            'comment' => 'nullable|string',
            'documentation_ids' => 'nullable|array',
            'documentation_ids.*' => 'exists:documentation_pages,id',
            'tool_ids' => 'nullable|array',
            'tool_ids.*' => 'exists:tools,id',
        ]);

        // Обрабатываем documentation_ids перед валидацией (аналогично store)
        $allData = $request->all();
        $documentationIds = [];
        if (isset($allData['documentation_id']) && $allData['documentation_id'] && $allData['documentation_id'] !== '') {
            $documentationIds = [is_array($allData['documentation_id']) ? $allData['documentation_id'][0] : $allData['documentation_id']];
        } elseif (isset($allData['documentation_ids']) && is_array($allData['documentation_ids']) && !empty($allData['documentation_ids'])) {
            $documentationIds = array_filter($allData['documentation_ids'], function($id) {
                return $id !== '' && $id !== null;
            });
        }
        $request->merge(['documentation_ids' => array_values($documentationIds)]);

        DB::beginTransaction();
        try {
            // Handle file uploads
            $data = $validated;
            
            // Удаляем поля файлов из $data, чтобы они не перезаписывались, если файлы не загружены
            // Важно: удаляем эти поля ДО обработки файлов, чтобы они не попали в update
            unset($data['document_image'], $data['selfie_image'], $data['video']);
            
            // Логируем для отладки
            \Log::info('Task update - after unset video:', [
                'has_video_in_data' => isset($data['video']),
                'has_video_file' => $request->hasFile('video'),
                'current_task_video' => $task->video,
            ]);
            
            if ($request->hasFile('document_image')) {
                // Delete old file if exists
                if ($task->document_image) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->document_image, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $file = $request->file('document_image');
                // Генерируем уникальное имя файла для избежания конфликтов
                // Одно и то же изображение может использоваться в разных задачах - каждое получит свой уникальный файл
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/documents', $fileName, 'public');
                $data['document_image'] = Storage::disk('public')->url($path);
                // Сохраняем оригинальное имя файла - оно может повторяться в разных задачах
                $data['document_image_name'] = $file->getClientOriginalName();
            }
            // Если файл не загружен, не трогаем существующие значения (они останутся в БД)
            
            if ($request->hasFile('selfie_image')) {
                // Delete old file if exists
                if ($task->selfie_image) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->selfie_image, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $file = $request->file('selfie_image');
                // Генерируем уникальное имя файла для избежания конфликтов
                // Одно и то же изображение может использоваться в разных задачах - каждое получит свой уникальный файл
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/selfies', $fileName, 'public');
                $data['selfie_image'] = Storage::disk('public')->url($path);
            }
            // Если файл не загружен, не трогаем существующие значения (они останутся в БД)
            
            // Обработка видео: проверяем, передано ли значение для удаления видео
            if ($request->has('video_remove') && $request->input('video_remove') === '1') {
                // Удаляем существующее видео, если пользователь явно запросил удаление
                if ($task->video) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->video, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $data['video'] = null;
                \Log::info('Task update - video removed');
            } elseif ($request->hasFile('video')) {
                // Delete old file if exists
                if ($task->video) {
                    $relativePath = str_replace('/storage/', '', parse_url($task->video, PHP_URL_PATH));
                    Storage::disk('public')->delete($relativePath);
                }
                $file = $request->file('video');
                // Генерируем уникальное имя файла для избежания конфликтов
                $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('tasks/videos', $fileName, 'public');
                $data['video'] = Storage::disk('public')->url($path);
                \Log::info('Task update - new video uploaded', ['video_path' => $data['video']]);
            } else {
                // Если файл не загружен и не запрошено удаление, НЕ добавляем поле video в $data
                // Это гарантирует, что существующее значение не будет перезаписано
                \Log::info('Task update - video not changed, keeping existing', ['existing_video' => $task->video]);
            }
            // Если файл не загружен и не запрошено удаление, не трогаем существующие значения (они останутся в БД)
            
            // Извлекаем category_ids, tool_ids и documentation_ids для синхронизации связей many-to-many
            $categoryIds = $data['category_ids'] ?? null;
            $toolIds = $data['tool_ids'] ?? null;
            $documentationIds = $data['documentation_ids'] ?? null;
            unset($data['category_ids'], $data['tool_ids'], $data['documentation_ids']);

            // Конвертируем пустые строки в null для nullable полей
            $nullableFields = ['template_id', 'assigned_to', 'description', 
                              'first_name', 'last_name', 'country', 'address', 'phone_number', 'email', 
                              'date_of_birth', 'id_type', 'id_number', 'comment', 'due_at', 'work_day'];
            foreach ($nullableFields as $field) {
                if (isset($data[$field])) {
                    // Конвертируем пустые строки в null
                    if ($data[$field] === '') {
                        $data[$field] = null;
                    }
                    // Для foreign keys также конвертируем '0' в null
                    if (in_array($field, ['template_id', 'assigned_to', 'documentation_id']) && ($data[$field] === '0' || $data[$field] === 0)) {
                        $data[$field] = null;
                    }
                    // Для work_day конвертируем в integer, если не null
                    if ($field === 'work_day' && $data[$field] !== null) {
                        $data[$field] = (int)$data[$field];
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

            // Убеждаемся, что поле video не попало в $data случайно
            // (оно должно быть только если загружено новое видео или запрошено удаление)
            if (!isset($data['video']) && !$request->hasFile('video') && !($request->has('video_remove') && $request->input('video_remove') === '1')) {
                // Гарантируем, что поле video не будет в $data, чтобы не перезаписать существующее значение
                unset($data['video']);
            }
            
            // Логируем финальные данные перед обновлением
            \Log::info('Task update - final data before update:', [
                'has_video_in_data' => isset($data['video']),
                'video_value' => $data['video'] ?? 'not set',
                'current_task_video' => $task->video,
            ]);
            
            // Обновляем задачу
            $task->update($data);

            // Синхронизируем категории, тулзы и документации, если они были переданы
            if ($categoryIds !== null) {
                $task->categories()->sync($categoryIds);
            }
            if ($toolIds !== null) {
                $task->tools()->sync($toolIds);
            }
            if ($documentationIds !== null) {
                $task->documentations()->sync($documentationIds);
            }

            DB::commit();

            $task = $task->fresh()->load(['categories', 'template', 'assignedUser', 'documentations', 'tools', 'result']);
            
            // Добавляем отформатированные даты в формате США с учетом часового пояса
            $timezone = $user->timezone ?? 'UTC';
            $this->addFormattedDates($task, $timezone);

            return response()->json($task);
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

            $task = $task->fresh()->load(['categories', 'template', 'assignedUser', 'result']);
            
            // Добавляем отформатированные даты в формате США с учетом часового пояса
            $timezone = $user->timezone ?? 'UTC';
            $this->addFormattedDates($task, $timezone);

            return response()->json([
                'message' => 'Task moderated successfully',
                'task' => $task,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error moderating task: ' . $e->getMessage()], 500);
        }
    }

    public function logView(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($task->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Логируем просмотр
        TaskView::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'viewed_at' => now(),
        ]);

        return response()->json(['message' => 'View logged successfully'], 201);
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
                $relativePath = str_replace('/storage/', '', parse_url($task->document_image, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
            if ($task->selfie_image) {
                $relativePath = str_replace('/storage/', '', parse_url($task->selfie_image, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
            if ($task->video) {
                $relativePath = str_replace('/storage/', '', parse_url($task->video, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
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
