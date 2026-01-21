<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'Admin Backend API'];
});

Broadcast::routes(['middleware' => ['auth:sanctum']]);

