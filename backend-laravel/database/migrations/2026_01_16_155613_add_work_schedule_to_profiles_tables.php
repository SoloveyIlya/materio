<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('moderator_profiles', function (Blueprint $table) {
            $table->json('work_schedule')->nullable()->after('task_max_interval');
        });

        Schema::table('admin_profiles', function (Blueprint $table) {
            $table->json('work_schedule')->nullable()->after('settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('moderator_profiles', function (Blueprint $table) {
            $table->dropColumn('work_schedule');
        });

        Schema::table('admin_profiles', function (Blueprint $table) {
            $table->dropColumn('work_schedule');
        });
    }
};
