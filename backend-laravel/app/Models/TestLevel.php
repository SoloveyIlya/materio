<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestLevel extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'name',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function tests()
    {
        return $this->hasMany(Test::class);
    }
}
