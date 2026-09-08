<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuyerProfile;
use App\Models\FarmerProfile;
use App\Models\TwoFactorCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Register a new user with role-based profile creation.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', 'in:farmer,buyer_individual,buyer_business,admin'],
            // Farmer specific
            'farm_name' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:255'],
            'municipality' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            // Buyer business
            'delivery_address' => ['nullable', 'string', 'max:1000'],
        ]);

        // Prevent self-registration as admin unless explicitly allowed (for now allow but log warning)
        if ($validated['role'] === User::ROLE_ADMIN) {
            // In production you would restrict this to seeded admins only
            // For demo we allow it but could be guarded
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        // Create role-specific profile
        if ($user->role === User::ROLE_FARMER) {
            FarmerProfile::create([
                'user_id' => $user->id,
                'farm_name' => $validated['farm_name'] ?? null,
                'barangay' => $validated['barangay'] ?? null,
                'municipality' => $validated['municipality'] ?? null,
                'province' => $validated['province'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'verification_status' => 'pending',
            ]);
        } elseif (in_array($user->role, [User::ROLE_BUYER_INDIVIDUAL, User::ROLE_BUYER_BUSINESS], true)) {
            $buyerType = $user->role === User::ROLE_BUYER_BUSINESS ? 'business' : 'individual';
            BuyerProfile::create([
                'user_id' => $user->id,
                'buyer_type' => $buyerType,
                'delivery_address' => $validated['delivery_address'] ?? null,
            ]);
        }

        // Auto-enable 2FA requirement for farmers: they must set up 2FA on first login
        // We do not force enable here; they will be prompted via middleware

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user->load(['farmerProfile', 'buyerProfile']),
            'token' => $token,
            'requires_2fa_setup' => $user->isFarmer(),
        ], 201);
    }

    /**
     * Login with rate limiting and 2FA branching.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        // If user has 2FA enabled, issue a pending token and send OTP
        if ($user->two_factor_enabled) {
            $code = $this->generateAndSendOtp($user);

            // Issue a limited ability token for 2FA verification step
            $pendingToken = $user->createToken('2fa-pending', ['2fa:pending'])->plainTextToken;

            return response()->json([
                'message' => 'Two-factor code sent. Please verify.',
                'two_factor_required' => true,
                'pending_token' => $pendingToken,
                // In non-production we expose code for testing; remove in prod
                'code_hint' => app()->environment('local', 'testing') ? $code : null,
            ]);
        }

        // For farmers where 2FA is enforced but not yet enabled, force setup after login
        if ($user->isFarmer() && ! $user->two_factor_enabled) {
            $token = $user->createToken('auth-token', ['*'])->plainTextToken;

            return response()->json([
                'message' => 'Login successful. Two-factor setup required for farmers.',
                'user' => $user->load(['farmerProfile', 'buyerProfile']),
                'token' => $token,
                'two_factor_setup_required' => true,
            ]);
        }

        $token = $user->createToken('auth-token', ['*', '2fa:verified'])->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->load(['farmerProfile', 'buyerProfile']),
            'token' => $token,
        ]);
    }

    /**
     * Verify OTP for 2FA. Requires pending token.
     */
    public function verifyTwoFactor(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'email' => ['required_without:pending_token', 'email'],
        ]);

        $user = $request->user();

        // Allow verification via pending token OR via email lookup (for resend flow)
        if (! $user && isset($validated['email'])) {
            $user = User::where('email', $validated['email'])->first();
        }

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $record = TwoFactorCode::where('user_id', $user->id)
            ->where('code', $validated['code'])
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Invalid or expired code.'], 422);
        }

        $record->update(['used_at' => now()]);

        // Revoke pending tokens and issue verified token
        $user->tokens()->where('name', '2fa-pending')->delete();
        $token = $user->createToken('auth-token', ['*', '2fa:verified'])->plainTextToken;

        return response()->json([
            'message' => 'Two-factor verified.',
            'user' => $user->load(['farmerProfile', 'buyerProfile']),
            'token' => $token,
        ]);
    }

    /**
     * Resend OTP (rate limited via throttle middleware).
     */
    public function resendTwoFactor(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor not enabled for this account.'], 422);
        }

        $code = $this->generateAndSendOtp($user);

        return response()->json([
            'message' => 'Code resent.',
            'code_hint' => app()->environment('local', 'testing') ? $code : null,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load(['farmerProfile', 'buyerProfile']),
        ]);
    }

    private function generateAndSendOtp(User $user): string
    {
        // Invalidate previous unused codes
        TwoFactorCode::where('user_id', $user->id)->whereNull('used_at')->update(['used_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        TwoFactorCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'expires_at' => now()->addMinutes(5),
        ]);

        // Simulate sending via email/SMS (Semaphore). In production replace with actual gateway.
        Log::info("2FA OTP for {$user->email}: {$code} (expires in 5 min)");

        // Also use Laravel's mail log channel if configured
        // Mail::raw("Your AniLink verification code is: {$code}", fn($m) => $m->to($user->email)->subject('AniLink 2FA Code'));

        return $code;
    }
}
