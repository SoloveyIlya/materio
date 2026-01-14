<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RequiredDocument;
use Illuminate\Http\Request;
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
        if ($requiredDocument->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp|max:10240',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Загрузка нового файла
        if ($request->hasFile('file')) {
            // Удаляем старый файл
            if ($requiredDocument->file_path) {
                $relativePath = str_replace('/storage/', '', parse_url($requiredDocument->file_path, PHP_URL_PATH));
                Storage::disk('public')->delete($relativePath);
            }
            $file = $request->file('file');
            $path = $file->store('required-documents', 'public');
            $validated['file_path'] = Storage::url($path);
            $validated['file_name'] = $file->getClientOriginalName();
        }

        $requiredDocument->update($validated);
        $requiredDocument->refresh();

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
