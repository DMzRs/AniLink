<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // If user has 2FA enabled, require that current token was issued after 2FA verification
        // We use a simple approach: tokens created via 2FA verification have ability `2fa:verified`
        // Alternatively, check session flag. For Sanctum PATs we check token abilities.
        if ($user->two_factor_enabled) {
            $token = $user->currentAccessToken();
            if ($token && ! $token->can('2fa:verified') && ! $token->can('*')) {
                // If token does not have 2fa:verified, block access for farmers (enforced)
                // For non-farmer with 2FA enabled we also enforce
                return response()->json([
                    'message' => 'Two-factor authentication required. Please verify OTP.',
                    'two_factor_required' => true,
                ], 403);
            }
        }

        // Enforce for farmers even if not yet enabled: force setup
        if ($user->isFarmer() && ! $user->two_factor_enabled) {
            // Allowlist: permit 2FA setup endpoints without this middleware
            // This middleware should only be applied to protected farmer routes where 2FA must be done
            return response()->json([
                'message' => 'Farmers must enable two-factor authentication.',
                'two_factor_setup_required' => true,
            ], 403);
        }

        return $next($request);
    }
}
