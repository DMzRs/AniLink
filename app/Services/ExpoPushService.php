<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    /**
     * Send a push tied to a notifications table row.
     * Spec: push notifications via Expo Notifications tied to the `notifications` table.
     * We send AFTER the Notification row is created so offline / polling fallback still works.
     * Expo docs: https://docs.expo.dev/push-notifications/sending-notifications/
     */
    public static function sendForNotification(Notification $notification): void
    {
        $user = $notification->user ?? User::find($notification->user_id);
        if (! $user || ! $user->expo_push_token) {
            Log::info("ExpoPush skip: no token for user {$notification->user_id} type {$notification->type}");
            return;
        }

        $token = $user->expo_push_token;
        // Validate Expo token format: ExponentPushToken[...]
        if (! str_starts_with($token, 'ExponentPushToken')) {
            Log::warning("ExpoPush invalid token for user {$user->id}: {$token}");
            return;
        }

        // Map notification type to channel / priority per spec
        $channelId = match ($notification->type) {
            'new_order' => 'orders',
            'order_update', 'order_placed' => 'orders',
            default => 'default',
        };

        $payload = [
            'to' => $token,
            'title' => $notification->title,
            'body' => $notification->body,
            'data' => [
                'notification_id' => $notification->id,
                'type' => $notification->type,
            ],
            'sound' => 'default',
            'priority' => 'high',
            'channelId' => $channelId,
        ];

        try {
            $response = Http::timeout(5)->post('https://exp.host/--/api/v2/push/send', $payload);
            if ($response->failed()) {
                Log::warning("ExpoPush failed for user {$user->id}: " . $response->body());
            } else {
                $body = $response->json();
                // Expo may return ticket with DeviceNotRegistered error — clear token
                if (isset($body['errors'])) {
                    Log::warning("ExpoPush errors for user {$user->id}: " . json_encode($body));
                }
                $data = $body['data'] ?? null;
                if (is_array($data) && isset($data['status']) && $data['status'] === 'error' && str_contains($data['message'] ?? '', 'DeviceNotRegistered')) {
                    $user->update(['expo_push_token' => null, 'push_platform' => null]);
                    Log::info("ExpoPush cleared invalid token for user {$user->id}");
                }
                // chunked response: data is array
                if (is_array($data) && isset($data[0]['status']) && $data[0]['status'] === 'error' && str_contains($data[0]['message'] ?? '', 'DeviceNotRegistered')) {
                    $user->update(['expo_push_token' => null]);
                }
                Log::info("ExpoPush sent to user {$user->id} notif {$notification->id}: " . json_encode($body));
            }
        } catch (\Throwable $e) {
            // Rural connectivity: do not fail the order transaction; notification row already exists (offline queuing)
            Log::error("ExpoPush exception for user {$user->id}: " . $e->getMessage());
        }
    }

    public static function sendBatchForNotifications(iterable $notifications): void
    {
        foreach ($notifications as $n) {
            static::sendForNotification($n);
        }
    }
}
