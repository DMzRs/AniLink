<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    // Single source of truth for "low stock" — mobile ProductDetail and web
    // AniManage both already treat <= 5 as low.
    public const LOW_STOCK_THRESHOLD = 5;

    protected $fillable = [
        'farmer_id',
        'category_id',
        'name',
        'description',
        'unit_type',
        'price_per_unit',
        'available_quantity',
        'min_bulk_quantity',
        'bulk_price',
        'harvest_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price_per_unit' => 'decimal:2',
            'available_quantity' => 'decimal:2',
            'min_bulk_quantity' => 'decimal:2',
            'bulk_price' => 'decimal:2',
            'harvest_date' => 'date',
        ];
    }

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'farmer_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryLogs(): HasMany
    {
        return $this->hasMany(InventoryLog::class);
    }

    public function scopeLowStock($query)
    {
        return $query->where('status', '!=', 'archived')
            ->where('available_quantity', '<=', self::LOW_STOCK_THRESHOLD);
    }

    public function isLowStock(): bool
    {
        return $this->status !== 'archived' && (float) $this->available_quantity <= self::LOW_STOCK_THRESHOLD;
    }
}
