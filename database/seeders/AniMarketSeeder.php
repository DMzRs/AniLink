<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AniMarketSeeder extends Seeder
{
    public function run(): void
    {
        // Categories
        $cats = [
            ['name' => 'Gulay', 'slug' => 'gulay'],
            ['name' => 'Prutas', 'slug' => 'prutas'],
            ['name' => 'Bigas', 'slug' => 'bigas'],
            ['name' => 'Isda', 'slug' => 'isda'],
            ['name' => 'Herbs', 'slug' => 'herbs'],
        ];
        foreach ($cats as $c) {
            Category::firstOrCreate(['slug' => $c['slug']], $c);
        }

        // Demo farmers
        $farmers = [
            ['name' => 'Ka Lito Santos', 'email' => 'lito@anilink.test', 'farm' => 'Santos Family Farm', 'barangay' => 'Brgy. San Isidro', 'municipality' => 'Cabanatuan', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
            ['name' => 'Aling Nena Cruz', 'email' => 'nena@anilink.test', 'farm' => 'Cruz Organic Patch', 'barangay' => 'Brgy. Maligaya', 'municipality' => 'Gapan', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
            ['name' => 'Rodel Mendoza', 'email' => 'rodel@anilink.test', 'farm' => 'Mendoza Rice Co-op', 'barangay' => 'Brgy. Sto. Cristo', 'municipality' => 'Talavera', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
        ];
        $farmerIds = [];
        foreach ($farmers as $f) {
            $user = User::firstOrCreate(['email' => $f['email']], [
                'name' => $f['name'],
                'password' => Hash::make('password123'),
                'role' => 'farmer',
                'phone' => '0917000000' . rand(10, 99),
                'is_verified' => true,
            ]);
            FarmerProfile::updateOrCreate(['user_id' => $user->id], [
                'farm_name' => $f['farm'],
                'barangay' => $f['barangay'],
                'municipality' => $f['municipality'],
                'province' => $f['province'],
                'verification_status' => $f['verified'],
                'bio' => 'Smallholder farmer from ' . $f['municipality'],
            ]);
            $farmerIds[] = $user->id;
        }

        // Demo buyers
        User::firstOrCreate(['email' => 'buyer@anilink.test'], [
            'name' => 'Maria Buyer',
            'password' => Hash::make('password123'),
            'role' => 'buyer_individual',
            'phone' => '09171234567',
        ]);
        User::firstOrCreate(['email' => 'biz@anilink.test'], [
            'name' => 'Carinderia Ni Aling Tess',
            'password' => Hash::make('password123'),
            'role' => 'buyer_business',
            'phone' => '09179876543',
        ]);

        // Products
        $gulay = Category::where('slug', 'gulay')->first();
        $prutas = Category::where('slug', 'prutas')->first();
        $bigas = Category::where('slug', 'bigas')->first();
        $isda = Category::where('slug', 'isda')->first();
        $herbs = Category::where('slug', 'herbs')->first();

        $products = [
            ['farmer_email' => 'lito@anilink.test', 'category_id' => $gulay->id, 'name' => 'Siling Labuyo', 'unit_type' => 'kg', 'price' => 120, 'qty' => 18, 'bulk_qty' => 5, 'bulk_price' => 95, 'harvest' => '2026-09-06', 'desc' => 'Hand-harvested yesterday at dawn. Ideal for sawsawan and Bicol Express.'],
            ['farmer_email' => 'nena@anilink.test', 'category_id' => $gulay->id, 'name' => 'Kamatis (Native)', 'unit_type' => 'kg', 'price' => 55, 'qty' => 42, 'bulk_qty' => 10, 'bulk_price' => 45, 'harvest' => '2026-09-07', 'desc' => 'Laman, not hybrid. Firm, sweet-sour balance.'],
            ['farmer_email' => 'rodel@anilink.test', 'category_id' => $bigas->id, 'name' => 'Bigas — Dinorado', 'unit_type' => 'sack', 'price' => 1250, 'qty' => 12, 'bulk_qty' => 3, 'bulk_price' => 1150, 'harvest' => '2026-08-28', 'desc' => '25 kg sacks, milled 5 days ago. Aromatic.'],
            ['farmer_email' => 'nena@anilink.test', 'category_id' => $prutas->id, 'name' => 'Manggang Kalabaw', 'unit_type' => 'kg', 'price' => 85, 'qty' => 30, 'bulk_qty' => 8, 'bulk_price' => 70, 'harvest' => '2026-09-05', 'desc' => 'Hinog sa puno, golden flesh.'],
            ['farmer_email' => 'lito@anilink.test', 'category_id' => $isda->id, 'name' => 'Tilapia (Buhay)', 'unit_type' => 'kg', 'price' => 140, 'qty' => 15, 'bulk_qty' => 6, 'bulk_price' => 120, 'harvest' => '2026-09-07', 'desc' => 'Fresh harvest, linis on request.'],
            ['farmer_email' => 'nena@anilink.test', 'category_id' => $herbs->id, 'name' => 'Tanglad & Pandan Bundle', 'unit_type' => 'piece', 'price' => 35, 'qty' => 60, 'bulk_qty' => 20, 'bulk_price' => 28, 'harvest' => '2026-09-07', 'desc' => 'Tali of 8 stalks + 6 pandan leaves.'],
        ];

        foreach ($products as $p) {
            $farmer = User::where('email', $p['farmer_email'])->first();
            Product::firstOrCreate(
                ['name' => $p['name'], 'farmer_id' => $farmer->id],
                [
                    'category_id' => $p['category_id'],
                    'description' => $p['desc'],
                    'unit_type' => $p['unit_type'],
                    'price_per_unit' => $p['price'],
                    'available_quantity' => $p['qty'],
                    'min_bulk_quantity' => $p['bulk_qty'],
                    'bulk_price' => $p['bulk_price'],
                    'harvest_date' => $p['harvest'],
                    'status' => 'available',
                ]
            );
        }
    }
}
