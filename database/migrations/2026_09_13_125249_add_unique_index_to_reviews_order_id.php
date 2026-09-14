<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Spec: reviews are 1:1 with completed orders (anti-fake-review). The original
     * create migration chained ->unique() after ->constrained(), which the schema
     * builder silently ignores — this adds the constraint for real.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->unique('order_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
        });
    }
};
