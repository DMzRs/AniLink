<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FarmerProfile;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // GET /api/admin/verifications?status=pending&per_page=15&search=
    public function verifications(Request $request)
    {
        $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $q = FarmerProfile::with('user')
            ->when($request->status, fn($qq) => $qq->where('verification_status', $request->status))
            ->when($request->search, function ($qq, $s) {
                $qq->whereHas('user', fn($u) => $u->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"))
                   ->orWhere('farm_name', 'like', "%{$s}%")
                   ->orWhere('barangay', 'like', "%{$s}%")
                   ->orWhere('municipality', 'like', "%{$s}%");
            })
            ->latest();

        return $q->paginate($request->get('per_page', 15));
    }

    // POST /api/admin/verifications/{farmerProfile}/decision
    public function decideVerification(Request $request, FarmerProfile $farmerProfile)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $farmerProfile->update(['verification_status' => $data['status']]);

        // Sync user is_verified for convenience
        $farmerProfile->user->update(['is_verified' => $data['status'] === 'approved']);

        Notification::create([
            'user_id' => $farmerProfile->user_id,
            'type' => 'verification_' . $data['status'],
            'title' => $data['status'] === 'approved' ? 'Farm verified — salamat!' : 'Verification needs attention',
            'body' => $data['status'] === 'approved'
                ? "Your farm {$farmerProfile->farm_name} is now verified. Your listings will show the verified badge."
                : ($data['note'] ?? 'Your verification documents need revision. Please re-upload a clearer photo.'),
            'is_read' => false,
        ]);

        // Optional: push via ExpoPushService if we want — reuse existing service
        try {
            \App\Services\ExpoPushService::sendForNotification(
                Notification::latest()->where('user_id', $farmerProfile->user_id)->first()
            );
        } catch (\Throwable $e) {
        }

        return response()->json(['message' => "Verification {$data['status']}.", 'data' => $farmerProfile->fresh()->load('user')]);
    }

    // GET /api/admin/users?role=&search=&per_page=
    public function users(Request $request)
    {
        $request->validate([
            'role' => ['nullable', 'in:farmer,buyer_individual,buyer_business,admin'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $q = User::with(['farmerProfile', 'buyerProfile'])
            ->when($request->role, fn($qq) => $qq->where('role', $request->role))
            ->when($request->search, fn($qq, $s) => $qq->where(fn($w) => $w->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->latest();

        return $q->paginate($request->get('per_page', 15));
    }

    // PATCH /api/admin/users/{user}
    public function moderateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'is_verified' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'in:farmer,buyer_individual,buyer_business,admin'],
        ]);

        if (array_key_exists('role', $data) && $user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot change your own role.'], 422);
        }

        $user->update($data);
        return response()->json(['message' => 'User updated.', 'data' => $user->fresh()->load(['farmerProfile', 'buyerProfile'])]);
    }

    // GET /api/admin/listings?status=&search=&category=&per_page=
    public function listings(Request $request)
    {
        $request->validate([
            'status' => ['nullable', 'in:available,sold_out,archived'],
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'exists:categories,id'],
        ]);

        $q = Product::with(['farmer', 'farmer.farmerProfile', 'category'])
            ->when($request->status, fn($qq) => $qq->where('status', $request->status))
            ->when($request->category, fn($qq) => $qq->where('category_id', $request->category))
            ->when($request->search, fn($qq, $s) => $qq->where(fn($w) => $w->where('name', 'like', "%{$s}%")->orWhereHas('farmer', fn($f) => $f->where('name', 'like', "%{$s}%"))))
            ->latest();

        $p = $q->paginate($request->get('per_page', 15));
        $p->getCollection()->transform(fn($prod) => [
            'id' => $prod->id,
            'name' => $prod->name,
            'status' => $prod->status,
            'price_per_unit' => (float) $prod->price_per_unit,
            'unit_type' => $prod->unit_type,
            'available_quantity' => (float) $prod->available_quantity,
            'category' => $prod->category ? ['id' => $prod->category->id, 'name' => $prod->category->name] : null,
            'farmer' => $prod->farmer ? ['id' => $prod->farmer->id, 'name' => $prod->farmer->name, 'email' => $prod->farmer->email, 'verified' => $prod->farmer->farmerProfile?->verification_status === 'approved'] : null,
            'harvest_date' => $prod->harvest_date?->format('Y-m-d'),
            'created_at' => $prod->created_at,
        ]);

        return $p;
    }

    public function moderateListing(Request $request, Product $product)
    {
        $data = $request->validate([
            'status' => ['required', 'in:available,sold_out,archived'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $product->update(['status' => $data['status']]);

        if ($data['status'] === 'archived') {
            Notification::create([
                'user_id' => $product->farmer_id,
                'type' => 'listing_moderated',
                'title' => 'Listing archived by admin',
                'body' => $data['note'] ?? "Your listing {$product->name} was archived. Contact support.",
                'is_read' => false,
            ]);
        }

        return response()->json(['message' => "Listing {$data['status']}.", 'data' => $product->fresh()]);
    }

    // GET /api/admin/analytics
    public function analytics()
    {
        $totalOrders = Order::count();
        $gmv = Order::whereNotIn('status', ['cancelled'])->sum('total_amount');
        $activeFarmers = User::where('role', 'farmer')->whereHas('farmerProfile', fn($q) => $q->where('verification_status', 'approved'))->count();
        $pendingVerifications = FarmerProfile::where('verification_status', 'pending')->count();
        $totalProducts = Product::count();
        $availableProducts = Product::where('status', 'available')->count();
        $totalUsers = User::count();
        $buyers = User::whereIn('role', ['buyer_individual', 'buyer_business'])->count();

        // Order volume last 7 days
        $ordersByDay = Order::selectRaw("DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as gmv")
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')->orderBy('date')->get();

        // Status breakdown
        $byStatus = Order::selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status');

        // Top farmers by GMV
        $topFarmers = Order::selectRaw('farmer_id, SUM(total_amount) as gmv, COUNT(*) as orders')
            ->whereNotIn('status', ['cancelled'])
            ->groupBy('farmer_id')->with('farmer')->orderByDesc('gmv')->limit(5)->get()
            ->map(fn($row) => ['farmer' => $row->farmer?->name, 'farm_name' => $row->farmer?->farmerProfile?->farm_name, 'gmv' => (float) $row->gmv, 'orders' => $row->orders]);

        // GMV by category
        $gmvByCategory = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereNotIn('orders.status', ['cancelled'])
            ->selectRaw('categories.name as category, SUM(order_items.subtotal) as gmv')
            ->groupBy('categories.name')->get();

        return response()->json([
            'gmv' => (float) $gmv,
            'total_orders' => $totalOrders,
            'active_farmers' => $activeFarmers,
            'pending_verifications' => $pendingVerifications,
            'total_products' => $totalProducts,
            'available_products' => $availableProducts,
            'total_users' => $totalUsers,
            'buyers' => $buyers,
            'orders_by_day' => $ordersByDay,
            'by_status' => $byStatus,
            'top_farmers' => $topFarmers,
            'gmv_by_category' => $gmvByCategory,
        ]);
    }

    // GET /api/admin/orders?status=&per_page= — for dispute/moderation
    public function orders(Request $request)
    {
        $q = Order::with(['buyer', 'farmer.farmerProfile', 'items.product'])
            ->when($request->status, fn($qq) => $qq->where('status', $request->status))
            ->when($request->search, fn($qq, $s) => $qq->whereHas('buyer', fn($b) => $b->where('name', 'like', "%{$s}%"))->orWhere('id', $s))
            ->latest();
        return $q->paginate($request->get('per_page', 15));
    }
}
