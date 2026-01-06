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

    public function categories()
    {
        return $this->belongsToMany(TaskCategory::class, 'task_category', 'task_id', 'category_id');
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

    public function schedules()
    {
        return $this->hasMany(TaskSchedule::class);
    }

    public function documentations()
    {
        return $this->belongsToMany(DocumentationPage::class, 'task_documentation', 'task_id', 'documentation_id');
    }

    /**
     * Получить первую документацию (для обратной совместимости)
     * @deprecated Используйте documentations() для получения всех документаций
     */
    public function documentation()
    {
        if ($this->relationLoaded('documentations')) {
            return $this->getRelation('documentations')->first();
        }
        return $this->documentations()->first();
    }

    public function tools()
    {
        return $this->belongsToMany(Tool::class, 'task_tool', 'task_id', 'tool_id');
    }

    /**
     * Аксессор для получения первой категории (для обратной совместимости)
     */
    public function getCategoryAttribute()
    {
        if ($this->relationLoaded('categories')) {
            return $this->getRelation('categories')->first();
        }
        return $this->categories()->first();
    }

    /**
     * Аксессор для получения первого тулза (для обратной совместимости)
     */
    public function getToolAttribute()
    {
        if ($this->relationLoaded('tools')) {
            return $this->getRelation('tools')->first();
        }
        return $this->tools()->first();
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

