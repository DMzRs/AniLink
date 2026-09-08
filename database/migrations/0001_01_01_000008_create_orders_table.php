<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('farmer_id')->constrained('users')->cascadeOnDelete();
            $table->enum('order_type', ['retail', 'bulk'])->default('retail');
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'])->default('pending');
            $table->enum('fulfillment_type', ['pickup', 'delivery'])->default('delivery');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('delivery_address')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('buyer_id');
            $table->index('farmer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
