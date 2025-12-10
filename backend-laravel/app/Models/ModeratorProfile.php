<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModeratorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'settings',
        'minimum_minutes_between_tasks',
    ];

    protected $casts = [
        'settings' => 'array',
        'minimum_minutes_between_tasks' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

