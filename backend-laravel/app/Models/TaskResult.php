<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'moderator_id',
        'answers',
        'screenshots',
        'attachments',
        'moderator_comment',
        'admin_comment',
        'tool_data',
        'additional_info',
    ];

    protected $casts = [
        'screenshots' => 'array',
        'attachments' => 'array',
        'tool_data' => 'array',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }
}
