<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'name',
        'slug',
        'description',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function templates()
    {
        return $this->hasMany(TaskTemplate::class, 'category_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'category_id');
    }
}

