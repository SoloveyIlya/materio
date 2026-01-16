<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RequiredDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class RequiredDocumentController extends Controller
{
    public function index(Request $request)
    {
        $documents = RequiredDocument::where('domain_id', $request->user()->domain_id)
            ->orderBy('order')
            ->get();

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp|max:10240', // 10MB max
            'order' => 'nullable|integer|min:0',
        ]);

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['order'] = $validated['order'] ?? 0;
        $validated['is_active'] = true;

        // Загрузка файла
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('required-documents', 'public');
            $validated['file_path'] = Storage::url($path);
            $validated['file_name'] = $file->getClientOriginalName();
        } else {
            // Если файл не загружен, создаем документ без файла (можно добавить позже)
            $validated['file_path'] = null;
            $validated['file_name'] = null;
        }

        $document = RequiredDocument::create($validated);

        return response()->json($document, 201);
    }

    public function show(Request $request, RequiredDocument $requiredDocument)
    {
        if ($requiredDocument->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($requiredDocument);
    }

    public function update(Request $request, RequiredDocument $requiredDocument)
    {
        Log::info('=== Admin RequiredDocumentController::update CALLED ===', [
            'document_id' => $requiredDocument->id,
            'current_name' => $requiredDocument->name,
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl(),
        ]);
        
        if ($requiredDocument->domain_id !== $request->user()->domain_id) {
            Log::warning('Domain mismatch in admin controller');
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $updateData = [];
        
        // Получаем все данные из запроса для отладки
        $allRequestData = $request->all();
        Log::info('Admin update - All request data', [
            'all_data' => $allRequestData,
            'content_type' => $request->header('Content-Type'),
        ]);
        
        // Получаем имя из запроса (может быть в FormData)
        $name = $request->input('name');
        if ($name === null) {
            $name = $request->get('name');
        }
        if ($name === null && isset($allRequestData['name'])) {
            $name = $allRequestData['name'];
        }
        
        Log::info('Admin update - Name extraction', [
            'request_input_name' => $request->input('name'),
            'request_get_name' => $request->get('name'),
            'all_data_name' => $allRequestData['name'] ?? null,
            'final_name' => $name,
        ]);
        
        // Валидация и обработка имени
        if ($name !== null && $name !== '') {
            $request->validate([
                'name' => 'required|string|max:255',
            ]);
            $updateData['name'] = trim($name);
            Log::info('Admin update - Name will be updated', ['new_name' => $updateData['name']]);
        } else {
            Log::warning('Admin update - Name is null or empty');
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
        
        // Валидация is_active, если он передан
        if ($request->has('is_active')) {
            $request->validate([
                'is_active' => 'required|boolean',
            ]);
            $updateData['is_active'] = $request->boolean('is_active');
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
            Log::info('Admin update - Updating document', $updateData);
            $oldName = $requiredDocument->name;
            $requiredDocument->update($updateData);
            $requiredDocument->refresh();
            Log::info('Admin update - Document updated', [
                'old_name' => $oldName,
                'new_name' => $requiredDocument->name,
            ]);
        } else {
            Log::warning('Admin update - No data to update');
        }

        return response()->json($requiredDocument);
    }

    public function destroy(Request $request, RequiredDocument $requiredDocument)
    {
        if ($requiredDocument->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Удаляем файл
        if ($requiredDocument->file_path) {
            $relativePath = str_replace('/storage/', '', parse_url($requiredDocument->file_path, PHP_URL_PATH));
            Storage::disk('public')->delete($relativePath);
        }

        $requiredDocument->delete();

        return response()->json(null, 204);
    }
}
