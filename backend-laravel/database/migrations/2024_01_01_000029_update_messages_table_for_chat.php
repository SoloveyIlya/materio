<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('task_id')->nullable()->after('to_user_id')->constrained('tasks')->onDelete('cascade');
            $table->enum('type', ['message', 'support'])->default('message')->after('task_id');
            $table->json('attachments')->nullable()->after('body');
            $table->boolean('is_edited')->default(false)->after('is_read');
            $table->timestamp('edited_at')->nullable()->after('is_edited');
            $table->boolean('is_deleted')->default(false)->after('edited_at');
            $table->timestamp('deleted_at')->nullable()->after('is_deleted');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->dropColumn(['task_id', 'type', 'attachments', 'is_edited', 'edited_at', 'is_deleted', 'deleted_at']);
        });
    }
};
