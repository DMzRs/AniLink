<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Review a completed order. Spec: 1:1 reviews <-> completed order, so each
     * order can be reviewed exactly once by its buyer.
     */
    public function store(Request $request, Order $order)
    {
        if ($order->buyer_id !== $request->user()->id) {
            return response()->json(['message' => 'Only the buyer of this order can review it.'], 403);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($order->status !== 'completed') {
            return response()->json(['message' => 'Only completed orders can be reviewed.'], 422);
        }

        try {
            $review = Review::create([
                'order_id' => $order->id,
                'reviewer_id' => $request->user()->id,
                'farmer_id' => $order->farmer_id,
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]);
        } catch (UniqueConstraintViolationException) {
            return response()->json(['message' => 'This order has already been reviewed.'], 422);
        }

        return response()->json([
            'message' => 'Review submitted. Salamat for the feedback!',
            'data' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'reviewer_name' => $request->user()->name,
                'created_at' => $review->created_at,
            ],
        ], 201);
    }

    /**
     * Public reviews list for a farmer, used by AniMarket product pages.
     */
    public function forFarmer(User $farmer)
    {
        $reviews = Review::with('reviewer:id,name')
            ->where('farmer_id', $farmer->id)
            ->latest()
            ->limit(20)
            ->get();

        return response()->json([
            'rating_avg' => $reviews->isEmpty() ? null : round((float) $reviews->avg('rating'), 2),
            'rating_count' => $reviews->count(),
            'reviews' => $reviews->map(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'reviewer_name' => $r->reviewer?->name,
                'created_at' => $r->created_at,
            ]),
        ]);
    }
}
