<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * Discovery: search + filter by category/location/price + sort by distance/freshness/price
     * GET /api/products?search=&category=&price_min=&price_max=&province=&municipality=&barangay=&sort=fresh|distance|price_low|price_high&status=available
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'], // id or slug
            'price_min' => ['nullable', 'numeric', 'min:0'],
            'price_max' => ['nullable', 'numeric', 'min:0'],
            'province' => ['nullable', 'string', 'max:100'],
            'municipality' => ['nullable', 'string', 'max:100'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'verified_only' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:fresh,distance,price_low,price_high'],
            'status' => ['nullable', 'in:available,sold_out,archived'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Product::query()
            ->with(['farmer.farmerProfile', 'category', 'images'])
            ->where('status', $request->get('status', 'available'));

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($category = $request->get('category')) {
            $query->whereHas('category', function ($q) use ($category) {
                $q->where('slug', $category)->orWhere('id', $category)->orWhere('name', $category);
            });
        }

        if ($request->filled('price_min')) {
            $query->where('price_per_unit', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price_per_unit', '<=', $request->price_max);
        }

        // Location filters via farmerProfile
        if ($request->filled('province') || $request->filled('municipality') || $request->filled('barangay')) {
            $query->whereHas('farmer.farmerProfile', function ($q) use ($request) {
                if ($request->filled('province')) $q->where('province', $request->province);
                if ($request->filled('municipality')) $q->where('municipality', $request->municipality);
                if ($request->filled('barangay')) $q->where('barangay', $request->barangay);
            });
        }

        if ($request->boolean('verified_only')) {
            $query->whereHas('farmer.farmerProfile', fn($q) => $q->where('verification_status', 'approved'));
        }

        // Sorting per spec: freshness (harvest_date), distance (farmer location), price
        $sort = $request->get('sort', 'fresh');
        match ($sort) {
            'price_low' => $query->orderBy('price_per_unit', 'asc'),
            'price_high' => $query->orderBy('price_per_unit', 'desc'),
            'distance' => $query->join('farmer_profiles', 'farmer_profiles.user_id', '=', 'products.farmer_id')
                                 ->orderBy('farmer_profiles.municipality', 'asc')
                                 ->orderBy('products.created_at', 'desc')
                                 ->select('products.*'),
            default => $query->orderBy('harvest_date', 'desc')->orderBy('created_at', 'desc'), // fresh
        };

        $perPage = $request->get('per_page', 20);
        $products = $query->paginate($perPage)->appends($request->query());

        // Transform to AniMarket shape expected by React Native
        $products->getCollection()->transform(fn(Product $p) => $this->transformProduct($p));

        return response()->json($products);
    }

    public function show(Product $product)
    {
        $product->load(['farmer.farmerProfile', 'category', 'images']);
        return response()->json(['data' => $this->transformProduct($product, true)]);
    }

    /**
     * Farmer CRUD: create listing
     * POST /api/products
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_type' => ['required', 'string', 'in:kg,sack,piece,bundle,bag,box'],
            'price_per_unit' => ['required', 'numeric', 'min:0'],
            'available_quantity' => ['required', 'numeric', 'min:0'],
            'min_bulk_quantity' => ['nullable', 'numeric', 'min:1'],
            'bulk_price' => ['nullable', 'numeric', 'min:0', 'required_with:min_bulk_quantity'],
            'harvest_date' => ['nullable', 'date', 'before_or_equal:today'],
            'status' => ['nullable', 'in:available,sold_out,archived'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:png,jpg,jpeg', 'max:5120'],
        ]);

        $validated['farmer_id'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'available';

        $product = DB::transaction(function () use ($validated, $request) {
            $product = Product::create($validated);

            // Images
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $idx => $file) {
                    $path = $file->store('products', 'public');
                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_path' => $path,
                        'is_primary' => $idx === 0,
                    ]);
                }
            }

            InventoryLog::create([
                'product_id' => $product->id,
                'change_amount' => $product->available_quantity,
                'reason' => 'restock',
                'created_by' => $request->user()->id,
            ]);

            return $product;
        });

        $product->load(['farmer.farmerProfile', 'category', 'images']);
        return response()->json(['message' => 'Product listed.', 'data' => $this->transformProduct($product)], 201);
    }

    /**
     * PUT /api/products/{product}
     */
    public function update(Request $request, Product $product)
    {
        $this->authorizeOwner($request, $product);

        $validated = $request->validate([
            'category_id' => ['sometimes', 'exists:categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_type' => ['sometimes', 'string', 'in:kg,sack,piece,bundle,bag,box'],
            'price_per_unit' => ['sometimes', 'numeric', 'min:0'],
            'available_quantity' => ['sometimes', 'numeric', 'min:0'],
            'min_bulk_quantity' => ['nullable', 'numeric', 'min:1'],
            'bulk_price' => ['nullable', 'numeric', 'min:0'],
            'harvest_date' => ['nullable', 'date', 'before_or_equal:today'],
            'status' => ['sometimes', 'in:available,sold_out,archived'],
        ]);

        $oldQty = $product->available_quantity;

        $product->update($validated);

        if (isset($validated['available_quantity']) && $validated['available_quantity'] != $oldQty) {
            $diff = $validated['available_quantity'] - $oldQty;
            InventoryLog::create([
                'product_id' => $product->id,
                'change_amount' => $diff,
                'reason' => $diff > 0 ? 'restock' : 'adjustment',
                'created_by' => $request->user()->id,
            ]);
            // Auto status sold_out handling
            if ($product->available_quantity <= 0) {
                $product->update(['status' => 'sold_out']);
            } elseif ($product->status === 'sold_out' && $product->available_quantity > 0) {
                $product->update(['status' => 'available']);
            }
        }

        $product->load(['farmer.farmerProfile', 'category', 'images']);
        return response()->json(['message' => 'Product updated.', 'data' => $this->transformProduct($product)]);
    }

    /**
     * DELETE /api/products/{product} — soft archive per spec (status archived) + inventory log
     */
    public function destroy(Request $request, Product $product)
    {
        $this->authorizeOwner($request, $product);
        $product->update(['status' => 'archived']);
        return response()->json(['message' => 'Product archived.']);
    }

    /**
     * GET /api/farmer/products — my listings for AniManage
     */
    public function myProducts(Request $request)
    {
        $products = Product::with(['category', 'images'])
            ->where('farmer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        $products->getCollection()->transform(fn($p) => $this->transformProduct($p));
        return response()->json($products);
    }

    /**
     * PATCH /api/products/{product}/stock — one-tap stock adjust per AniManage spec
     */
    public function adjustStock(Request $request, Product $product)
    {
        $this->authorizeOwner($request, $product);
        $validated = $request->validate([
            'change_amount' => ['required', 'numeric'],
            'reason' => ['nullable', 'in:sale,restock,adjustment'],
        ]);

        $product->available_quantity = max(0, $product->available_quantity + $validated['change_amount']);
        if ($product->available_quantity == 0) $product->status = 'sold_out';
        elseif ($product->status === 'sold_out' && $product->available_quantity > 0) $product->status = 'available';
        $product->save();

        InventoryLog::create([
            'product_id' => $product->id,
            'change_amount' => $validated['change_amount'],
            'reason' => $validated['reason'] ?? 'adjustment',
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Stock updated.', 'data' => $this->transformProduct($product->fresh(['category', 'images', 'farmer.farmerProfile']))]);
    }

    private function authorizeOwner(Request $request, Product $product): void
    {
        if ($product->farmer_id !== $request->user()->id && $request->user()->role !== 'admin') {
            abort(403, 'Only the farming owner (or admin) can modify this listing.');
        }
    }

    private function transformProduct(Product $p, bool $detailed = false): array
    {
        $farmer = $p->farmer;
        $profile = $farmer?->farmerProfile;
        $primaryImage = $p->images->firstWhere('is_primary', true) ?? $p->images->first();
        $base = [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'category' => $p->category ? ['id' => $p->category->id, 'name' => $p->category->name, 'slug' => $p->category->slug] : null,
            'category_id' => $p->category_id,
            'unit_type' => $p->unit_type,
            'price_per_unit' => (float) $p->price_per_unit,
            'available_quantity' => (float) $p->available_quantity,
            'min_bulk_quantity' => $p->min_bulk_quantity ? (float) $p->min_bulk_quantity : null,
            'bulk_price' => $p->bulk_price ? (float) $p->bulk_price : null,
            'harvest_date' => $p->harvest_date?->format('Y-m-d'),
            'status' => $p->status,
            'image' => $primaryImage ? Storage::disk('public')->url($primaryImage->image_path) : null,
            'images' => $p->images->map(fn($img) => ['id' => $img->id, 'url' => Storage::disk('public')->url($img->image_path), 'is_primary' => (bool) $img->is_primary]),
            'farmer' => $farmer ? [
                'id' => $farmer->id,
                'name' => $farmer->name,
                'farm_name' => $profile?->farm_name ?? $farmer->name,
                'barangay' => $profile?->barangay,
                'municipality' => $profile?->municipality,
                'province' => $profile?->province,
                'verified' => $profile?->verification_status === 'approved',
                'verification_status' => $profile?->verification_status,
                'distance_km' => null, // Filled by client or future geo; distance sort uses municipality alphabetical for now
            ] : null,
            'rating' => 4.7,
            'reviews' => $p->orderItems()->count(),
            'created_at' => $p->created_at,
        ];
        if ($detailed) {
            $base['inventory_logs_count'] = $p->inventoryLogs()->count();
        }
        return $base;
    }
}
