<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(); // Expo push is a no-op without push tokens, fake anyway
    }

    public function test_buyer_can_place_order_and_stock_is_deducted(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create([
            'farmer_id' => $farmer->id,
            'price_per_unit' => 50,
            'available_quantity' => 100,
        ]);
        $buyer = User::factory()->buyerIndividual()->create();

        $response = $this->actingAs($buyer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 10]],
            'order_type' => 'retail',
            'fulfillment_type' => 'pickup',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.0.status', 'pending');

        $this->assertDatabaseHas('orders', [
            'buyer_id' => $buyer->id,
            'farmer_id' => $farmer->id,
            'total_amount' => 500,
            'status' => 'pending',
        ]);
        $this->assertEquals(90, $product->fresh()->available_quantity);
        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'change_amount' => -10,
            'reason' => 'sale',
        ]);
        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $response->json('data.0.id'),
            'status' => 'pending',
        ]);
    }

    public function test_cart_spanning_multiple_farmers_creates_one_order_per_farmer(): void
    {
        $productA = Product::factory()->create(['price_per_unit' => 20]);
        $productB = Product::factory()->create(['price_per_unit' => 30]);
        $buyer = User::factory()->buyerIndividual()->create();

        $response = $this->actingAs($buyer)->postJson('/api/orders', [
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 5],
                ['product_id' => $productB->id, 'quantity' => 2],
            ],
            'order_type' => 'retail',
            'fulfillment_type' => 'delivery',
            'delivery_address' => '123 Rizal St.',
        ]);

        $response->assertCreated();
        $this->assertCount(2, Order::where('buyer_id', $buyer->id)->get());
        $this->assertDatabaseHas('orders', [
            'farmer_id' => $productA->farmer_id,
            'total_amount' => 145, // 100 + 45 delivery fee
        ]);
        $this->assertDatabaseHas('orders', [
            'farmer_id' => $productB->farmer_id,
            'total_amount' => 105, // 60 + 45 delivery fee
        ]);
    }

    public function test_insufficient_stock_is_rejected_without_deduction(): void
    {
        $product = Product::factory()->create(['available_quantity' => 5]);
        $buyer = User::factory()->buyerIndividual()->create();

        $this->actingAs($buyer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 10]],
            'order_type' => 'retail',
            'fulfillment_type' => 'pickup',
        ])->assertStatus(422)
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'Insufficient stock'));

        $this->assertEquals(5, $product->fresh()->available_quantity);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_bulk_orders_are_restricted_to_business_buyers(): void
    {
        $product = Product::factory()->bulkPricing()->create(['available_quantity' => 500]);
        $individualBuyer = User::factory()->buyerIndividual()->create();

        $this->actingAs($individualBuyer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 100]],
            'order_type' => 'bulk',
            'fulfillment_type' => 'pickup',
        ])->assertForbidden();
    }

    public function test_business_buyer_gets_bulk_price(): void
    {
        $product = Product::factory()->create([
            'price_per_unit' => 50,
            'min_bulk_quantity' => 50,
            'bulk_price' => 40,
            'available_quantity' => 500,
        ]);
        $buyer = User::factory()->buyerBusiness()->create();

        $this->actingAs($buyer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 60]],
            'order_type' => 'bulk',
            'fulfillment_type' => 'pickup',
        ])->assertCreated();

        $this->assertDatabaseHas('order_items', ['unit_price' => 40, 'subtotal' => 2400]);
    }

    public function test_farmer_cannot_place_order(): void
    {
        $product = Product::factory()->create();
        $farmer = User::factory()->farmer()->create();

        $this->actingAs($farmer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'order_type' => 'retail',
            'fulfillment_type' => 'pickup',
        ])->assertForbidden();
    }

    public function test_buyer_can_cancel_pending_order_and_stock_is_restored(): void
    {
        $product = Product::factory()->create(['price_per_unit' => 50, 'available_quantity' => 100]);
        $buyer = User::factory()->buyerIndividual()->create();

        $orderId = $this->actingAs($buyer)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 10]],
            'order_type' => 'retail',
            'fulfillment_type' => 'pickup',
        ])->assertCreated()
            ->json('data.0.id');

        $this->assertEquals(90, $product->fresh()->available_quantity);

        $this->actingAs($buyer)
            ->patchJson("/api/orders/{$orderId}/status", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertEquals(100, $product->fresh()->available_quantity);
        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'change_amount' => 10,
            'reason' => 'adjustment',
        ]);
    }

    public function test_invalid_status_transition_is_rejected(): void
    {
        $farmer = User::factory()->farmer()->create();
        $order = Order::factory()->for($farmer, 'farmer')->create(['status' => 'pending']);

        $this->actingAs($farmer)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertOk();

        $this->actingAs($farmer)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertStatus(422);
    }

    public function test_terminal_states_have_no_outgoing_transitions_for_farmers(): void
    {
        $farmer = User::factory()->farmer()->create();
        $cancelled = Order::factory()->for($farmer, 'farmer')->create(['status' => 'cancelled']);
        $completed = Order::factory()->for($farmer, 'farmer')->create(['status' => 'completed']);

        $this->actingAs($farmer)
            ->patchJson("/api/orders/{$cancelled->id}/status", ['status' => 'confirmed'])
            ->assertStatus(422);

        $this->actingAs($farmer)
            ->patchJson("/api/orders/{$completed->id}/status", ['status' => 'completed'])
            ->assertStatus(422);
    }

    public function test_outsider_cannot_view_order(): void
    {
        $order = Order::factory()->create();
        $stranger = User::factory()->buyerIndividual()->create();

        $this->actingAs($stranger)
            ->getJson("/api/orders/{$order->id}")
            ->assertForbidden();
    }

    public function test_cart_validate_reports_availability_and_bulk_eligibility(): void
    {
        $product = Product::factory()->create([
            'price_per_unit' => 50,
            'min_bulk_quantity' => 50,
            'bulk_price' => 40,
            'available_quantity' => 100,
        ]);
        $buyer = User::factory()->buyerIndividual()->create();

        $this->actingAs($buyer)->postJson('/api/cart/validate', [
            'items' => [['product_id' => $product->id, 'quantity' => 10]],
            'order_type' => 'bulk',
        ])->assertOk()
            ->assertJsonPath('items.0.bulk_eligible', false)
            ->assertJsonPath('items.0.available', true)
            ->assertJsonPath('subtotal', fn ($value) => (float) $value === 500.0);
    }
}
