<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
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
        
        // Загружаем роли для проверки isAdmin()
        $user->load('roles');

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'timezone' => 'nullable|string',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        // Обработка загрузки аватарки
        if ($request->hasFile('avatar')) {
            $avatarFile = $request->file('avatar');
            
            \Log::info('Avatar upload started', [
                'user_id' => $user->id,
                'file_name' => $avatarFile->getClientOriginalName(),
                'file_size' => $avatarFile->getSize(),
                'mime_type' => $avatarFile->getMimeType(),
            ]);
            
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
                    \Log::info('Old avatar deleted', ['path' => $oldAvatarPath]);
                }
            }
            
            // Сохраняем новую аватарку
            $path = $avatarFile->store('avatars', 'public');
            $avatarUrl = Storage::disk('public')->url($path);
            $validated['avatar'] = $avatarUrl;
            
            \Log::info('Avatar saved', [
                'path' => $path,
                'url' => $avatarUrl,
                'exists' => Storage::disk('public')->exists($path),
            ]);
            
            // Если это админ, обновляем аватарку у всех закрепленных пользователей
            if ($user->isAdmin()) {
                $assignedUsers = User::where('administrator_id', $user->id)->get();
                foreach ($assignedUsers as $assignedUser) {
                    // Удаляем старую аватарку закрепленного пользователя, если она есть
                    if ($assignedUser->avatar) {
                        $oldUserAvatarPath = $assignedUser->avatar;
                        if (strpos($oldUserAvatarPath, '/storage/') !== false) {
                            $oldUserAvatarPath = str_replace('/storage/', '', parse_url($oldUserAvatarPath, PHP_URL_PATH));
                        } else {
                            // Если путь не содержит /storage/, возможно это уже относительный путь
                            $oldUserAvatarPath = str_replace(Storage::disk('public')->url(''), '', $oldUserAvatarPath);
                        }
                        
                        // Удаляем первый слеш, если есть
                        $oldUserAvatarPath = ltrim($oldUserAvatarPath, '/');
                        
                        if ($oldUserAvatarPath && Storage::disk('public')->exists($oldUserAvatarPath)) {
                            Storage::disk('public')->delete($oldUserAvatarPath);
                        }
                    }
                    
                    // Копируем файл для каждого пользователя, чтобы у каждого была своя копия
                    $newPath = 'avatars/user_' . $assignedUser->id . '_' . time() . '.' . $avatarFile->getClientOriginalExtension();
                    Storage::disk('public')->copy($path, $newPath);
                    $assignedUser->update(['avatar' => Storage::disk('public')->url($newPath)]);
                }
            }
        }

        $user->update($validated);
        $user->refresh();
        $user->load(['roles', 'moderatorProfile', 'adminProfile']);

        \Log::info('Profile updated', [
            'user_id' => $user->id,
            'avatar' => $user->avatar,
        ]);

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

        // Обновляем пароль и registration_password
        $user->password = Hash::make($validated['new_password']);
        $user->registration_password = $validated['new_password'];
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }
}

