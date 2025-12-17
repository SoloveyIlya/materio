<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('ip_address')->nullable()->after('work_start_date');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->string('location')->nullable()->after('user_agent'); // Location по IP
            $table->string('platform')->nullable()->after('location'); // Platform из User Agent
            $table->timestamp('last_seen_at')->nullable()->after('platform');
            $table->boolean('is_online')->default(false)->after('last_seen_at');
            $table->foreignId('administrator_id')->nullable()->after('is_online')->constrained('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['administrator_id']);
            $table->dropColumn(['ip_address', 'user_agent', 'location', 'platform', 'last_seen_at', 'is_online', 'administrator_id']);
        });
    }
};
