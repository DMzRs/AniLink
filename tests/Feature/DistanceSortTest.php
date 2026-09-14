<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\Product;
use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DistanceSortTest extends TestCase
{
    use RefreshDatabase;

    private function farmerIn(string $province): User
    {
        return User::factory()->farmer()->has(FarmerProfile::factory(['province' => $province]))->create();
    }

    public function test_regions_endpoint_lists_provinces_publicly(): void
    {
        Region::create(['name' => 'Laguna', 'latitude' => 14.20, 'longitude' => 121.36]);
        Region::create(['name' => 'Nueva Ecija', 'latitude' => 15.58, 'longitude' => 120.92]);

        $this->getJson('/api/regions')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Laguna'])
            ->assertJsonFragment(['name' => 'Nueva Ecija']);
    }

    public function test_distance_sort_orders_by_proximity_and_fills_distance_km(): void
    {
        // Laguna farmer is "near", Nueva Ecija is ~150km away, Atlantis is not in the regions table
        $lagunaFarmer = $this->farmerIn('Laguna');
        $ecijaFarmer = $this->farmerIn('Nueva Ecija');
        $unknownFarmer = $this->farmerIn('Atlantis');
        Region::create(['name' => 'Laguna', 'latitude' => 14.20, 'longitude' => 121.36]);
        Region::create(['name' => 'Nueva Ecija', 'latitude' => 15.58, 'longitude' => 120.92]);

        Product::factory()->create(['farmer_id' => $ecijaFarmer->id, 'name' => 'Rice from Ecija']);
        Product::factory()->create(['farmer_id' => $lagunaFarmer->id, 'name' => 'Veg from Laguna']);
        Product::factory()->create(['farmer_id' => $unknownFarmer->id, 'name' => 'Mystery crop']);

        $response = $this->getJson('/api/products?sort=distance&near=Laguna&per_page=50')
            ->assertOk();

        $response->assertJsonPath('data.0.name', 'Veg from Laguna')
            ->assertJsonPath('data.0.farmer.distance_km', 0)
            ->assertJsonPath('data.1.name', 'Rice from Ecija');

        $km = $response->json('data.1.farmer.distance_km');
        $this->assertNotNull($km);
        $this->assertGreaterThan(100, $km);
        $this->assertLessThan(200, $km);

        $this->assertSame('Mystery crop', $response->json('data.2.name'));
        $this->assertNull($response->json('data.2.farmer.distance_km'));
    }

    public function test_distance_sort_without_near_falls_back_to_freshness(): void
    {
        $farmer = $this->farmerIn('Laguna');
        Region::create(['name' => 'Laguna', 'latitude' => 14.20, 'longitude' => 121.36]);
        Product::factory()->create(['farmer_id' => $farmer->id, 'name' => 'Older harvest', 'harvest_date' => now()->subDays(5)->toDateString()]);
        Product::factory()->create(['farmer_id' => $farmer->id, 'name' => 'Fresh harvest']);

        $this->getJson('/api/products?sort=distance&per_page=50')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Fresh harvest')
            ->assertJsonPath('data.0.farmer.distance_km', null);
    }

    public function test_distance_sort_with_unknown_near_province_falls_back_to_freshness(): void
    {
        $farmer = $this->farmerIn('Laguna');
        Region::create(['name' => 'Laguna', 'latitude' => 14.20, 'longitude' => 121.36]);
        Product::factory()->create(['farmer_id' => $farmer->id, 'name' => 'Older harvest', 'harvest_date' => now()->subDays(5)->toDateString()]);
        Product::factory()->create(['farmer_id' => $farmer->id, 'name' => 'Fresh harvest']);

        $this->getJson('/api/products?sort=distance&near=Atlantis&per_page=50')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Fresh harvest');
    }
}
