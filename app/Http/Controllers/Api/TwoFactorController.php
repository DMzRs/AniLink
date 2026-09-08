<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TwoFactorCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TwoFactorController extends Controller
{
    /**
     * Enable 2FA for authenticated user - generates and sends OTP to confirm.
     */
    public function enable(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor already enabled.'], 422);
        }

        $code = $this->generateOtp($user);

        return response()->json([
            'message' => 'Verification code sent. Confirm with /api/2fa/confirm.',
            'code_hint' => app()->environment('local', 'testing') ? $code : null,
        ]);
    }

    public function confirmEnable(Request $request)
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $user = $request->user();

        $record = TwoFactorCode::where('user_id', $user->id)
            ->where('code', $request->code)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Invalid or expired code.'], 422);
        }

        $record->update(['used_at' => now()]);

        $user->update([
            'two_factor_enabled' => true,
            'two_factor_secret' => encrypt($request->code . '|' . now()->timestamp), // placeholder secret; use pragmarx/google2fa in prod
        ]);

        return response()->json(['message' => 'Two-factor enabled successfully.', 'user' => $user->fresh()]);
    }

    public function disable(Request $request)
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $user = $request->user();

        if (! $user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor not enabled.'], 422);
        }

        // Farmers cannot disable 2FA per spec: enforced for all vendor accounts
        if ($user->isFarmer()) {
            return response()->json(['message' => 'Farmers cannot disable two-factor authentication.'], 403);
        }

        $record = TwoFactorCode::where('user_id', $user->id)
            ->where('code', $request->code)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $record) {
            // For disable we also allow code-less disable if user re-authenticated recently? Keep strict for now.
            return response()->json(['message' => 'Invalid or expired code. Use resend to get a new code.'], 422);
        }

        $record->update(['used_at' => now()]);

        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
        ]);

        return response()->json(['message' => 'Two-factor disabled.', 'user' => $user->fresh()]);
    }

    /**
     * Send OTP for currently authenticated user (for enable/disable flows).
     */
    public function send(Request $request)
    {
        $user = $request->user();
        $code = $this->generateOtp($user);

        return response()->json([
            'message' => 'Code sent.',
            'code_hint' => app()->environment('local', 'testing') ? $code : null,
        ]);
    }

    private function generateOtp($user): string
    {
        TwoFactorCode::where('user_id', $user->id)->whereNull('used_at')->update(['used_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        TwoFactorCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'expires_at' => now()->addMinutes(5),
        ]);

        Log::info("2FA OTP for {$user->email}: {$code}");

        return $code;
    }
}
