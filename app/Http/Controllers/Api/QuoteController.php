<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryLog;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\QuoteRequest;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuoteController extends Controller
{
    /**
     * GET /api/quotes — the business buyer's own quote requests.
     */
    public function index(Request $request)
    {
        $quotes = QuoteRequest::with(['product.category', 'farmer.farmerProfile'])
            ->where('buyer_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (QuoteRequest $q) => $this->transformQuote($q, true));

        return response()->json(['quotes' => $quotes]);
    }

    /**
     * POST /api/quotes — business buyer requests a bulk quote on a listing.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.1'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $product = Product::findOrFail($validated['product_id']);

        if ($product->status !== 'available') {
            throw ValidationException::withMessages([
                'product_id' => "Product {$product->name} is not available.",
            ]);
        }

        if ($product->min_bulk_quantity && $validated['quantity'] < $product->min_bulk_quantity) {
            throw ValidationException::withMessages([
                'quantity' => "Bulk quotes start at {$product->min_bulk_quantity} {$product->unit_type}.",
            ]);
        }

        $quote = QuoteRequest::create([
            'buyer_id' => $request->user()->id,
            'farmer_id' => $product->farmer_id,
            'product_id' => $product->id,
            'quantity' => $validated['quantity'],
            'message' => $validated['message'] ?? null,
            'status' => QuoteRequest::STATUS_PENDING,
        ]);

        $this->notify($product->farmer_id, 'quote_request', "New bulk quote request from {$request->user()->name}",
            "{$request->user()->name} is asking about {$validated['quantity']} {$product->unit_type} of {$product->name}.");

        return response()->json([
            'message' => 'Quote request sent. The farmer will get back to you.',
            'data' => $this->transformQuote($quote->fresh(['product.category', 'farmer.farmerProfile']), true),
        ], 201);
    }

    /**
     * GET /api/farmer/quotes — incoming quote requests for the farmer.
     */
    public function farmerIndex(Request $request)
    {
        $quotes = QuoteRequest::with(['product.category', 'buyer'])
            ->where('farmer_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (QuoteRequest $q) => $this->transformQuote($q, false));

        return response()->json(['quotes' => $quotes]);
    }

    /**
     * PATCH /api/farmer/quotes/{quote} — farmer quotes a price or declines.
     */
    public function respond(Request $request, QuoteRequest $quote)
    {
        if ($quote->farmer_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden. This quote request is not yours.'], 403);
        }

        if ($quote->status !== QuoteRequest::STATUS_PENDING) {
            return response()->json(['message' => "This quote request was already {$quote->status}."], 422);
        }

        $validated = $request->validate([
            'action' => ['required', 'in:quote,decline'],
            'quoted_unit_price' => ['required_if:action,quote', 'nullable', 'numeric', 'min:0.01'],
            'response_note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['action'] === 'decline') {
            $quote->update(['status' => QuoteRequest::STATUS_DECLINED, 'response_note' => $validated['response_note'] ?? null]);
            $this->notify($quote->buyer_id, 'quote_declined', "Quote request declined — {$quote->product->name}",
                $validated['response_note'] ?? "The farmer declined your quote request for {$quote->product->name}.");
        } else {
            $quote->update([
                'status' => QuoteRequest::STATUS_QUOTED,
                'quoted_unit_price' => $validated['quoted_unit_price'],
                'response_note' => $validated['response_note'] ?? null,
            ]);
            $this->notify($quote->buyer_id, 'quote_quoted', "Bulk quote ready — {$quote->product->name}",
                "{$quote->quantity} {$quote->product->unit_type} at ₱{$validated['quoted_unit_price']}/{$quote->product->unit_type}. Accept it to place the order.");
        }

        return response()->json(['message' => "Quote request {$quote->status}.", 'data' => $this->transformQuote($quote->fresh(['product.category', 'buyer']), false)]);
    }

    /**
     * PATCH /api/quotes/{quote}/accept — buyer accepts the quoted price; a real
     * bulk order is created through the same transactional path as checkout.
     */
    public function accept(Request $request, QuoteRequest $quote)
    {
        if ($quote->buyer_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden. This quote request is not yours.'], 403);
        }

        if ($quote->status !== QuoteRequest::STATUS_QUOTED) {
            return response()->json(['message' => "Only quoted requests can be accepted (current: {$quote->status})."], 422);
        }

        $validated = $request->validate([
            'fulfillment_type' => ['required', 'in:pickup,delivery'],
            'delivery_address' => ['required_if:fulfillment_type,delivery', 'nullable', 'string', 'max:1000'],
        ]);

        try {
            $order = DB::transaction(function () use ($quote, $validated) {
                $product = Product::lockForUpdate()->findOrFail($quote->product_id);

                if ($product->status !== 'available' || $product->available_quantity < $quote->quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => "Insufficient stock for {$product->name}. Available: {$product->available_quantity} {$product->unit_type}",
                    ]);
                }

                $unitPrice = (float) $quote->quoted_unit_price;
                $total = $unitPrice * $quote->quantity;
                $deliveryFee = $validated['fulfillment_type'] === 'delivery' ? 45 : 0;

                $order = Order::create([
                    'buyer_id' => $quote->buyer_id,
                    'farmer_id' => $quote->farmer_id,
                    'order_type' => 'bulk',
                    'status' => 'pending',
                    'fulfillment_type' => $validated['fulfillment_type'],
                    'total_amount' => $total + $deliveryFee,
                    'delivery_address' => $validated['delivery_address'] ?? null,
                ]);

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $quote->quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $total,
                ]);

                $product->available_quantity -= $quote->quantity;
                if ($product->available_quantity <= 0) {
                    $product->status = 'sold_out';
                    $product->available_quantity = 0;
                }
                $product->save();

                InventoryLog::create([
                    'product_id' => $product->id,
                    'change_amount' => -$quote->quantity,
                    'reason' => 'sale',
                    'created_by' => $quote->buyer_id,
                ]);

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'pending',
                    'changed_by' => $quote->buyer_id,
                    'changed_at' => now(),
                    'note' => "From accepted quote #{$quote->id}",
                ]);

                $quote->update(['status' => QuoteRequest::STATUS_ACCEPTED]);

                return $order;
            });
        } catch (ValidationException $e) {
            // Stock failure leaves the quote usable so the buyer can retry or renegotiate
            throw $e;
        }

        $this->notify($quote->farmer_id, 'quote_accepted', "Bulk quote accepted — {$quote->product->name}",
            "{$request->user()->name} accepted your quote: {$quote->quantity} {$quote->product->unit_type} at ₱{$quote->quoted_unit_price}. Order #{$order->id} is pending.");

        return response()->json([
            'message' => 'Quote accepted — order placed.',
            'data' => ['order_id' => $order->id, 'total_amount' => (float) $order->total_amount],
        ]);
    }

    /**
     * PATCH /api/quotes/{quote}/withdraw — buyer cancels their own request.
     */
    public function withdraw(Request $request, QuoteRequest $quote)
    {
        if ($quote->buyer_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden. This quote request is not yours.'], 403);
        }

        if (! in_array($quote->status, [QuoteRequest::STATUS_PENDING, QuoteRequest::STATUS_QUOTED], true)) {
            return response()->json(['message' => "A {$quote->status} quote can no longer be withdrawn."], 422);
        }

        $quote->update(['status' => QuoteRequest::STATUS_WITHDRAWN]);

        $this->notify($quote->farmer_id, 'quote_withdrawn', "Quote request withdrawn — {$quote->product->name}",
            "{$request->user()->name} withdrew the request for {$quote->quantity} {$quote->product->unit_type}.");

        return response()->json(['message' => 'Quote request withdrawn.', 'data' => $this->transformQuote($quote->fresh(['product.category', 'farmer.farmerProfile']), true)]);
    }

    private function transformQuote(QuoteRequest $q, bool $fromBuyerView): array
    {
        $counterparty = $fromBuyerView
            ? ['id' => $q->farmer?->id, 'name' => $q->farmer?->name, 'farm_name' => $q->farmer?->farmerProfile?->farm_name]
            : ['id' => $q->buyer?->id, 'name' => $q->buyer?->name];

        return [
            'id' => $q->id,
            'status' => $q->status,
            'quantity' => (float) $q->quantity,
            'quoted_unit_price' => $q->quoted_unit_price !== null ? (float) $q->quoted_unit_price : null,
            'message' => $q->message,
            'response_note' => $q->response_note,
            'product' => $q->product ? [
                'id' => $q->product->id,
                'name' => $q->product->name,
                'unit_type' => $q->product->unit_type,
                'price_per_unit' => (float) $q->product->price_per_unit,
                'bulk_price' => $q->product->bulk_price !== null ? (float) $q->product->bulk_price : null,
                'min_bulk_quantity' => $q->product->min_bulk_quantity !== null ? (float) $q->product->min_bulk_quantity : null,
                'available_quantity' => (float) $q->product->available_quantity,
            ] : null,
            $fromBuyerView ? 'farmer' : 'buyer' => $counterparty,
            'created_at' => $q->created_at,
        ];
    }

    private function notify(int $userId, string $type, string $title, string $body): void
    {
        $notification = Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'is_read' => false,
        ]);

        try {
            ExpoPushService::sendForNotification($notification);
        } catch (\Throwable $e) {
        }
    }
}
