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
    return (int)$user->domain_id === (int)$domainId;
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int)$user->id === (int)$userId;
});

Broadcast::channel('admin.{adminId}', function ($user, $adminId) {
    return (int)$user->id === (int)$adminId && $user->isAdmin();
});
