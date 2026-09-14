<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryLog;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\PriceTrend;
use App\Models\Product;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * POST /api/orders — cart checkout. Handles retail/bulk, delivery/pickup, grouping by farmer.
     * Body: { items: [{product_id, quantity}], order_type: retail|bulk, fulfillment_type: pickup|delivery, delivery_address? }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.1'],
            'order_type' => ['required', 'in:retail,bulk'],
            'fulfillment_type' => ['required', 'in:pickup,delivery'],
            'delivery_address' => ['nullable', 'string', 'max:1000', 'required_if:fulfillment_type,delivery'],
        ]);

        $buyer = $request->user();
        if (! in_array($buyer->role, ['buyer_individual', 'buyer_business'], true)) {
            return response()->json(['message' => 'Only buyers can place orders.'], 403);
        }
        if ($validated['order_type'] === 'bulk' && $buyer->role !== 'buyer_business') {
            return response()->json(['message' => 'Bulk orders are for business buyers.'], 403);
        }

        // Load and lock product rows inside the transaction so concurrent checkouts cannot oversell
        $productIds = collect($validated['items'])->pluck('product_id');
        $pushNotifications = [];

        try {
            $orders = DB::transaction(function () use ($validated, $productIds, $buyer, &$pushNotifications) {
                $products = Product::with('farmer')->whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

                // Validate stock and group by farmer_id (one order per farmer per spec)
                $grouped = [];
                foreach ($validated['items'] as $item) {
                    $product = $products[$item['product_id']];
                    if ($product->status !== 'available') {
                        throw ValidationException::withMessages([
                            'items' => "Product {$product->name} is not available.",
                        ]);
                    }
                    if ($product->available_quantity < $item['quantity']) {
                        throw ValidationException::withMessages([
                            'items' => "Insufficient stock for {$product->name}. Available: {$product->available_quantity} {$product->unit_type}",
                        ]);
                    }
                    $grouped[$product->farmer_id][] = ['product' => $product, 'quantity' => (float) $item['quantity']];
                }

                $created = [];
                foreach ($grouped as $farmerId => $items) {
                    $total = 0;
                    $orderItemsData = [];
                    foreach ($items as $entry) {
                        $product = $entry['product'];
                        $qty = $entry['quantity'];
                        $unitPrice = $product->price_per_unit;
                        // Bulk pricing per spec: if order_type bulk and qty >= min_bulk_quantity
                        if ($validated['order_type'] === 'bulk' && $product->bulk_price && $product->min_bulk_quantity && $qty >= $product->min_bulk_quantity) {
                            $unitPrice = $product->bulk_price;
                        }
                        $subtotal = $unitPrice * $qty;
                        $total += $subtotal;
                        $orderItemsData[] = ['product' => $product, 'qty' => $qty, 'unit_price' => $unitPrice, 'subtotal' => $subtotal];
                    }

                    // Delivery fee: simple per spec cart: ₱45 delivery else 0
                    $deliveryFee = $validated['fulfillment_type'] === 'delivery' ? 45 : 0;
                    $total += $deliveryFee;

                    $order = Order::create([
                        'buyer_id' => $buyer->id,
                        'farmer_id' => $farmerId,
                        'order_type' => $validated['order_type'],
                        'status' => 'pending',
                        'fulfillment_type' => $validated['fulfillment_type'],
                        'total_amount' => $total,
                        'delivery_address' => $validated['delivery_address'] ?? null,
                    ]);

                    foreach ($orderItemsData as $data) {
                        OrderItem::create([
                            'order_id' => $order->id,
                            'product_id' => $data['product']->id,
                            'quantity' => $data['qty'],
                            'unit_price' => $data['unit_price'],
                            'subtotal' => $data['subtotal'],
                        ]);
                        // Deduct stock + log (product row is locked for the duration of the transaction)
                        $product = $data['product'];
                        $product->available_quantity -= $data['qty'];
                        if ($product->available_quantity <= 0) {
                            $product->status = 'sold_out';
                            $product->available_quantity = 0;
                        }
                        $product->save();

                        InventoryLog::create([
                            'product_id' => $product->id,
                            'change_amount' => -$data['qty'],
                            'reason' => 'sale',
                            'created_by' => $buyer->id,
                        ]);
                    }

                    OrderStatusHistory::create([
                        'order_id' => $order->id,
                        'status' => 'pending',
                        'changed_by' => $buyer->id,
                        'changed_at' => now(),
                        'note' => $validated['order_type'] === 'bulk' ? 'Bulk order placed — awaiting farmer quote' : null,
                    ]);

                    // Notifications per spec: new order alert (farmer), restock awareness
                    $farmerNotif = Notification::create([
                        'user_id' => $farmerId,
                        'type' => 'new_order',
                        'title' => 'New order received',
                        'body' => "Order #{$order->id} from {$buyer->name} — {$validated['order_type']} • {$validated['fulfillment_type']}",
                        'is_read' => false,
                    ]);
                    $buyerNotif = Notification::create([
                        'user_id' => $buyer->id,
                        'type' => 'order_placed',
                        'title' => 'Order placed',
                        'body' => "Order #{$order->id} placed. Farmer will confirm shortly.",
                        'is_read' => false,
                    ]);
                    $pushNotifications[] = $farmerNotif;
                    $pushNotifications[] = $buyerNotif;

                    $order->load(['items.product.category', 'farmer.farmerProfile', 'buyer']);
                    $created[] = $order;
                }

                return $created;
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        }

        // Expo push after commit — external HTTP never holds row locks; notification rows persist as offline fallback
        foreach ($pushNotifications as $notification) {
            ExpoPushService::sendForNotification($notification);
        }

        return response()->json([
            'message' => count($orders) === 1 ? 'Order placed.' : 'Orders placed per farmer.',
            'data' => collect($orders)->map(fn ($o) => $this->transformOrder($o)),
        ], 201);
    }

    /**
     * GET /api/orders — list for current user (buyer sees theirs, farmer sees theirs)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Order::with(['items.product.category', 'farmer.farmerProfile', 'buyer']);

        if ($user->role === 'farmer') {
            $query->where('farmer_id', $user->id);
        } elseif (in_array($user->role, ['buyer_individual', 'buyer_business'])) {
            $query->where('buyer_id', $user->id);
        } elseif ($user->role === 'admin') {
            // admin sees all
        } else {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(15);
        $orders->getCollection()->transform(fn ($o) => $this->transformOrder($o));

        return response()->json($orders);
    }

    public function show(Request $request, Order $order)
    {
        $this->authorizeOrderAccess($request, $order);
        $order->load(['items.product.category', 'items.product.farmer.farmerProfile', 'farmer.farmerProfile', 'buyer', 'statusHistory.changedBy']);

        return response()->json(['data' => $this->transformOrder($order, true)]);
    }

    /**
     * PATCH /api/orders/{order}/status — farmer progresses queue per AniManage spec
     */
    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:confirmed,preparing,ready,delivered,completed,cancelled'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        // Only farmer who owns order or admin can update; buyer can only cancel when pending
        $isFarmerOwner = $user->role === 'farmer' && $order->farmer_id === $user->id;
        $isAdmin = $user->role === 'admin';
        $isBuyerOwner = in_array($user->role, ['buyer_individual', 'buyer_business']) && $order->buyer_id === $user->id;

        if (! $isFarmerOwner && ! $isAdmin && ! ($isBuyerOwner && $validated['status'] === 'cancelled' && $order->status === 'pending')) {
            return response()->json(['message' => 'Forbidden. Only the farmer can update this order (buyer may cancel while pending).'], 403);
        }

        // Enforce valid transitions per spec flow: pending->confirmed->preparing->ready->delivered/completed
        // Terminal states (cancelled/completed) have no outgoing transitions.
        $allowed = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['ready', 'cancelled'],
            'ready' => ['delivered', 'completed', 'cancelled'],
            'delivered' => ['completed'],
            'cancelled' => [],
            'completed' => [],
        ];
        $current = $order->status;
        $allowedNext = $allowed[$current] ?? [];
        if (! in_array($validated['status'], $allowedNext, true) && ! $isAdmin) {
            $allowedLabel = $allowedNext ? implode(', ', $allowedNext) : 'none (terminal state)';

            return response()->json(['message' => "Invalid transition from {$current} to {$validated['status']}. Allowed: {$allowedLabel}"], 422);
        }

        // If cancelling, restore stock
        if ($validated['status'] === 'cancelled' && $order->status !== 'cancelled') {
            $notifications = DB::transaction(function () use ($order, $user, $validated) {
                $order->loadMissing('items');
                foreach ($order->items as $item) {
                    $product = Product::where('id', $item->product_id)->lockForUpdate()->first();
                    if ($product) {
                        $product->available_quantity += $item->quantity;
                        if ($product->status === 'sold_out' && $product->available_quantity > 0) {
                            $product->status = 'available';
                        }
                        $product->save();
                        InventoryLog::create(['product_id' => $product->id, 'change_amount' => $item->quantity, 'reason' => 'adjustment', 'created_by' => $user->id]);
                    }
                }
                $order->update(['status' => 'cancelled']);
                OrderStatusHistory::create(['order_id' => $order->id, 'status' => 'cancelled', 'changed_by' => $user->id, 'changed_at' => now(), 'note' => $validated['note'] ?? null]);

                return $this->createStatusNotifications($order, 'cancelled');
            });
        } else {
            $order->update(['status' => $validated['status']]);
            OrderStatusHistory::create(['order_id' => $order->id, 'status' => $validated['status'], 'changed_by' => $user->id, 'changed_at' => now(), 'note' => $validated['note'] ?? null]);
            $notifications = $this->createStatusNotifications($order, $validated['status']);

            // AniPredict: a completion is a real transaction — snapshot each item's
            // price into the trend history. Guarded against re-fires (admins bypass
            // the transition map, so completed -> completed is technically possible).
            if ($validated['status'] === 'completed' && $current !== 'completed') {
                $this->recordPriceTrends($order);
            }
        }

        // Expo push after commit — external HTTP never runs inside the stock-restore transaction
        foreach ($notifications as $notification) {
            ExpoPushService::sendForNotification($notification);
        }

        $order->load(['items.product.category', 'farmer.farmerProfile', 'buyer', 'statusHistory']);

        return response()->json(['message' => 'Order status updated.', 'data' => $this->transformOrder($order, true)]);
    }

    /**
     * AniPredict data capture: one price_trends row per order item, keyed by the
     * item's category in the farmer's province. unit_price is the checkout snapshot,
     * so it reflects what was actually paid, not the current listing price.
     */
    private function recordPriceTrends(Order $order): void
    {
        $order->loadMissing(['items.product', 'farmer.farmerProfile']);
        $region = $order->farmer?->farmerProfile?->province ?? 'Unknown';
        $date = now()->toDateString();

        foreach ($order->items as $item) {
            if (! $item->product) {
                continue;
            }

            PriceTrend::create([
                'category_id' => $item->product->category_id,
                'region' => $region,
                'recorded_price' => $item->unit_price,
                'recorded_date' => $date,
            ]);
        }
    }

    /**
     * POST /api/cart/validate — check stock/bulk eligibility without creating order
     */
    public function validateCart(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.1'],
            'order_type' => ['nullable', 'in:retail,bulk'],
        ]);
        $orderType = $validated['order_type'] ?? 'retail';
        $products = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))->get()->keyBy('id');
        $result = [];
        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $product = $products[$item['product_id']];
            $qty = (float) $item['quantity'];
            $unitPrice = $product->price_per_unit;
            if ($orderType === 'bulk' && $product->bulk_price && $product->min_bulk_quantity && $qty >= $product->min_bulk_quantity) {
                $unitPrice = $product->bulk_price;
            }
            $available = $product->status === 'available' && $product->available_quantity >= $qty;
            $lineTotal = $unitPrice * $qty;
            $subtotal += $lineTotal;
            $result[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'unit_price' => (float) $unitPrice,
                'quantity' => $qty,
                'subtotal' => $lineTotal,
                'available' => $available,
                'available_quantity' => (float) $product->available_quantity,
                'bulk_eligible' => $orderType === 'bulk' && $product->bulk_price && $product->min_bulk_quantity && $qty >= $product->min_bulk_quantity,
            ];
        }

        return response()->json(['items' => $result, 'subtotal' => $subtotal, 'order_type' => $orderType]);
    }

    private function authorizeOrderAccess(Request $request, Order $order): void
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return;
        }
        if ($order->buyer_id === $user->id || $order->farmer_id === $user->id) {
            return;
        }
        abort(403, 'You do not have access to this order.');
    }

    private function createStatusNotifications(Order $order, string $status): array
    {
        $buyerMsg = match ($status) {
            'confirmed' => "Order #{$order->id} confirmed — farmer is preparing your harvest.",
            'preparing' => "Order #{$order->id} is being prepared.",
            'ready' => "Order #{$order->id} is ready for ".($order->fulfillment_type === 'pickup' ? 'pickup' : 'delivery').'.',
            'delivered' => "Order #{$order->id} delivered. Enjoy — please leave a review!",
            'completed' => "Order #{$order->id} completed.",
            'cancelled' => "Order #{$order->id} cancelled.",
            default => "Order #{$order->id} is now {$status}.",
        };
        $buyerNotification = Notification::create(['user_id' => $order->buyer_id, 'type' => 'order_update', 'title' => 'Order update', 'body' => $buyerMsg, 'is_read' => false]);
        $farmerNotification = Notification::create(['user_id' => $order->farmer_id, 'type' => 'order_update', 'title' => 'Order update', 'body' => "Order #{$order->id} marked {$status}.", 'is_read' => false]);

        return [$buyerNotification, $farmerNotification];
    }

    private function transformOrder(Order $o, bool $detailed = false): array
    {
        $base = [
            'id' => $o->id,
            'buyer' => $o->buyer ? ['id' => $o->buyer->id, 'name' => $o->buyer->name] : null,
            'farmer' => $o->farmer ? ['id' => $o->farmer->id, 'name' => $o->farmer->name, 'farm_name' => $o->farmer->farmerProfile?->farm_name, 'verified' => $o->farmer->farmerProfile?->verification_status === 'approved'] : null,
            'order_type' => $o->order_type,
            'status' => $o->status,
            'fulfillment_type' => $o->fulfillment_type,
            'total_amount' => (float) $o->total_amount,
            'delivery_address' => $o->delivery_address,
            'items' => $o->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_name' => $i->product?->name,
                'category' => $i->product?->category?->name,
                'quantity' => (float) $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'subtotal' => (float) $i->subtotal,
                'unit_type' => $i->product?->unit_type,
            ]),
            'created_at' => $o->created_at,
            'updated_at' => $o->updated_at,
        ];
        if ($detailed) {
            $base['status_history'] = $o->statusHistory->map(fn ($h) => [
                'id' => $h->id, 'status' => $h->status, 'changed_by' => $h->changedBy?->name, 'changed_at' => $h->changed_at, 'note' => $h->note,
            ]);
        }

        return $base;
    }
}
