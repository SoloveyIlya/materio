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
        'has_w4',
        'has_i9',
        'has_direct',
        'task_timezone',
        'task_start_time',
        'task_end_time',
        'task_min_interval',
        'task_max_interval',
        'work_schedule',
    ];

    protected $casts = [
        'settings' => 'array',
        'minimum_minutes_between_tasks' => 'integer',
        'has_w4' => 'boolean',
        'has_i9' => 'boolean',
        'has_direct' => 'boolean',
        'task_min_interval' => 'integer',
        'task_max_interval' => 'integer',
        'work_schedule' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

