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
        'order',
        'is_published',
    ];

    protected $casts = [
        'order' => 'integer',
        'is_published' => 'boolean',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function category()
    {
        return $this->belongsTo(DocumentationCategory::class);
    }
}

