<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Usage: ->middleware('role:farmer,admin') or role:buyer_individual,buyer_business
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Normalize roles: allow comma-separated single param
        $allowed = [];
        foreach ($roles as $role) {
            $allowed = array_merge($allowed, explode(',', $role));
        }
        $allowed = array_map('trim', $allowed);

        if (! in_array($user->role, $allowed, true)) {
            return response()->json([
                'message' => 'Forbidden. Required role: ' . implode('|', $allowed),
                'your_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}
