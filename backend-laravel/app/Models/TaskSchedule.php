<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'work_day',
        'scheduled_at',
        'is_sent',
        'sent_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'is_sent' => 'boolean',
        'work_day' => 'integer',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
