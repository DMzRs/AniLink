<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_FARMER = 'farmer';
    public const ROLE_BUYER_INDIVIDUAL = 'buyer_individual';
    public const ROLE_BUYER_BUSINESS = 'buyer_business';
    public const ROLE_ADMIN = 'admin';

    public const ROLES = [
        self::ROLE_FARMER,
        self::ROLE_BUYER_INDIVIDUAL,
        self::ROLE_BUYER_BUSINESS,
        self::ROLE_ADMIN,
    ];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'two_factor_secret',
        'two_factor_enabled',
        'is_verified',
        'expo_push_token',
        'push_platform',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_enabled' => 'boolean',
            'is_verified' => 'boolean',
        ];
    }

    // Relationships

    public function farmerProfile(): HasOne
    {
        return $this->hasOne(FarmerProfile::class);
    }

    public function buyerProfile(): HasOne
    {
        return $this->hasOne(BuyerProfile::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'farmer_id');
    }

    public function buyerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function farmerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'farmer_id');
    }

    public function twoFactorCodes(): HasMany
    {
        return $this->hasMany(TwoFactorCode::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    // Helpers

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isFarmer(): bool
    {
        return $this->role === self::ROLE_FARMER;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function requiresTwoFactor(): bool
    {
        // Spec: 2FA enforced for all vendor (farmer) accounts, optional for others but supported
        return $this->isFarmer();
    }
}
