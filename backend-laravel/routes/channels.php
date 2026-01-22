<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The required channels may be returned from Closure
| based channel definitions or classes. Returning null will return false.
|
*/

Broadcast::channel('domain.{domainId}', function ($user, $domainId) {
    // Разрешаем доступ к каналу домена для всех аутентифицированных пользователей
    return $user ? ['id' => $user->id, 'name' => $user->name] : false;
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    // Разрешаем доступ только к собственному каналу пользователя
    return $user && (int) $user->id === (int) $userId 
        ? ['id' => $user->id, 'name' => $user->name] 
        : false;
});

Broadcast::channel('admin.{adminId}', function ($user, $adminId) {
    // Разрешаем доступ только к собственному каналу администратора
    return $user && (int) $user->id === (int) $adminId 
        ? ['id' => $user->id, 'name' => $user->name] 
        : false;
});
