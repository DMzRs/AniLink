<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;

class FarmerDashboardController extends Controller
{
    /**
     * GET /api/farmer/dashboard — sales summary + low-stock list for AniManage.
     * Revenue follows the admin-analytics convention: every order except cancelled.
     */
    public function index(Request $request)
    {
        $farmerId = $request->user()->id;

        $lowStock = Product::where('farmer_id', $farmerId)
            ->lowStock()
            ->orderBy('available_quantity')
            ->get(['id', 'name', 'available_quantity', 'unit_type'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'available_quantity' => (float) $p->available_quantity,
                'unit_type' => $p->unit_type,
            ]);

        return response()->json([
            'sales' => [
                'today' => $this->summarize($farmerId, now()->startOfDay()),
                'week' => $this->summarize($farmerId, now()->subDays(7)),
                'all_time' => $this->summarize($farmerId, null),
            ],
            'pending_orders' => Order::where('farmer_id', $farmerId)->where('status', 'pending')->count(),
            'low_stock_count' => $lowStock->count(),
            'low_stock' => $lowStock,
        ]);
    }

    private function summarize(int $farmerId, ?\DateTimeInterface $from): array
    {
        $orderScope = fn () => Order::where('farmer_id', $farmerId)
            ->whereNotIn('status', ['cancelled'])
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from));

        $itemScope = fn () => OrderItem::whereHas('order', function ($q) use ($farmerId, $from) {
            $q->where('farmer_id', $farmerId)
                ->whereNotIn('status', ['cancelled'])
                ->when($from, fn ($qq) => $qq->where('created_at', '>=', $from));
        });

        return [
            'revenue' => (float) $orderScope()->sum('total_amount'),
            'orders' => $orderScope()->count(),
            'items_sold' => (float) $itemScope()->sum('quantity'),
        ];
    }
}
