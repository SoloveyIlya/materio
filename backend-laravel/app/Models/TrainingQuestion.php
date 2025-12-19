<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'moderator_id',
        'task_id',
        'question',
        'answer',
        'answered_by',
        'answered_at',
        'is_resolved',
    ];

    protected $casts = [
        'answered_at' => 'datetime',
        'is_resolved' => 'boolean',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function answeredBy()
    {
        return $this->belongsTo(User::class, 'answered_by');
    }
}
