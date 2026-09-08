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

        // Admin
        User::firstOrCreate(['email' => 'admin@anilink.test'], [
            'name' => 'AniLink Admin',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'phone' => '09170000001',
            'is_verified' => true,
        ]);

        // Demo farmers
        $farmers = [
            ['name' => 'Ka Lito Santos', 'email' => 'lito@anilink.test', 'farm' => 'Santos Family Farm', 'barangay' => 'Brgy. San Isidro', 'municipality' => 'Cabanatuan', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
            ['name' => 'Aling Nena Cruz', 'email' => 'nena@anilink.test', 'farm' => 'Cruz Organic Patch', 'barangay' => 'Brgy. Maligaya', 'municipality' => 'Gapan', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
            ['name' => 'Rodel Mendoza', 'email' => 'rodel@anilink.test', 'farm' => 'Mendoza Rice Co-op', 'barangay' => 'Brgy. Sto. Cristo', 'municipality' => 'Talavera', 'province' => 'Nueva Ecija', 'verified' => 'approved'],
            // Pending / rejected for verification queue demo (desktop admin)
            ['name' => 'Jun Dela Cruz', 'email' => 'jun.pending@anilink.test', 'farm' => 'Dela Cruz Harvest', 'barangay' => 'Brgy. San Jose', 'municipality' => 'Aliaga', 'province' => 'Nueva Ecija', 'verified' => 'pending', 'doc' => 'pending_id.jpg'],
            ['name' => 'Elena Ramos', 'email' => 'elena.pending@anilink.test', 'farm' => 'Ramos Gulay Farm', 'barangay' => 'Brgy. Mabini', 'municipality' => 'San Leonardo', 'province' => 'Nueva Ecija', 'verified' => 'pending'],
            ['name' => 'Boy Recto', 'email' => 'boy.rejected@anilink.test', 'farm' => 'Recto Fishpond', 'barangay' => 'Brgy. Tabuating', 'municipality' => 'General Tinio', 'province' => 'Nueva Ecija', 'verified' => 'rejected'],
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
                'verification_doc_path' => $f['doc'] ?? null,
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

        // Seed a few archived/sold_out listings for moderation demo
        $archivedFarmer = User::where('email', 'boy.rejected@anilink.test')->first();
        if ($archivedFarmer) {
            Product::firstOrCreate(['name' => 'Pechay (overpriced)', 'farmer_id' => $archivedFarmer->id], [
                'category_id' => $gulay->id,
                'description' => 'Flagged for moderation — price far above regional trend.',
                'unit_type' => 'kg',
                'price_per_unit' => 350,
                'available_quantity' => 5,
                'harvest_date' => '2026-09-01',
                'status' => 'archived',
            ]);
        }

        // Seed orders for analytics: 7 days of orders, varied statuses
        $buyer = User::where('email', 'buyer@anilink.test')->first();
        $biz = User::where('email', 'biz@anilink.test')->first();
        if ($buyer && Product::count() > 0) {
            // create only if no orders yet (avoid duplicates on reseed)
            if (\App\Models\Order::count() === 0) {
                $productsList = Product::where('status', 'available')->take(3)->get();
                foreach (range(1, 7) as $daysAgo) {
                    $date = now()->subDays($daysAgo);
                    $orderBuyer = $daysAgo % 2 === 0 ? $biz : $buyer;
                    $prod = $productsList[$daysAgo % $productsList->count()];
                    $qty = rand(1, 3);
                    $order = \App\Models\Order::create([
                        'buyer_id' => $orderBuyer->id,
                        'farmer_id' => $prod->farmer_id,
                        'order_type' => $orderBuyer->role === 'buyer_business' && $qty >= 2 ? 'bulk' : 'retail',
                        'status' => ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'][array_rand(['pending','confirmed','preparing','ready','completed','cancelled'])],
                        'fulfillment_type' => rand(0,1) ? 'delivery' : 'pickup',
                        'total_amount' => $prod->price_per_unit * $qty + (rand(0,1) ? 45 : 0),
                        'delivery_address' => 'Brgy. San Isidro, Cabanatuan',
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                    \App\Models\OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $prod->id,
                        'quantity' => $qty,
                        'unit_price' => $prod->price_per_unit,
                        'subtotal' => $prod->price_per_unit * $qty,
                    ]);
                }
            }
        }
    }
}
