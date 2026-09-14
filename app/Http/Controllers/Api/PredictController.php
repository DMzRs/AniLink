<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\PriceTrend;
use App\Models\Product;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PredictController extends Controller
{
    /**
     * GET /api/predict/insights?category_id= — AniPredict for the owning farmer.
     *
     * All aggregation runs in PHP so SQLite (tests) and MySQL (prod) behave
     * identically; volumes here are small enough that this beats cross-DB SQL.
     */
    public function insights(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $farmer = $request->user()->loadMissing('farmerProfile');
        $region = $farmer->farmerProfile?->province;
        $categoryId = $validated['category_id']
            ?? Product::where('farmer_id', $farmer->id)->orderBy('id')->value('category_id');

        if (! $categoryId) {
            return response()->json([
                'category' => null,
                'region' => $region,
                'price_series' => [],
                'regional_comparison' => [],
                'demand' => ['weekly' => [], 'direction' => null],
                'best_time' => ['best_month' => null, 'best_day' => null, 'recommendation' => null],
            ]);
        }

        $category = $categoryId ? Category::find($categoryId) : null;

        return response()->json([
            'category' => $category ? ['id' => $category->id, 'name' => $category->name] : null,
            'region' => $region,
            'price_series' => $this->priceSeries($categoryId, $region),
            'regional_comparison' => $this->regionalComparison($categoryId, $region),
            'demand' => $this->demand($categoryId),
            'best_time' => $this->bestTime($categoryId),
        ]);
    }

    /**
     * Avg recorded price per day, last 30 days, in the farmer's own province.
     */
    private function priceSeries(int $categoryId, ?string $region): array
    {
        return PriceTrend::where('category_id', $categoryId)
            ->when($region, fn ($q) => $q->where('region', $region))
            ->where('recorded_date', '>=', now()->subDays(29)->toDateString())
            ->selectRaw('recorded_date, AVG(recorded_price) as avg_price, COUNT(*) as samples')
            ->groupBy('recorded_date')
            ->orderBy('recorded_date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->recorded_date->toDateString(),
                'avg_price' => round((float) $row->avg_price, 2),
                'samples' => (int) $row->samples,
            ])
            ->all();
    }

    /**
     * Spec: regional price comparison — avg price per province over the window.
     */
    private function regionalComparison(int $categoryId, ?string $region): array
    {
        return PriceTrend::where('category_id', $categoryId)
            ->where('recorded_date', '>=', now()->subDays(29)->toDateString())
            ->selectRaw('region, AVG(recorded_price) as avg_price, COUNT(*) as samples')
            ->groupBy('region')
            ->orderBy('avg_price', 'desc')
            ->get()
            ->map(fn ($row) => [
                'region' => $row->region,
                'avg_price' => round((float) $row->avg_price, 2),
                'samples' => (int) $row->samples,
                'is_home' => $row->region === $region,
            ])
            ->all();
    }

    /**
     * Spec: basic demand forecasting — weekly order volume over 8 weeks with a
     * plain-language direction (second-half average vs first-half average).
     */
    private function demand(int $categoryId): array
    {
        $items = $this->categoryOrderItems($categoryId, now()->subWeeks(8)->startOfDay());

        $weekly = $items
            ->groupBy(fn ($item) => Carbon::parse($item->created_at)->startOfWeek()->toDateString())
            ->map(fn ($group, $weekStart) => ['week_start' => $weekStart, 'items_sold' => (float) $group->sum('quantity')])
            ->sortBy('week_start')
            ->values();

        $direction = null;
        if ($weekly->count() >= 2) {
            $half = intdiv($weekly->count(), 2);
            $firstHalf = (float) $weekly->take($half)->avg('items_sold');
            $secondHalf = (float) $weekly->slice($half)->avg('items_sold');
            $direction = match (true) {
                $secondHalf > $firstHalf * 1.1 => 'rising',
                $secondHalf < $firstHalf * 0.9 => 'falling',
                default => 'steady',
            };
        }

        return ['weekly' => $weekly->all(), 'direction' => $direction];
    }

    /**
     * Spec: "best time to sell" — month-of-year price seasonality from recorded
     * history plus the busiest day of week from real order volume.
     */
    private function bestTime(int $categoryId): array
    {
        $months = PriceTrend::where('category_id', $categoryId)
            ->get(['recorded_price', 'recorded_date'])
            ->groupBy(fn ($trend) => $trend->recorded_date->month)
            ->map(fn (Collection $group, $month) => [
                'month' => (int) $month,
                'name' => Carbon::create()->month((int) $month)->monthName,
                'avg_price' => round((float) $group->avg('recorded_price'), 2),
                'samples' => $group->count(),
            ])
            ->sortByDesc('avg_price')
            ->values();

        $items = $this->categoryOrderItems($categoryId, null);
        $days = $items
            ->groupBy(fn ($item) => Carbon::parse($item->created_at)->dayName)
            ->map(fn (Collection $group, $dayName) => [
                'day' => $dayName,
                'items_sold' => (float) $group->sum('quantity'),
            ])
            ->sortByDesc('items_sold')
            ->values();

        $bestMonth = $months->first();
        $bestDay = $days->first();

        $recommendation = null;
        if ($bestMonth && $bestDay) {
            $recommendation = "Historically, prices peak in {$bestMonth['name']}. {$bestDay['day']} is the busiest day for orders.";
        } elseif ($bestMonth) {
            $recommendation = "Historically, prices peak in {$bestMonth['name']}.";
        } elseif ($bestDay) {
            $recommendation = "{$bestDay['day']} is the busiest day for orders.";
        }

        return [
            'monthly' => $months->all(),
            'by_day' => $days->all(),
            'best_month' => $bestMonth,
            'best_day' => $bestDay,
            'recommendation' => $recommendation,
        ];
    }

    /**
     * Order items for a category on non-cancelled orders, with the order date
     * attached. $from of null means "all time" (used for seasonality/day-of-week).
     */
    private function categoryOrderItems(int $categoryId, ?CarbonInterface $from): Collection
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('products.category_id', $categoryId)
            ->whereNotIn('orders.status', ['cancelled'])
            ->when($from, fn ($q) => $q->where('orders.created_at', '>=', $from))
            ->get(['order_items.quantity', 'orders.created_at']);
    }
}
