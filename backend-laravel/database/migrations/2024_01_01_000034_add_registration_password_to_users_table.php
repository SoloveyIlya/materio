<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // ВНИМАНИЕ: Хранение пароля в открытом виде небезопасно!
            // Это поле добавлено по требованию ТЗ, но рекомендуется использовать функционал сброса пароля
            $table->string('registration_password')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('registration_password');
        });
    }
};
