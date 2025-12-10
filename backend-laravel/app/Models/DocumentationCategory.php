<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentationCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'name',
        'slug',
        'description',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function pages()
    {
        return $this->hasMany(DocumentationPage::class);
    }
}

