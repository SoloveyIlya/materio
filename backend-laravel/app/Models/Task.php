<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'template_id',
        'category_id',
        'assigned_to',
        'title',
        'description',
        'price',
        'completion_hours',
        'status',
        'assigned_at',
        'completed_at',
        'due_at',
        'guides_links',
        'attached_services',
        'work_day',
        'is_main_task',
        'first_name',
        'last_name',
        'country',
        'address',
        'phone_number',
        'email',
        'date_of_birth',
        'id_type',
        'id_number',
        'document_image',
        'document_image_name',
        'selfie_image',
        'comment',
        'documentation_id',
        'tool_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'completion_hours' => 'integer',
        'status' => 'string',
        'assigned_at' => 'datetime',
        'completed_at' => 'datetime',
        'due_at' => 'datetime',
        'guides_links' => 'array',
        'attached_services' => 'array',
        'work_day' => 'integer',
        'is_main_task' => 'boolean',
        'date_of_birth' => 'date',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function template()
    {
        return $this->belongsTo(TaskTemplate::class);
    }

    public function category()
    {
        return $this->belongsTo(TaskCategory::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignments()
    {
        return $this->hasMany(TaskAssignment::class);
    }

    public function result()
    {
        return $this->hasOne(TaskResult::class);
    }

    public function documentation()
    {
        return $this->belongsTo(DocumentationPage::class, 'documentation_id');
    }

    public function tool()
    {
        return $this->belongsTo(Tool::class, 'tool_id');
    }

    /**
     * Проверяет, назначена ли задача пользователю (напрямую или через TaskAssignment)
     */
    public function isAssignedTo(int $userId): bool
    {
        return $this->assigned_to === $userId || 
               $this->assignments()->where('assigned_to', $userId)->exists();
    }
}

