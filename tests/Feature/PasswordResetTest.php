<?php

namespace Tests\Feature;

use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The per-IP throttle bucket is shared across the whole test run's
        // array cache; these tests legitimately repeat forgot/reset/login.
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_forgot_password_creates_code_for_existing_user(): void
    {
        $user = User::factory()->buyerIndividual()->create();

        $response = $this->postJson('/api/password/forgot', ['email' => $user->email]);

        $response->assertOk()
            ->assertJsonPath('code_hint', fn ($hint) => $hint !== null);

        $this->assertDatabaseHas('password_reset_codes', ['user_id' => $user->id]);
    }

    public function test_forgot_password_response_is_generic_for_unknown_email(): void
    {
        $response = $this->postJson('/api/password/forgot', ['email' => 'nobody@example.com']);

        $response->assertOk()
            ->assertJsonPath('code_hint', null);

        $this->assertDatabaseCount('password_reset_codes', 0);
    }

    public function test_forgot_password_invalidates_previous_codes(): void
    {
        $user = User::factory()->buyerIndividual()->create();

        $first = $this->postJson('/api/password/forgot', ['email' => $user->email])->json('code_hint');
        $this->postJson('/api/password/forgot', ['email' => $user->email]);

        $response = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => $first,
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ]);

        $response->assertUnprocessable();
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_password_with_valid_code_changes_password_and_revokes_tokens(): void
    {
        $user = User::factory()->buyerIndividual()->create();
        $user->createToken('auth-token', ['*']);

        $code = $this->postJson('/api/password/forgot', ['email' => $user->email])->json('code_hint');

        $response = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => $code,
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ]);

        $response->assertOk();

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('new-password-1', $fresh->password));
        $this->assertSame(0, $fresh->tokens()->count());
        $this->assertNotNull(PasswordResetCode::where('user_id', $user->id)->first()->used_at);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'new-password-1',
        ])->assertOk();
    }

    public function test_reset_password_rejects_wrong_code(): void
    {
        $user = User::factory()->buyerIndividual()->create();
        $this->postJson('/api/password/forgot', ['email' => $user->email]);

        $response = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => '000000',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ]);

        $response->assertUnprocessable();
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_password_rejects_expired_code(): void
    {
        $user = User::factory()->buyerIndividual()->create();
        PasswordResetCode::create([
            'user_id' => $user->id,
            'code' => '123456',
            'expires_at' => now()->subMinute(),
        ]);

        $response = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => '123456',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ]);

        $response->assertUnprocessable();
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_password_rejects_used_code(): void
    {
        $user = User::factory()->buyerIndividual()->create();

        $code = $this->postJson('/api/password/forgot', ['email' => $user->email])->json('code_hint');

        $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => $code,
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ])->assertOk();

        $response = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => $code,
            'password' => 'another-password-1',
            'password_confirmation' => 'another-password-1',
        ]);

        $response->assertUnprocessable();
        $this->assertTrue(Hash::check('new-password-1', $user->fresh()->password));
    }

    public function test_reset_password_validates_new_password(): void
    {
        $user = User::factory()->buyerIndividual()->create();
        $code = $this->postJson('/api/password/forgot', ['email' => $user->email])->json('code_hint');

        $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'code' => $code,
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertInvalid(['password']);
    }
}
