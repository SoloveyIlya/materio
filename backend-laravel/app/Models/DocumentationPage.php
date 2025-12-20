<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentationPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'category_id',
        'title',
        'slug',
        'content',
        'content_blocks',
        'images',
        'videos',
        'tools',
        'related_task_categories',
        'related_tasks',
        'order',
        'is_published',
    ];

    protected $casts = [
        'order' => 'integer',
        'is_published' => 'boolean',
        'content_blocks' => 'array',
        'images' => 'array',
        'videos' => 'array',
        'tools' => 'array',
        'related_task_categories' => 'array',
        'related_tasks' => 'array',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function category()
    {
        return $this->belongsTo(DocumentationCategory::class);
    }

    public function relatedTaskCategories()
    {
        return $this->belongsToMany(TaskCategory::class, 'documentation_page_task_category', 'documentation_page_id', 'task_category_id');
    }

    public function relatedTasks()
    {
        return $this->belongsToMany(Task::class, 'documentation_page_task', 'documentation_page_id', 'task_id');
    }
}

