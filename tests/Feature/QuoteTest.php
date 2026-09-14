<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\QuoteRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QuoteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(); // Expo push is a no-op without push tokens, fake anyway
    }

    private function businessBuyer(): User
    {
        return User::factory()->buyerBusiness()->create();
    }

    private function quotedQuote(): array
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create(['available_quantity' => 100]);
        $quote = QuoteRequest::create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => 10,
            'message' => 'Weekly standing order, what can you do?',
        ]);

        $this->actingAs($product->farmer, 'sanctum')
            ->patchJson("/api/farmer/quotes/{$quote->id}", [
                'action' => 'quote',
                'quoted_unit_price' => 42.50,
                'response_note' => 'For you — 42.50/kg.',
            ])->assertOk();

        return [$buyer, $product, $quote->fresh()];
    }

    // ── Request ──

    public function test_business_buyer_can_request_a_quote_and_farmer_is_notified(): void
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create(['available_quantity' => 100, 'min_bulk_quantity' => 10]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/quotes', [
                'product_id' => $product->id,
                'quantity' => 10,
                'message' => 'Weekly standing order, what can you do?',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('quote_requests', [
            'buyer_id' => $buyer->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => 10,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $product->farmer_id,
            'type' => 'quote_request',
        ]);
    }

    public function test_only_business_buyers_can_request_quotes(): void
    {
        $product = Product::factory()->bulkPricing()->create();

        foreach ([User::factory()->buyerIndividual()->create(), User::factory()->farmer()->create()] as $user) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/quotes', ['product_id' => $product->id, 'quantity' => 60])
                ->assertForbidden();
        }

        $this->assertDatabaseCount('quote_requests', 0);
    }

    public function test_quote_quantity_below_bulk_minimum_is_rejected(): void
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create(['min_bulk_quantity' => 10]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/quotes', ['product_id' => $product->id, 'quantity' => 5])
            ->assertInvalid(['quantity']);

        $this->assertDatabaseCount('quote_requests', 0);
    }

    // ── Farmer responds ──

    public function test_farmer_sees_only_own_quotes_and_can_quote_a_price(): void
    {
        [$buyer, $product, $quote] = $this->quotedQuote();

        $this->assertDatabaseHas('quote_requests', [
            'id' => $quote->id,
            'status' => 'quoted',
            'quoted_unit_price' => 42.50,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'type' => 'quote_quoted',
        ]);

        // The responding farmer lists their incoming quotes and sees this one
        $this->actingAs($product->farmer, 'sanctum')
            ->getJson('/api/farmer/quotes')
            ->assertOk()
            ->assertJsonPath('quotes.0.id', $quote->id);
    }

    public function test_farmer_cannot_respond_to_another_farmers_quote(): void
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create();
        $quote = QuoteRequest::create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $strangerFarmer = User::factory()->farmer()->create();

        $this->actingAs($strangerFarmer, 'sanctum')
            ->patchJson("/api/farmer/quotes/{$quote->id}", ['action' => 'quote', 'quoted_unit_price' => 10])
            ->assertForbidden();
    }

    public function test_double_response_is_rejected(): void
    {
        [$buyer, $product, $quote] = $this->quotedQuote();

        $this->actingAs($product->farmer, 'sanctum')
            ->patchJson("/api/farmer/quotes/{$quote->id}", ['action' => 'quote', 'quoted_unit_price' => 50])
            ->assertUnprocessable();
    }

    // ── Accept ──

    public function test_accepting_a_quote_creates_bulk_order_at_quoted_price(): void
    {
        [$buyer, $product, $quote] = $this->quotedQuote();

        $response = $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/quotes/{$quote->id}/accept", ['fulfillment_type' => 'pickup'])
            ->assertOk();

        $order = Order::where('buyer_id', $buyer->id)->first();
        $this->assertNotNull($order);
        $this->assertSame('bulk', $order->order_type);
        $this->assertSame('pending', $order->status);
        $this->assertSame(425.00, (float) $order->total_amount); // 10 × 42.50, pickup = no fee

        $item = OrderItem::where('order_id', $order->id)->first();
        $this->assertSame(42.50, (float) $item->unit_price);
        $this->assertSame(90.0, (float) $product->fresh()->available_quantity);

        $this->assertDatabaseHas('quote_requests', ['id' => $quote->id, 'status' => 'accepted']);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $product->farmer_id,
            'type' => 'quote_accepted',
        ]);
        $response->assertJsonPath('data.order_id', $order->id);
    }

    public function test_accept_fails_cleanly_when_stock_is_insufficient(): void
    {
        [$buyer, $product, $quote] = $this->quotedQuote();
        $product->update(['available_quantity' => 3]);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/quotes/{$quote->id}/accept", ['fulfillment_type' => 'pickup'])
            ->assertUnprocessable();

        // Quote stays usable, nothing was ordered or deducted
        $this->assertDatabaseHas('quote_requests', ['id' => $quote->id, 'status' => 'quoted']);
        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(3.0, (float) $product->fresh()->available_quantity);
    }

    public function test_cannot_accept_a_pending_or_already_accepted_quote(): void
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create(['available_quantity' => 100]);
        $pending = QuoteRequest::create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/quotes/{$pending->id}/accept", ['fulfillment_type' => 'pickup'])
            ->assertUnprocessable();

        $this->assertDatabaseCount('orders', 0);
    }

    // ── Withdraw ──

    public function test_buyer_can_withdraw_a_pending_quote(): void
    {
        $buyer = $this->businessBuyer();
        $product = Product::factory()->bulkPricing()->create();
        $quote = QuoteRequest::create([
            'buyer_id' => $buyer->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/quotes/{$quote->id}/withdraw")
            ->assertOk();

        $this->assertDatabaseHas('quote_requests', ['id' => $quote->id, 'status' => 'withdrawn']);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $product->farmer_id,
            'type' => 'quote_withdrawn',
        ]);

        // A withdrawn quote can no longer be responded to
        $this->actingAs($product->farmer, 'sanctum')
            ->patchJson("/api/farmer/quotes/{$quote->id}", ['action' => 'quote', 'quoted_unit_price' => 40])
            ->assertUnprocessable();
    }
}
