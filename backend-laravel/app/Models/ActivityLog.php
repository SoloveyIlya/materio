<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'user_id',
        'action',
        'model_type',
        'model_id',
        'data',
        'description',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function model()
    {
        return $this->morphTo();
    }
}

