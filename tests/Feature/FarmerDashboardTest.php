<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FarmerDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_sums_own_non_cancelled_orders_per_period(): void
    {
        $farmer = User::factory()->farmer()->create();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;
        $product = Product::factory()->create(['farmer_id' => $farmer->id]);

        $today = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'total_amount' => 300.50]);
        $thisWeek = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'delivered', 'total_amount' => 200.25, 'created_at' => now()->subDays(3)]);
        Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'total_amount' => 1000.00, 'created_at' => now()->subDays(30)]);
        Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'cancelled', 'total_amount' => 999.99]);
        Order::factory()->create(['status' => 'completed', 'total_amount' => 500.00]); // another farmer's sale

        OrderItem::create(['order_id' => $today->id, 'product_id' => $product->id, 'quantity' => 2, 'unit_price' => 100, 'subtotal' => 200]);
        OrderItem::create(['order_id' => $thisWeek->id, 'product_id' => $product->id, 'quantity' => 3, 'unit_price' => 50, 'subtotal' => 150]);

        // Whole-number sums serialize as JSON ints (serialize_precision), so no .0 suffixes
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/farmer/dashboard')
            ->assertOk()
            ->assertJsonPath('sales.today.revenue', 300.5)
            ->assertJsonPath('sales.today.orders', 1)
            ->assertJsonPath('sales.today.items_sold', 2)
            ->assertJsonPath('sales.week.revenue', 500.75)
            ->assertJsonPath('sales.week.orders', 2)
            ->assertJsonPath('sales.week.items_sold', 5)
            ->assertJsonPath('sales.all_time.revenue', 1500.75)
            ->assertJsonPath('sales.all_time.orders', 3)
            ->assertJsonPath('sales.all_time.items_sold', 5);
    }

    public function test_dashboard_counts_pending_orders_and_low_stock(): void
    {
        $farmer = User::factory()->farmer()->create();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        Order::factory()->count(2)->create(['farmer_id' => $farmer->id, 'status' => 'pending', 'total_amount' => 10]);
        $low = Product::factory()->create(['farmer_id' => $farmer->id, 'name' => 'Siling Labuyo', 'available_quantity' => 3]);
        Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 50]);
        Product::factory()->archived()->create(['farmer_id' => $farmer->id, 'available_quantity' => 2]);
        Product::factory()->create(['available_quantity' => 1]); // another farmer's product

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/farmer/dashboard')
            ->assertOk()
            ->assertJsonPath('pending_orders', 2)
            ->assertJsonPath('low_stock_count', 1)
            ->assertJsonPath('low_stock.0.id', $low->id)
            ->assertJsonPath('low_stock.0.name', 'Siling Labuyo');
    }
}
