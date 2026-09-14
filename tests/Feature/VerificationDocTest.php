<?php

namespace Tests\Feature;

use App\Models\FarmerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VerificationDocTest extends TestCase
{
    use RefreshDatabase;

    public function test_farmer_registration_requires_verification_document(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Lito Farmer',
            'email' => 'newfarmer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'farmer',
            'farm_name' => 'Lito Farm',
        ])->assertInvalid(['verification_doc']);

        $this->assertDatabaseMissing('users', ['email' => 'newfarmer@example.com']);
    }

    public function test_farmer_registration_stores_document_on_private_disk(): void
    {
        Storage::fake('local');

        $this->post('/api/register', [
            'name' => 'Lito Farmer',
            'email' => 'newfarmer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'farmer',
            'farm_name' => 'Lito Farm',
            'municipality' => 'Bay',
            'province' => 'Laguna',
            'verification_doc' => UploadedFile::fake()->create('permit.pdf', 200, 'application/pdf'),
        ])->assertCreated();

        $profile = FarmerProfile::whereHas('user', fn ($q) => $q->where('email', 'newfarmer@example.com'))->first();

        $this->assertNotNull($profile?->verification_doc_path);
        Storage::disk('local')->assertExists($profile->verification_doc_path);
        $this->assertSame('pending', $profile->verification_status);
    }

    public function test_buyer_registration_does_not_need_a_document(): void
    {
        Storage::fake('local');

        $this->postJson('/api/register', [
            'name' => 'Maria Buyer',
            'email' => 'newbuyer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'buyer_individual',
        ])->assertCreated();
    }

    public function test_verification_document_is_only_downloadable_by_admin(): void
    {
        Storage::fake('local');
        $farmer = User::factory()->farmer()->create();
        $profile = FarmerProfile::create([
            'user_id' => $farmer->id,
            'farm_name' => 'Lito Farm',
            'verification_status' => 'pending',
            'verification_doc_path' => UploadedFile::fake()->create('permit.pdf')->store('verification-docs', 'local'),
        ]);

        $this->actingAs($farmer, 'sanctum')
            ->get("/api/admin/verifications/{$profile->id}/document")
            ->assertForbidden();

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->get("/api/admin/verifications/{$profile->id}/document")
            ->assertOk();
    }

    public function test_rejected_farmer_can_resubmit_verification_document(): void
    {
        Storage::fake('local');
        $farmer = User::factory()->farmer()->create();
        $oldPath = UploadedFile::fake()->create('old.pdf')->store('verification-docs', 'local');
        $profile = FarmerProfile::create([
            'user_id' => $farmer->id,
            'farm_name' => 'Lito Farm',
            'verification_status' => 'rejected',
            'verification_doc_path' => $oldPath,
        ]);
        $token = $farmer->createToken('auth-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/farmer/verification-doc', ['verification_doc' => UploadedFile::fake()->create('new.pdf', 200)])
            ->assertOk();

        $fresh = $profile->fresh();
        $this->assertSame('pending', $fresh->verification_status);
        $this->assertNotSame($oldPath, $fresh->verification_doc_path);
        Storage::disk('local')->assertExists($fresh->verification_doc_path);
        Storage::disk('local')->assertMissing($oldPath);
    }
}
