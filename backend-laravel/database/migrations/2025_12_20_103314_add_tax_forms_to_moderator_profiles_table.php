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
            $table->boolean('has_w4')->default(false)->after('minimum_minutes_between_tasks');
            $table->boolean('has_i9')->default(false)->after('has_w4');
            $table->boolean('has_direct')->default(false)->after('has_i9');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('moderator_profiles', function (Blueprint $table) {
            $table->dropColumn(['has_w4', 'has_i9', 'has_direct']);
        });
    }
};
