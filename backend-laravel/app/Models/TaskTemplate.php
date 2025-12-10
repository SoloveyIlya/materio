<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'category_id',
        'title',
        'description',
        'price',
        'completion_hours',
        'guides_links',
        'attached_services',
        'work_day',
        'is_primary',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'completion_hours' => 'integer',
        'guides_links' => 'array',
        'attached_services' => 'array',
        'work_day' => 'integer',
        'is_primary' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function category()
    {
        return $this->belongsTo(TaskCategory::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'template_id');
    }
}

