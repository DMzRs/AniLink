<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FarmerProfile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PriceTrend;
use App\Models\Product;
use App\Models\QuoteRequest;
use App\Models\Region;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
                'phone' => '0917000000'.rand(10, 99),
                'is_verified' => true,
            ]);
            FarmerProfile::updateOrCreate(['user_id' => $user->id], [
                'farm_name' => $f['farm'],
                'barangay' => $f['barangay'],
                'municipality' => $f['municipality'],
                'province' => $f['province'],
                'verification_status' => $f['verified'],
                'verification_doc_path' => $f['doc'] ?? null,
                'bio' => 'Smallholder farmer from '.$f['municipality'],
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
            if (Order::count() === 0) {
                $productsList = Product::where('status', 'available')->take(3)->get();
                foreach (range(1, 7) as $daysAgo) {
                    $date = now()->subDays($daysAgo);
                    $orderBuyer = $daysAgo % 2 === 0 ? $biz : $buyer;
                    $prod = $productsList[$daysAgo % $productsList->count()];
                    $qty = rand(1, 3);
                    $order = Order::create([
                        'buyer_id' => $orderBuyer->id,
                        'farmer_id' => $prod->farmer_id,
                        'order_type' => $orderBuyer->role === 'buyer_business' && $qty >= 2 ? 'bulk' : 'retail',
                        'status' => ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'][array_rand(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])],
                        'fulfillment_type' => rand(0, 1) ? 'delivery' : 'pickup',
                        'total_amount' => $prod->price_per_unit * $qty + (rand(0, 1) ? 45 : 0),
                        'delivery_address' => 'Brgy. San Isidro, Cabanatuan',
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $prod->id,
                        'quantity' => $qty,
                        'unit_price' => $prod->price_per_unit,
                        'subtotal' => $prod->price_per_unit * $qty,
                    ]);
                }
            }
        }

        // ── AniPredict demo data ──
        // 90 days of synthetic price history across provinces so trends and the
        // regional comparison are alive on first run. Guarded against reseed dupes.
        if (PriceTrend::count() === 0) {
            $provinces = ['Nueva Ecija', 'Laguna', 'Quezon'];
            $basePrices = ['gulay' => 62, 'prutas' => 90, 'bigas' => 52, 'isda' => 175, 'herbs' => 32];

            foreach ($cats as $c) {
                $category = Category::where('slug', $c['slug'])->first();
                if (! $category) {
                    continue;
                }
                $base = $basePrices[$c['slug']];
                foreach (range(90, 0, -3) as $daysAgo) {
                    foreach ($provinces as $pi => $province) {
                        PriceTrend::create([
                            'category_id' => $category->id,
                            'region' => $province,
                            // seasonal wobble + gentle upward drift + per-province offset + jitter
                            'recorded_price' => round($base + sin($daysAgo / 9) * 6 + (90 - $daysAgo) * 0.12 + $pi * 4 + mt_rand(-400, 400) / 100, 2),
                            'recorded_date' => now()->subDays($daysAgo)->toDateString(),
                        ]);
                    }
                }
            }
        }

        // Wider completed-order history so demand direction and best-day insights
        // have data beyond the 7-day demo orders above.
        $lito = User::where('email', 'lito@anilink.test')->first();
        $litoProduct = $lito ? Product::where('farmer_id', $lito->id)->orderBy('id')->first() : null;
        if ($buyer && $litoProduct && Order::where('status', 'completed')->count() === 0) {
            foreach (range(1, 14) as $i) {
                $qty = 2 + intdiv($i, 3); // gently rising volume → demand trend reads "rising"
                $date = now()->subDays(56 - $i * 4)->setHour(rand(7, 18));
                $order = Order::create([
                    'buyer_id' => $buyer->id,
                    'farmer_id' => $lito->id,
                    'order_type' => 'retail',
                    'status' => 'completed',
                    'fulfillment_type' => 'pickup',
                    'total_amount' => $litoProduct->price_per_unit * $qty,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $litoProduct->id,
                    'quantity' => $qty,
                    'unit_price' => $litoProduct->price_per_unit,
                    'subtotal' => $litoProduct->price_per_unit * $qty,
                ]);
            }
        }

        // ── Region reference data (AniPredict + distance sort) ──
        // Philippine provinces with approximate centroids; good enough for
        // "about N km away" display. Guarded against reseed duplicates.
        if (Region::count() === 0) {
            $provinces = [
                ['Abra', 17.60, 120.75], ['Agusan del Norte', 8.94, 125.54], ['Agusan del Sur', 8.50, 125.99],
                ['Aklan', 11.67, 122.37], ['Albay', 13.17, 123.52], ['Antique', 10.75, 122.17],
                ['Apayao', 18.25, 121.28], ['Aurora', 15.80, 121.50], ['Basilan', 6.70, 122.00],
                ['Bataan', 14.63, 120.53], ['Batanes', 20.45, 121.97], ['Batangas', 13.88, 121.06],
                ['Benguet', 16.50, 120.65], ['Biliran', 11.58, 124.35], ['Bohol', 9.75, 124.10],
                ['Bukidnon', 8.05, 124.92], ['Bulacan', 14.95, 120.88], ['Cagayan', 18.00, 121.79],
                ['Camarines Norte', 14.14, 122.76], ['Camarines Sur', 13.70, 123.30], ['Camiguin', 9.17, 124.73],
                ['Capiz', 11.42, 122.60], ['Catanduanes', 13.87, 124.20], ['Cavite', 14.48, 120.90],
                ['Cebu', 10.52, 123.75], ['Davao de Oro', 7.68, 126.03], ['Davao del Norte', 7.44, 125.71],
                ['Davao del Sur', 6.75, 125.35], ['Davao Occidental', 6.10, 125.60], ['Davao Oriental', 7.16, 126.42],
                ['Dinagat Islands', 10.13, 125.60], ['Eastern Samar', 11.30, 125.58], ['Guimaras', 10.58, 122.57],
                ['Ifugao', 16.83, 121.17], ['Ilocos Norte', 18.06, 120.77], ['Ilocos Sur', 17.22, 120.60],
                ['Iloilo', 10.94, 122.36], ['Isabela', 16.98, 121.77], ['Kalinga', 17.42, 121.36],
                ['La Union', 16.44, 120.44], ['Laguna', 14.20, 121.36], ['Lanao del Norte', 8.00, 123.90],
                ['Lanao del Sur', 7.87, 124.32], ['Metro Manila', 14.60, 120.98], ['Leyte', 10.95, 124.83],
                ['Maguindanao', 7.10, 124.35], ['Marinduque', 13.40, 121.83], ['Masbate', 12.30, 123.55],
                ['Misamis Occidental', 8.25, 123.66], ['Misamis Oriental', 8.48, 124.75], ['Mountain Province', 17.05, 120.98],
                ['Negros Occidental', 10.40, 122.98], ['Negros Oriental', 9.50, 122.95], ['Northern Samar', 12.45, 124.75],
                ['Nueva Ecija', 15.58, 120.92], ['Nueva Vizcaya', 16.32, 121.24], ['Occidental Mindoro', 12.70, 120.85],
                ['Oriental Mindoro', 13.05, 121.48], ['Palawan', 9.84, 118.74], ['Pampanga', 15.20, 120.60],
                ['Pangasinan', 15.89, 120.30], ['Quezon', 14.10, 121.95], ['Quirino', 16.30, 121.72],
                ['Rizal', 14.60, 121.20], ['Romblon', 12.58, 122.27], ['Samar', 11.80, 125.03],
                ['Sarangani', 5.95, 125.15], ['Siquijor', 9.20, 123.55], ['Sorsogon', 12.97, 124.00],
                ['South Cotabato', 6.42, 124.80], ['Southern Leyte', 10.33, 125.10], ['Sultan Kudarat', 6.63, 124.33],
                ['Sulu', 5.90, 121.20], ['Surigao del Norte', 9.60, 125.50], ['Surigao del Sur', 8.55, 126.15],
                ['Tarlac', 15.47, 120.59], ['Tawi-Tawi', 5.50, 120.50], ['Zambales', 15.30, 119.95],
                ['Zamboanga del Norte', 8.42, 123.15], ['Zamboanga del Sur', 7.78, 123.40], ['Zamboanga Sibugay', 7.65, 122.75],
            ];
            foreach ($provinces as [$name, $lat, $lng]) {
                Region::firstOrCreate(['name' => $name], ['latitude' => $lat, 'longitude' => $lng]);
            }
        }

        // Demo bulk quote requests (one-round negotiation, AniMarket B2B)
        if (QuoteRequest::count() === 0) {
            $biz = User::where('email', 'biz@anilink.test')->first();
            $kamatis = Product::where('name', 'Kamatis (Native)')->first();
            $dinorado = Product::where('name', 'Bigas — Dinorado')->first();
            if ($biz && $kamatis) {
                QuoteRequest::create([
                    'buyer_id' => $biz->id,
                    'farmer_id' => $kamatis->farmer_id,
                    'product_id' => $kamatis->id,
                    'quantity' => 25,
                    'message' => 'Weekly carinderia supply — best price for 25kg?',
                    'status' => 'pending',
                ]);
            }
            if ($biz && $dinorado) {
                QuoteRequest::create([
                    'buyer_id' => $biz->id,
                    'farmer_id' => $dinorado->farmer_id,
                    'product_id' => $dinorado->id,
                    'quantity' => 10,
                    'message' => 'Monthly rice supply for 3 branches.',
                    'status' => 'quoted',
                    'quoted_unit_price' => 1180,
                    'response_note' => 'For 10+ sacks, ₱1,180/sack locked for 2 weeks.',
                ]);
            }
        }

        // Demo dispute reports (admin queue)
        if (Report::count() === 0) {
            $admin = User::where('email', 'admin@anilink.test')->first();
            $demoBuyer = User::where('email', 'buyer@anilink.test')->first();
            $completedOrder = Order::where('status', 'completed')->first();
            if ($demoBuyer && $completedOrder) {
                Report::create([
                    'reporter_id' => $demoBuyer->id,
                    'order_id' => $completedOrder->id,
                    'category' => 'order_issue',
                    'description' => 'Some tomatoes arrived bruised - the box was crushed on one side.',
                    'status' => 'open',
                ]);
            }
            if ($admin && $demoBuyer) {
                Report::create([
                    'reporter_id' => $demoBuyer->id,
                    'category' => 'other',
                    'description' => 'Tested the report flow end to end.',
                    'status' => 'dismissed',
                    'resolution_note' => 'No violation found - closing.',
                    'resolved_by' => $admin->id,
                ]);
            }
        }
    }
}
