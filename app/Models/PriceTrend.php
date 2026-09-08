<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceTrend extends Model
{
    use HasFactory;

    protected $fillable = ['category_id', 'region', 'recorded_price', 'recorded_date'];

    protected function casts(): array
    {
        return [
            'recorded_price' => 'decimal:2',
            'recorded_date' => 'date',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
