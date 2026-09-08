<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    /**
     * POST /api/push-token — register Expo push token, tied to auth user.
     * Mobile calls this after Notifications.getExpoPushTokenAsync().
     * Body: { expo_push_token: "ExponentPushToken[...]", platform?: "android|ios|web" }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'regex:/^ExponentPushToken\[[A-Za-z0-9\-_]+\]$/'],
            'platform' => ['nullable', 'string', 'in:android,ios,web'],
        ]);

        $user = $request->user();
        $user->update([
            'expo_push_token' => $validated['expo_push_token'],
            'push_platform' => $validated['platform'] ?? null,
        ]);

        return response()->json([
            'message' => 'Push token registered.',
            'expo_push_token' => $user->expo_push_token,
        ]);
    }

    public function destroy(Request $request)
    {
        $request->user()->update(['expo_push_token' => null, 'push_platform' => null]);
        return response()->json(['message' => 'Push token removed.']);
    }
}
