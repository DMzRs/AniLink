<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LowStockAlertTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(); // Expo push is a no-op without push tokens, fake anyway
    }

    public function test_crossing_into_low_stock_creates_one_notification(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 6]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/products/{$product->id}/stock", ['change_amount' => -1, 'reason' => 'sale'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $farmer->id,
            'type' => 'low_stock',
        ]);
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_already_low_stock_does_not_duplicate(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 5]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/products/{$product->id}/stock", ['change_amount' => -1, 'reason' => 'sale'])
            ->assertOk();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_restocking_above_threshold_rearms_the_alert(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 6]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->withHeaders($headers)->patchJson("/api/products/{$product->id}/stock", ['change_amount' => -1]); // 6 -> 5: alert
        $this->withHeaders($headers)->patchJson("/api/products/{$product->id}/stock", ['change_amount' => 10, 'reason' => 'restock']); // 5 -> 15: quiet
        $this->withHeaders($headers)->patchJson("/api/products/{$product->id}/stock", ['change_amount' => -10]); // 15 -> 5: alert again

        $this->assertDatabaseCount('notifications', 2);
    }

    public function test_selling_out_from_above_threshold_alerts_the_farmer(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 6]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/products/{$product->id}/stock", ['change_amount' => -6])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $farmer->id,
            'type' => 'low_stock',
        ]);
        $this->assertSame('sold_out', $product->fresh()->status);
    }

    public function test_restock_from_sold_out_does_not_alert(): void
    {
        $farmer = User::factory()->farmer()->create();
        $product = Product::factory()->create(['farmer_id' => $farmer->id, 'available_quantity' => 0]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/products/{$product->id}/stock", ['change_amount' => 10, 'reason' => 'restock'])
            ->assertOk();

        $this->assertDatabaseCount('notifications', 0);
    }
}
