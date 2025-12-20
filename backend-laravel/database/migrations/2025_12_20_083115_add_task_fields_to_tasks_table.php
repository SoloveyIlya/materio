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
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('country')->nullable();
            $table->string('address')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('email')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('id_type')->nullable();
            $table->string('id_number')->nullable();
            $table->string('document_image')->nullable();
            $table->string('selfie_image')->nullable();
            $table->text('comment')->nullable();
            $table->foreignId('documentation_id')->nullable()->constrained('documentation_pages')->onDelete('set null');
            $table->foreignId('tool_id')->nullable()->constrained('tools')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['documentation_id']);
            $table->dropForeign(['tool_id']);
            $table->dropColumn([
                'first_name',
                'last_name',
                'country',
                'address',
                'phone_number',
                'email',
                'date_of_birth',
                'id_type',
                'id_number',
                'document_image',
                'selfie_image',
                'comment',
                'documentation_id',
                'tool_id',
            ]);
        });
    }
};
