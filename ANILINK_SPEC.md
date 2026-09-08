# AniLink — Project Spec

Hyper-local agricultural marketplace connecting Filipino smallholder farmers
directly to households and businesses. Stack: **Laravel (API) + React.js
(web)**, with a **React Native (Expo)** mobile app planned to reuse the same
API.

Brand: Forest Green primary, Harvest Gold accent. Tagline: "Cultivating
Connection, Harvesting Fair Trades."

---

## Modules & Functions

### 1. Auth & User Management
- Multi-role signup/login: Farmer, Buyer-Individual, Buyer-Business, Admin
- Two-Factor Authentication (2FA) via OTP (email or SMS gateway e.g. Semaphore)
- Farmer verification workflow (document upload + admin approval)
- Profile management (barangay/municipality/province, contact info, business
  permit for B2B buyers)

### 2. AniMarket (Marketplace)
- Product listing CRUD (farmer side): name, category, price/unit, unit type
  (kg/sack/piece), available quantity, harvest date, photos
- Product discovery: search, filter by category/location/price, sort by
  distance/freshness/price
- Direct order flow (retail) and bulk order flow (B2B) with negotiable bulk
  pricing/quotes
- Cart, checkout, order confirmation
- Delivery vs pickup logistics selection
- Ratings & reviews per farmer/product

### 3. AniManage (Farmer Inventory & Orders)
- One-tap stock adjustment (increment/decrement, mark sold out)
- Real-time order queue: Pending -> Confirmed -> Preparing -> Ready ->
  Delivered/Completed
- Low-stock alerts
- Simple sales summary (daily/weekly totals)

### 4. AniPredict (Analytics)
- Price trend tracking per crop/category over time
- Basic demand forecasting (seasonal patterns, order volume trends)
- "Best time to sell" recommendation logic
- Regional price comparison

### 5. Notifications
- New order alerts (farmer), order status updates (buyer)
- Price/trend alerts (farmer), restock reminders

### 6. Admin Panel
- Farmer verification approval/rejection
- User & listing moderation
- Platform-wide analytics (GMV, active farmers, order volume)
- Dispute/report handling

### 7. Security
- 2FA enforced for all vendor accounts
- Secure server-side validation on all forms
- Rate limiting on login attempts
- Role-based access control (RBAC)

---

## Database Schema

- **users**: id, name, email, phone, password, role[farmer/buyer_individual/
  buyer_business/admin], two_factor_secret, two_factor_enabled, is_verified,
  timestamps
- **farmer_profiles**: id, user_id FK, farm_name, barangay, municipality,
  province, verification_status[pending/approved/rejected],
  verification_doc_path, bio
- **buyer_profiles**: id, user_id FK, buyer_type[individual/business],
  business_permit_path, delivery_address
- **categories**: id, name, slug
- **products**: id, farmer_id FK, category_id FK, name, description,
  unit_type, price_per_unit, available_quantity, min_bulk_quantity,
  bulk_price, harvest_date, status[available/sold_out/archived], timestamps
- **product_images**: id, product_id FK, image_path, is_primary
- **orders**: id, buyer_id FK, farmer_id FK, order_type[retail/bulk],
  status[pending/confirmed/preparing/ready/delivered/completed/cancelled],
  fulfillment_type[pickup/delivery], total_amount, delivery_address, timestamps
- **order_items**: id, order_id FK, product_id FK, quantity, unit_price, subtotal
- **order_status_history**: id, order_id FK, status, changed_by FK users,
  changed_at, note
- **reviews**: id, order_id FK, reviewer_id FK, farmer_id FK, rating,
  comment, timestamps
- **price_trends**: id, category_id FK, region, recorded_price, recorded_date
- **inventory_logs**: id, product_id FK, change_amount,
  reason[sale/restock/adjustment], created_by FK, timestamps
- **notifications**: id, user_id FK, type, title, body, is_read, timestamps
- **two_factor_codes**: id, user_id FK, code, expires_at, used_at

Relationships:
- 1:1 users <-> farmer_profiles, users <-> buyer_profiles
- 1:N farmer -> products, N:1 products -> categories
- 1:N orders -> order_items, 1:N orders -> order_status_history
- 1:1 reviews <-> completed order (prevents fake reviews)
- Indexes: users.email, products.category_id, products.farmer_id,
  orders.status, price_trends(category_id, recorded_date)

---

## Stack

- **Backend**: Laravel (API-only), Sanctum for auth, `pragmarx/google2fa-laravel`
  or SMS OTP for 2FA
- **Frontend**: React (Vite) + React Router + TanStack Query + Tailwind CSS
  (Forest Green / Harvest Gold theme)
- **Realtime**: Laravel Reverb or Pusher for live order status updates
- **Storage**: S3-compatible filesystem for product photos & verification docs
- **Mobile (future)**: React Native (Expo), reusing the same Laravel API and
  Sanctum tokens; push notifications via Expo Notifications tied to the
  `notifications` table; offline queuing recommended for rural connectivity

---

## Build order recommendation

(Mobile-first — Stitch generated the mobile screens first, so the build
order follows that.)

1. **Laravel API foundation**: migrations, auth + 2FA (Sanctum), base RBAC
   (Farmer / Buyer-Individual / Buyer-Business / Admin)
2. **React Native — AniMarket**: convert existing Stitch mobile screens
   (react-native skill); wire up product listings, browse/search, cart,
   checkout, order placement
3. **React Native — AniManage**: convert AniManage mobile screens; wire up
   stock updates, order queue, status transitions
4. **Notifications**: Expo push notifications tied to new orders/status
   changes (do this once orders are flowing, not before)
5. **React web — Admin panel**: farmer verification, moderation, platform
   analytics (generate fresh web-oriented screens in Stitch for this —
   admin work doesn't fit mobile well)
6. **React web — AniManage dashboard (optional)**: bigger-screen mirror of
   step 3 for farmers/staff who want it; reuses the same API
7. **AniPredict analytics**: price trends, forecasting, "best time to
   sell" — left last since it depends on real order/price data existing
   from steps 2-3 to be useful
