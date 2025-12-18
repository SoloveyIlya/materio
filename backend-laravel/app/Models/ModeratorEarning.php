<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModeratorEarning extends Model
{
    use HasFactory;

    protected $fillable = [
        'moderator_id',
        'task_id',
        'amount',
        'earned_at',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'earned_at' => 'datetime',
    ];

    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
