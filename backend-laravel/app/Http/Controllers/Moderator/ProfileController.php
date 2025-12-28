<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\RequiredDocument;
use App\Models\UserDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        // Обновляем пароль
        $user->password = Hash::make($validated['new_password']);
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }
}

