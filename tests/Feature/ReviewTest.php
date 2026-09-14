<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_review_completed_order(): void
    {
        $order = Order::factory()->create(['status' => 'completed']);
        $buyer = $order->buyer;
        $token = $buyer->createToken('auth-token', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/orders/{$order->id}/review", [
                'rating' => 5,
                'comment' => 'Fresh talaga!',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reviews', [
            'order_id' => $order->id,
            'reviewer_id' => $buyer->id,
            'farmer_id' => $order->farmer_id,
            'rating' => 5,
        ]);
    }

    public function test_only_the_order_buyer_can_review(): void
    {
        $order = Order::factory()->create(['status' => 'completed']);
        $stranger = User::factory()->buyerIndividual()->create();
        $token = $stranger->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/orders/{$order->id}/review", ['rating' => 5])
            ->assertForbidden();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_only_completed_orders_can_be_reviewed(): void
    {
        $order = Order::factory()->create(['status' => 'pending']);
        $token = $order->buyer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/orders/{$order->id}/review", ['rating' => 4])
            ->assertUnprocessable();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_review_is_unique_per_order(): void
    {
        $order = Order::factory()->create(['status' => 'completed']);
        $token = $order->buyer->createToken('auth-token', ['*'])->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->withHeaders($headers)->postJson("/api/orders/{$order->id}/review", ['rating' => 5])->assertCreated();

        $this->withHeaders($headers)
            ->postJson("/api/orders/{$order->id}/review", ['rating' => 2])
            ->assertUnprocessable();

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_rating_must_be_between_one_and_five(): void
    {
        $order = Order::factory()->create(['status' => 'completed']);
        $token = $order->buyer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/orders/{$order->id}/review", ['rating' => 6])
            ->assertInvalid(['rating']);
    }

    public function test_product_endpoints_surface_farmer_rating_aggregates(): void
    {
        $product = Product::factory()->create();
        $farmerId = $product->farmer_id;

        $orders = Order::factory()->count(2)->create([
            'farmer_id' => $farmerId,
            'status' => 'completed',
        ]);
        Review::create(['order_id' => $orders[0]->id, 'reviewer_id' => $orders[0]->buyer_id, 'farmer_id' => $farmerId, 'rating' => 4]);
        Review::create(['order_id' => $orders[1]->id, 'reviewer_id' => $orders[1]->buyer_id, 'farmer_id' => $farmerId, 'rating' => 5]);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.farmer.rating_avg', 4.5)
            ->assertJsonPath('data.farmer.rating_count', 2)
            ->assertJsonPath('data.rating', 4.5);
    }

    public function test_farmer_reviews_endpoint_lists_reviews_publicly(): void
    {
        $orders = Order::factory()->count(2)->create(['status' => 'completed']);
        $farmerId = $orders[0]->farmer_id;

        // Same farmer owns both orders (factory draws farmers independently, so re-point order 2)
        $orders[1]->update(['farmer_id' => $farmerId]);

        Review::create([
            'order_id' => $orders[0]->id,
            'reviewer_id' => $orders[0]->buyer_id,
            'farmer_id' => $farmerId,
            'rating' => 5,
            'comment' => 'Best kamatis.',
        ]);
        Review::create([
            'order_id' => $orders[1]->id,
            'reviewer_id' => $orders[1]->buyer_id,
            'farmer_id' => $farmerId,
            'rating' => 4,
        ]);

        $this->getJson("/api/farmers/{$farmerId}/reviews")
            ->assertOk()
            ->assertJsonPath('rating_avg', 4.5)
            ->assertJsonPath('rating_count', 2)
            ->assertJsonCount(2, 'reviews')
            ->assertJsonFragment(['comment' => 'Best kamatis.', 'rating' => 5, 'reviewer_name' => $orders[0]->buyer->name]);
    }
}
