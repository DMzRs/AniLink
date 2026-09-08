<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('unit_type')->comment('kg/sack/piece etc');
            $table->decimal('price_per_unit', 10, 2);
            $table->decimal('available_quantity', 10, 2)->default(0);
            $table->decimal('min_bulk_quantity', 10, 2)->nullable();
            $table->decimal('bulk_price', 10, 2)->nullable();
            $table->date('harvest_date')->nullable();
            $table->enum('status', ['available', 'sold_out', 'archived'])->default('available');
            $table->timestamps();

            $table->index('category_id');
            $table->index('farmer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
