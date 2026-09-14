<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PriceTrend;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PredictTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake();
    }

    private function farmerWithProduct(array $productAttributes = []): array
    {
        $farmer = User::factory()->farmer()->has(FarmerProfile::factory(['province' => 'Laguna']))->create();
        $category = Category::factory()->create();
        $product = Product::factory()->create(array_merge([
            'farmer_id' => $farmer->id,
            'category_id' => $category->id,
        ], $productAttributes));

        return [$farmer, $category, $product];
    }

    // ── Recording on completion ──

    public function test_completing_an_order_records_price_trends_per_item(): void
    {
        [$farmer, $category, $product] = $this->farmerWithProduct();
        $order = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'ready']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 2, 'unit_price' => 55.25, 'subtotal' => 110.50]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk();

        // Model-level assertions — the date cast binds differently on SQLite vs MySQL
        $trend = PriceTrend::first();
        $this->assertNotNull($trend);
        $this->assertSame($category->id, $trend->category_id);
        $this->assertSame('Laguna', $trend->region);
        $this->assertSame(55.25, (float) $trend->recorded_price);
        $this->assertTrue($trend->recorded_date->isSameDay(now()));
        $this->assertDatabaseCount('price_trends', 1);
    }

    public function test_non_completed_transitions_record_nothing(): void
    {
        [$farmer, , $product] = $this->farmerWithProduct();
        $order = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'pending']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 2, 'unit_price' => 55.25, 'subtotal' => 110.50]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertOk();

        $this->assertDatabaseCount('price_trends', 0);
    }

    public function test_re_completing_an_already_completed_order_does_not_duplicate_trends(): void
    {
        [$farmer, , $product] = $this->farmerWithProduct();
        $order = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'ready']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 55.25, 'subtotal' => 55.25]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->withHeaders($headers)->patchJson("/api/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();
        // Admins bypass the transition map, so guard the hook itself against re-fires.
        // Use actingAs (not withHeader) — default headers persist across calls on the
        // same TestCase, so a second Bearer header would still authenticate as farmer.
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)
            ->patchJson("/api/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk();

        $this->assertDatabaseCount('price_trends', 1);
    }

    // ── Insights endpoint ──

    public function test_insights_return_price_series_and_regional_comparison(): void
    {
        [$farmer, $category] = $this->farmerWithProduct();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 50.50, 'recorded_date' => now()->subDay()]);
        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 60.00, 'recorded_date' => now()->subDay()]);
        PriceTrend::create(['category_id' => $category->id, 'region' => 'Cebu', 'recorded_price' => 40.00, 'recorded_date' => now()->subDay()]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertOk()
            ->assertJsonPath('category.id', $category->id)
            ->assertJsonPath('region', 'Laguna')
            ->assertJsonPath('price_series.0.avg_price', 55.25)
            ->assertJsonPath('price_series.0.samples', 2)
            ->assertJsonCount(2, 'regional_comparison')
            ->assertJsonFragment(['region' => 'Laguna', 'avg_price' => 55.25, 'is_home' => true]);
    }

    public function test_price_series_covers_home_region_and_recent_window_only(): void
    {
        [$farmer, $category] = $this->farmerWithProduct();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 50.50, 'recorded_date' => now()->subDay()]);
        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 99.00, 'recorded_date' => now()->subDays(40)]);
        PriceTrend::create(['category_id' => $category->id, 'region' => 'Cebu', 'recorded_price' => 40.00, 'recorded_date' => now()->subDay()]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertOk()
            ->assertJsonCount(1, 'price_series')
            ->assertJsonPath('price_series.0.avg_price', 50.5)
            ->assertJsonCount(2, 'regional_comparison');
    }

    public function test_demand_direction_detects_rising_volume(): void
    {
        [$farmer, , $product] = $this->farmerWithProduct();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $old = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'created_at' => now()->subWeeks(6)]);
        OrderItem::create(['order_id' => $old->id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 50, 'subtotal' => 50]);
        $recent = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'created_at' => now()->subDays(3)]);
        OrderItem::create(['order_id' => $recent->id, 'product_id' => $product->id, 'quantity' => 5, 'unit_price' => 50, 'subtotal' => 250]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertOk()
            ->assertJsonPath('demand.direction', 'rising');
    }

    public function test_best_time_recommends_top_priced_month_and_busiest_day(): void
    {
        [$farmer, $category] = $this->farmerWithProduct();
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 99.00, 'recorded_date' => '2026-04-10']);
        PriceTrend::create(['category_id' => $category->id, 'region' => 'Laguna', 'recorded_price' => 20.00, 'recorded_date' => '2026-05-10']);

        $saturday = Carbon::now()->subWeeks(2)->previous(Carbon::SATURDAY);
        $monday = Carbon::now()->subWeeks(2)->previous(Carbon::MONDAY);
        $satOrder = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'created_at' => $saturday]);
        $monOrder = Order::factory()->create(['farmer_id' => $farmer->id, 'status' => 'completed', 'created_at' => $monday]);
        $product = Product::where('farmer_id', $farmer->id)->first();
        OrderItem::create(['order_id' => $satOrder->id, 'product_id' => $product->id, 'quantity' => 3, 'unit_price' => 50, 'subtotal' => 150]);
        OrderItem::create(['order_id' => $monOrder->id, 'product_id' => $product->id, 'quantity' => 1, 'unit_price' => 50, 'subtotal' => 50]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertOk()
            ->assertJsonPath('best_time.best_month.month', 4)
            ->assertJsonPath('best_time.best_month.name', 'April')
            ->assertJsonPath('best_time.best_day.day', 'Saturday')
            ->assertJsonPath('best_time.recommendation', fn ($r) => str_contains($r, 'April') && str_contains($r, 'Saturday'));
    }

    public function test_insights_default_to_the_farmers_first_category(): void
    {
        [$farmer, $category] = $this->farmerWithProduct();
        $otherCategory = Category::factory()->create();
        Product::factory()->create(['farmer_id' => $farmer->id, 'category_id' => $otherCategory->id]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertOk()
            ->assertJsonPath('category.id', $category->id);
    }

    public function test_buyers_cannot_access_predict_insights(): void
    {
        $buyer = User::factory()->buyerIndividual()->create();
        $token = $buyer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/predict/insights')
            ->assertForbidden();
    }
}
