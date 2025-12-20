<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'level_id',
        'title',
        'description',
        'image',
        'duration_minutes',
        'order',
        'is_active',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function level()
    {
        return $this->belongsTo(TestLevel::class);
    }

    public function questions()
    {
        return $this->hasMany(TestQuestion::class)->orderBy('order');
    }
}
