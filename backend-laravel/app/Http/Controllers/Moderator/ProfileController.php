<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\RequiredDocument;
use App\Models\UserDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function getRequiredDocuments(Request $request): JsonResponse
    {
        $user = $request->user();

        $documents = RequiredDocument::where('domain_id', $user->domain_id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        return response()->json($documents);
    }

    public function updateRequiredDocument(Request $request, RequiredDocument $requiredDocument): JsonResponse
    {
        // Логируем ВСЕГДА, даже до проверок
        Log::info('=== updateRequiredDocument METHOD CALLED ===', [
            'document_id' => $requiredDocument->id ?? 'unknown',
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl(),
        ]);
        
        $user = $request->user();
        
        if (!$user) {
            Log::warning('No authenticated user');
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Проверяем, что документ принадлежит домену модератора
        if ($requiredDocument->domain_id !== $user->domain_id) {
            Log::warning('Domain mismatch', [
                'document_domain_id' => $requiredDocument->domain_id,
                'user_domain_id' => $user->domain_id,
            ]);
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $updateData = [];
        
        // Логирование для отладки - ВСЕГДА логируем начало метода
        Log::info('=== Update Required Document START ===', [
            'document_id' => $requiredDocument->id,
            'current_name' => $requiredDocument->name,
            'user_id' => $user->id,
        ]);
        
        // Получаем все данные из запроса для отладки
        $allRequestData = $request->all();
        Log::info('All request data', [
            'all_data' => $allRequestData,
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'is_multipart' => str_contains($request->header('Content-Type', ''), 'multipart'),
        ]);
        
        // Получаем имя из запроса - пробуем все возможные способы
        $name = $request->input('name');
        if ($name === null) {
            $name = $request->get('name');
        }
        if ($name === null) {
            $name = $request->post('name');
        }
        // Если всё ещё null, пробуем получить из всех данных
        if ($name === null && isset($allRequestData['name'])) {
            $name = $allRequestData['name'];
        }
        
        Log::info('Name extraction attempt', [
            'request_input_name' => $request->input('name'),
            'request_get_name' => $request->get('name'),
            'request_post_name' => $request->post('name'),
            'all_data_name' => $allRequestData['name'] ?? null,
            'final_name' => $name,
            'name_type' => gettype($name),
        ]);
        
        // Валидация и обработка имени - всегда обновляем, если передано
        if ($name !== null && $name !== '') {
            $request->validate([
                'name' => 'required|string|max:255',
            ]);
            $trimmedName = trim($name);
            if ($trimmedName !== '') {
                $updateData['name'] = $trimmedName;
                Log::info('Name will be updated', ['new_name' => $updateData['name']]);
            } else {
                Log::warning('Name is empty after trim, will not update');
            }
        } else {
            Log::warning('Name is null or empty, will not update', [
                'name_value' => $name,
                'name_type' => gettype($name),
            ]);
        }
        
        // Валидация файла, если он передан
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp|max:10240',
            ]);
        }
        
        // Валидация order, если он передан
        if ($request->has('order')) {
            $request->validate([
                'order' => 'required|integer|min:0',
            ]);
            $updateData['order'] = $request->input('order');
        }

        // Загрузка нового файла
        if ($request->hasFile('file')) {
            // Удаляем старый файл
            if ($requiredDocument->file_path) {
                $relativePath = str_replace('/storage/', '', parse_url($requiredDocument->file_path, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
            $file = $request->file('file');
            $path = $file->store('required-documents', 'public');
            $updateData['file_path'] = Storage::url($path);
            $updateData['file_name'] = $file->getClientOriginalName();
        }

        // Обновляем документ только если есть данные для обновления
        if (!empty($updateData)) {
            Log::info('Updating document with data', $updateData);
            $oldName = $requiredDocument->name;
            
            // Сохраняем старые значения для проверки
            $beforeUpdate = $requiredDocument->getAttributes();
            
            // Обновляем документ
            $updateResult = $requiredDocument->update($updateData);
            
            // Проверяем, что данные действительно сохранились в БД
            $requiredDocument->refresh();
            $afterUpdate = $requiredDocument->getAttributes();
            
            // Дополнительная проверка через прямой запрос к БД
            $dbDocument = RequiredDocument::find($requiredDocument->id);
            
            Log::info('Document update result', [
                'update_result' => $updateResult,
                'old_name' => $oldName,
                'new_name_in_model' => $requiredDocument->name,
                'new_name_in_db' => $dbDocument->name,
                'name_changed' => $oldName !== $requiredDocument->name,
                'before_update' => $beforeUpdate['name'] ?? null,
                'after_update' => $afterUpdate['name'] ?? null,
                'updateData_name' => $updateData['name'] ?? null,
            ]);
            
            // Если имя не обновилось, логируем ошибку
            if (isset($updateData['name']) && $requiredDocument->name !== $updateData['name']) {
                Log::error('Name was not updated correctly!', [
                    'expected' => $updateData['name'],
                    'actual' => $requiredDocument->name,
                    'db_value' => $dbDocument->name,
                ]);
            }
        } else {
            Log::warning('No data to update - updateData is empty', [
                'updateData' => $updateData,
            ]);
        }

        Log::info('=== Update Required Document END ===', [
            'final_name' => $requiredDocument->name,
        ]);

        return response()->json($requiredDocument);
    }

    public function uploadUserDocument(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'required_document_id' => 'required|exists:required_documents,id',
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp,jpg,jpeg,png|max:10240',
        ]);

        // Проверяем, что документ принадлежит домену модератора
        $requiredDocument = RequiredDocument::findOrFail($validated['required_document_id']);
        if ($requiredDocument->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Загружаем файл
        $file = $request->file('file');
        $path = $file->store('user-documents', 'public');
        $filePath = Storage::url($path);

        // Создаем или обновляем документ пользователя
        $userDocument = UserDocument::updateOrCreate(
            [
                'user_id' => $user->id,
                'required_document_id' => $validated['required_document_id'],
            ],
            [
                'file_path' => $filePath,
                'file_name' => $file->getClientOriginalName(),
            ]
        );

        return response()->json($userDocument, 201);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        // Проверяем текущий пароль
        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Обновляем пароль и registration_password
        $user->password = Hash::make($validated['new_password']);
        $user->registration_password = $validated['new_password'];
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    public function updateWorkSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('moderatorProfile');

        $validated = $request->validate([
            'work_schedule' => 'nullable|array',
            'work_schedule.*.day' => 'required|string|in:Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'work_schedule.*.enabled' => 'required|boolean',
            'work_schedule.*.start_time' => 'nullable|string|regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/',
            'work_schedule.*.end_time' => 'nullable|string|regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/',
        ]);

        $profile = $user->moderatorProfile;
        if (!$profile) {
            $profile = \App\Models\ModeratorProfile::create(['user_id' => $user->id]);
        }

        $profile->work_schedule = $validated['work_schedule'] ?? null;
        $profile->save();

        return response()->json([
            'message' => 'Work schedule updated successfully',
            'work_schedule' => $profile->work_schedule,
        ]);
    }

    public function getWorkSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('moderatorProfile');

        $workSchedule = $user->moderatorProfile?->work_schedule ?? null;

        return response()->json([
            'work_schedule' => $workSchedule,
        ]);
    }
}

