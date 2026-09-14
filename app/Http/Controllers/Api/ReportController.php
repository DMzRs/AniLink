<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Report;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    /**
     * POST /api/reports — any signed-in user files a report against an order
     * and/or another user. Spec module 6: admin dispute/report handling.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id' => ['nullable', 'required_without:reported_user_id', 'integer', 'exists:orders,id'],
            'reported_user_id' => ['nullable', 'required_without:order_id', 'integer', 'exists:users,id'],
            'category' => ['required', 'string', Rule::in(Report::CATEGORIES)],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $report = Report::create([
            'reporter_id' => $request->user()->id,
            'order_id' => $validated['order_id'] ?? null,
            'reported_user_id' => $validated['reported_user_id'] ?? null,
            'category' => $validated['category'],
            'description' => $validated['description'],
            'status' => Report::STATUS_OPEN,
        ]);

        // Put it in front of every admin
        foreach (User::where('role', User::ROLE_ADMIN)->get() as $admin) {
            $notification = Notification::create([
                'user_id' => $admin->id,
                'type' => 'report_filed',
                'title' => "New report: {$validated['category']}",
                'body' => "{$request->user()->name} filed a report. Review it in the admin console.",
                'is_read' => false,
            ]);

            try {
                ExpoPushService::sendForNotification($notification);
            } catch (\Throwable $e) {
            }
        }

        return response()->json(['message' => 'Report filed. Our team will review it and let you know the outcome.', 'data' => [
            'id' => $report->id,
            'status' => $report->status,
        ]], 201);
    }
}
