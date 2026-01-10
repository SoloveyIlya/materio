<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'timezone' => 'nullable|string',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        // Обработка загрузки аватарки
        if ($request->hasFile('avatar')) {
            $avatarFile = $request->file('avatar');
            
            // Удаляем старую аватарку, если она есть
            if ($user->avatar) {
                // Если аватарка содержит URL, извлекаем относительный путь
                $oldAvatarPath = $user->avatar;
                if (strpos($oldAvatarPath, '/storage/') !== false) {
                    $oldAvatarPath = str_replace('/storage/', '', parse_url($oldAvatarPath, PHP_URL_PATH));
                } else {
                    // Если путь не содержит /storage/, возможно это уже относительный путь
                    $oldAvatarPath = str_replace(Storage::disk('public')->url(''), '', $oldAvatarPath);
                }
                
                // Удаляем первый слеш, если есть
                $oldAvatarPath = ltrim($oldAvatarPath, '/');
                
                if ($oldAvatarPath && Storage::disk('public')->exists($oldAvatarPath)) {
                    Storage::disk('public')->delete($oldAvatarPath);
                }
            }
            
            // Сохраняем новую аватарку
            $path = $avatarFile->store('avatars', 'public');
            $validated['avatar'] = Storage::disk('public')->url($path);
        }

        $user->update($validated);
        $user->refresh();
        $user->load(['roles', 'moderatorProfile', 'adminProfile']);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ]);
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

