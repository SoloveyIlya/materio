<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'domain_id',
        'name',
        'email',
        'password',
        'timezone',
        'work_start_date',
        'ip_address',
        'user_agent',
        'location',
        'platform',
        'last_seen_at',
        'is_online',
        'administrator_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'work_start_date' => 'date',
            'last_seen_at' => 'datetime',
            'is_online' => 'boolean',
        ];
    }

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function moderatorProfile()
    {
        return $this->hasOne(ModeratorProfile::class);
    }

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class);
    }

    public function hasRole($roleName)
    {
        return $this->roles()->where('name', $roleName)->exists();
    }

    public function isAdmin()
    {
        return $this->hasRole('admin');
    }

    public function isModerator()
    {
        return $this->hasRole('moderator');
    }

    public function getCurrentWorkDay()
    {
        if (!$this->work_start_date) {
            return null;
        }

        $startDate = \Carbon\Carbon::parse($this->work_start_date);
        $now = \Carbon\Carbon::now($this->timezone ?? 'UTC');
        
        return $startDate->diffInDays($now) + 1; // День 1, 2, 3...
    }

    public function administrator()
    {
        return $this->belongsTo(User::class, 'administrator_id');
    }

    public function moderators()
    {
        return $this->hasMany(User::class, 'administrator_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }
}

