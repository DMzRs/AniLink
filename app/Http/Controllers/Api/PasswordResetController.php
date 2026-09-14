<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends Controller
{
    /**
     * Request a password reset code. The response is identical whether or not
     * the account exists so the endpoint cannot be used to enumerate users.
     */
    public function forgot(Request $request)
    {
        $validated = $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $validated['email'])->first();
        $code = $user ? $this->issueCode($user) : null;

        return response()->json([
            'message' => 'If that email is registered, a reset code has been sent.',
            'code_hint' => app()->environment('local', 'testing') ? $code : null,
        ]);
    }

    /**
     * Reset the password with a valid code. All existing tokens are revoked so
     * every signed-in device must authenticate again with the new password.
     */
    public function reset(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::where('email', $validated['email'])->first();

        $record = $user
            ? PasswordResetCode::where('user_id', $user->id)
                ->where('code', $validated['code'])
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->latest()
                ->first()
            : null;

        if (! $record) {
            return response()->json(['message' => 'Invalid or expired code.'], 422);
        }

        $record->update(['used_at' => now()]);

        $user->update(['password' => Hash::make($validated['password'])]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully. You can now sign in with your new password.']);
    }

    private function issueCode(User $user): string
    {
        PasswordResetCode::where('user_id', $user->id)->whereNull('used_at')->update(['used_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        PasswordResetCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'expires_at' => now()->addMinutes(15),
        ]);

        Log::info("Password reset code for {$user->email}: {$code}");

        return $code;
    }
}
