<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_trends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('region');
            $table->decimal('recorded_price', 10, 2);
            $table->date('recorded_date');
            $table->timestamps();

            $table->index(['category_id', 'recorded_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_trends');
    }
};
