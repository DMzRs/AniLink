# AniLink — Full Structure Documentation (for AI / next model)

> **Purpose:** Hyper-local agricultural marketplace (Tagalog “Ani” = harvest) connecting smallholder farmers → households & businesses. Tagline: *Cultivating Connection, Harvesting Fair Trades.* Mobile-first (Stitch screens), Laravel API + React Native (Expo) + React web admin. This doc lets another model onboard without reading every file.

---

## 1. Monorepo Layout

```
AniLink/                          # git root (single repo, mobile is subfolder not submodule)
├── ANILINK_SPEC.md               # source of truth — modules, DB schema, stack
├── DESIGN.md                     # brand system — colors, typography, principles
├── documentation.md              # this file
├── README.md                     # quick start for humans
├── .env                          # DB_CONNECTION=mysql DB_DATABASE=anilink root/no pass (local)
├── app/                          # Laravel app
│   ├── Http/Controllers/Api/     # Auth, Product, Order, Admin, PushToken, TwoFactor
│   ├── Http/Middleware/          # RoleMiddleware, EnsureTwoFactorVerified
│   ├── Models/                   # 13 Eloquent models
│   ├── Services/ExpoPushService.php
│   └── Providers/
├── bootstrap/app.php             # withRouting(web,api) + middleware aliases role,2fa + statefulApi
├── config/{auth,sanctum,cors}    # cors paths api/*, sanctum stateful
├── database/migrations/ 18 files # see §3 + 031250 personal_access_tokens + 035847 expo_push_token
├── database/seeders/AniMarketSeeder.php # categories, farmers, buyers, admin, products, orders
├── routes/{api.php, web.php}     # api/* + web /admin /manage SPA fallbacks
├── resources/
│   ├── css/app.css               # @import tailwindcss + @theme --font-sans Poppins --color-forest/harvest
│   ├── views/{welcome,admin,manage}.blade.php  # Vite entry points, title AniLink, favicons
│   └── js/
│       ├── app.js                # empty (Laravel default)
│       ├── shared/ui.jsx         # shared SPA primitives: Icon (SVG set), PageHeader, Skeleton/CardSkeleton, EmptyState, Chip + chipTone
│       ├── admin.jsx + admin/    # Admin SPA (Vite entry)
│       └── manage.jsx + manage/  # Farmer AniManage desktop SPA (Vite entry)
├── vite.config.js                # laravel-vite-plugin input [app.css, app.js, admin.jsx, manage.jsx] + bunny Poppins 400/500/600/700 + tailwindcss
├── public/{favicon-32.png,favicon-16.png,apple-touch-icon-180.png,favicon.ico}
├── docs/branding/anilink_full_logo_transparent.png
└── mobile/                       # Expo SDK 57
    ├── app.json                  # name AniLink slug anilink icon ./assets/anilink_icon_512.png web.favicon same
    ├── assets/{anilink_icon_512.png,icon.png,favicon.png,android-*}
    ├── App.js                    # Poppins fonts + SafeArea + Auth/Cart + Navigation + PushBootstrap
    ├── src/
    │   ├── theme/{colors,spacing,typography} # DESIGN.md tokens
    │   ├── data/mockProducts.js  # 6 mock + 5 categories (offline fallback)
    │   ├── api/{client,config,products,orders,inventory,notifications}
    │   ├── context/{AuthContext,CartContext}
    │   ├── hooks/usePushNotifications.js
    │   ├── components/{ProductCard,StatusChip,InventoryStepper,QuantityStepper,CategoryChips,SearchBar,NotificationBell,TrustBadgeRow}
    │   ├── screens/{Feed,ProductDetail,Cart,Checkout,Inventory,FarmerOrders,BuyerOrders,Notifications,ProfilePlaceholder,PredictPlaceholder}
    │   └── navigation/AppNavigator.js # RootStack(Tabs→Notifications) + Tabs(Home→FeedStack, Orders→role, Manage→Inventory|Predict, Profile)
    └── package.json
```

Git: `mobile/.git` was removed — `git add .` at root stages `mobile/src/**` as normal files (not embedded repo). Root `.gitignore` covers `vendor`, `mobile/node_modules`, `mobile/.expo`, `database/*.sqlite`, `storage/logs`.

---

## 2. Stack & Versions

- **Backend:** Laravel 13.30.1, PHP 8.5.2, `laravel/sanctum 4.3.3`, `laravel/tinker`, MySQL 8.4.3 (Laragon) DB `anilink` / SQLite fallback, `tailwindcss 4.0.0 @tailwindcss/vite`, `vite 8.2.2`, `bunny` Poppins.
- **Mobile:** Expo 57.0.20, React 19.2.3, RN 0.86.3, `@react-navigation/native|native-stack|bottom-tabs 7.x`, `react-native-screens 4.26`, `react-native-safe-area-context 5.7`, `@expo-google-fonts/poppins`, `expo-notifications`, `expo-device`, `expo-constants`, `react-dom 19.2.3 / react-native-web 0.21.2` for web.
- **Web:** React 19 + `react-router-dom` + `@tanstack/react-query`, Tailwind 4 (web `npm install` at root, mobile `npm install` in `mobile/`).

Font: **Poppins everywhere** (`vite.config.js` bunny Poppins + `app.css --font-sans Poppins` + mobile `App.js` `Poppins_400Regular...700Bold` + `typography.js` `Poppins_*` + `Layout.jsx` `font-sans`). Previously Inter — fully replaced.

Colors: `Forest Green #2E5339` primary, `Harvest Gold #D4A017` accent, `Warm #FAF8F3`, `Text #1A1A1A`, status `pending FFF4D6/8A6A0A`, `confirmed/preparing E8F0E9/4A7C59`, `ready/delivered/completed 2E5339 white`, `cancelled FDEDEC/B0413E`.

---

## 3. Database Schema (18 migrations)

All under `database/migrations/` — ordered by prefix `0001_01_01_*` then Expo.

- **users** `id, name, email unique index, phone, password hashed, role[farmer/buyer_individual/buyer_business/admin] default buyer_individual, two_factor_secret nullable, two_factor_enabled bool default false, is_verified bool, expo_push_token nullable, push_platform nullable, email_verified_at, rememberToken, timestamps` — indexes `users_email_index` + unique.
- **farmer_profiles** `id, user_id FK unique cascade, farm_name, barangay, municipality, province, verification_status[pending/approved/rejected] default pending, verification_doc_path, bio, timestamps` — 1:1 users.
- **buyer_profiles** `id, user_id FK unique cascade, buyer_type[individual/business] default individual, business_permit_path, delivery_address, timestamps`.
- **categories** `id, name unique, slug unique, timestamps`.
- **products** `id, farmer_id FK users cascade index, category_id FK categories cascade index, name, description nullable, unit_type[kg/sack/piece/bundle/bag/box], price_per_unit decimal10,2, available_quantity decimal10,2 default 0, min_bulk_quantity nullable, bulk_price nullable, harvest_date date nullable, status[available/sold_out/archived] default available, timestamps` — indexes `category_id, farmer_id`.
- **product_images** `id, product_id FK cascade, image_path, is_primary bool default false, timestamps`.
- **orders** `id, buyer_id FK users cascade index, farmer_id FK users cascade index, order_type[retail/bulk] default retail, status[pending/confirmed/preparing/ready/delivered/completed/cancelled] default pending index, fulfillment_type[pickup/delivery] default delivery, total_amount decimal12,2 default 0, delivery_address nullable, timestamps`.
- **order_items** `id, order_id FK cascade, product_id FK cascade, quantity decimal10,2, unit_price 10,2, subtotal 12,2, timestamps`.
- **order_status_history** `id, order_id FK cascade, status string, changed_by FK users nullable nullOnDelete, changed_at timestamp useCurrent, note nullable, timestamps`.
- **reviews** `id, order_id FK cascade unique (1:1 completed order), reviewer_id FK users cascade, farmer_id FK users cascade, rating tinyint, comment nullable, timestamps` — index `farmer_id,rating`.
- **price_trends** `id, category_id FK cascade, region string, recorded_price 10,2, recorded_date date, timestamps` — index `category_id,recorded_date`.
- **inventory_logs** `id, product_id FK cascade, change_amount decimal10,2, reason[sale/restock/adjustment] default adjustment, created_by FK users nullable nullOnDelete, timestamps`.
- **notifications** `id, user_id FK cascade index(user_id,is_read), type string, title string, body nullable, is_read bool default false, timestamps`.
- **two_factor_codes** `id, user_id FK cascade, code string10, expires_at timestamp, used_at nullable, timestamps` — index `user_id,code`.
- Plus Laravel defaults `cache`, `jobs`, `sessions`, `password_reset_tokens`, `personal_access_tokens` (Sanctum).

**Relationships:** `User hasOne FarmerProfile/BuyerProfile, hasMany Products(farmer_id), buyerOrders/farmerOrders, notifications, twoFactorCodes`; `Product belongsTo Farmer(User) + Category, hasMany Images/OrderItems/InventoryLogs`; `Order belongsTo Buyer/Farmer, hasMany Items + StatusHistory, hasOne Review`; `OrderItem belongsTo Order+Product`.

---

## 4. Laravel Backend

### Models `app/Models/`
`User` (HasApiTokens, HasFactory, Notifiable) constants `ROLE_*`, `fillable` includes `expo_push_token`, `casts hashed password, bool 2fa/is_verified`, helpers `hasRole(...), isFarmer(), isAdmin(), requiresTwoFactor()`; others `FarmerProfile, BuyerProfile, Category, Product (casts decimal/date), ProductImage, Order, OrderItem, OrderStatusHistory (table order_status_history), Review, PriceTrend, InventoryLog, Notification, TwoFactorCode` with relations as above.

### Middleware `app/Http/Middleware/`
- `RoleMiddleware handle(Request, Closure, ...roles)` — normalizes comma-separated roles, returns `401`/`403` JSON with `your_role`.
- `EnsureTwoFactorVerified` — checks `currentAccessToken()->can('2fa:verified')` and farmer `two_factor_enabled` enforcement.
- `bootstrap/app.php` aliases `role` + `2fa`, `statefulApi()`, routing `web, api, commands, health`, JSON exception for `api/*`.

### Controllers `app/Http/Controllers/Api/`
- **AuthController** `register` validates `name,email,phone,password confirmed,role[4],farm_name/barangay/municipality/province/bio,delivery_address`, creates `User` + `FarmerProfile` (pending) or `BuyerProfile`, returns `*` token + `requires_2fa_setup` for farmer; `login` checks hash, if `two_factor_enabled` creates `2fa-pending` token + `generateAndSendOtp` (6-digit `expires 5min`, `Log::info` mock for Semaphore) returns `two_factor_required true + pending_token + code_hint (local)`, elseif `isFarmer && !enabled` returns `two_factor_setup_required true` else `* 2fa:verified` token; `verifyTwoFactor` finds `TwoFactorCode whereNull used_at expires_at>now`, marks `used_at`, deletes `2fa-pending` tokens, issues `* 2fa:verified`; `resendTwoFactor`, `logout` deletes current token, `me` loads profiles.
- **TwoFactorController** `enable/confirmEnable/disable/send` — farmers cannot disable.
- **ProductController** `index` validates `search,category,price_min/max,province/municipality/barangay,verified_only,sort[fresh/distance/price_low/price_high],status,per_page`, builds query with `whereHas farmerProfile`, sorting (`fresh harvest_date desc`, `distance join farmer_profiles municipality asc`, `price`), paginates `20`, transforms via `transformProduct` (farmer.verified = approved, `boxShadow` URL via `Storage::disk('public')`, `distance_km null` placeholder); `show`, `store` validates `category_id,name,unit_type[kg/sack/piece/bundle/bag/box],price_per_unit,available_quantity,min_bulk/bulk_price,harvest_date,status,images[5×5MB]`, creates product + `ProductImage` + `InventoryLog restock`; `update/adjustStock/destroy(archived)` check `authorizeOwner`, `myProducts`.
- **OrderController** `store` validates `items[{product_id,quantity}],order_type,fulfillment_type,delivery_address required_if delivery`, checks `buyer role`, bulk only `buyer_business`, groups by `farmer_id` (one order per farmer), checks `status available` + `available_quantity`, computes `unitPrice = bulk_price if bulk && qty>=min`, adds `deliveryFee 45 if delivery`, `DB::transaction` creates `Order` + `OrderItem` + deducts `available_quantity` + `InventoryLog sale` + `OrderStatusHistory pending` + 2 `Notification new_order/order_placed` + `ExpoPushService::sendForNotification` for both; `index/show/validateCart/updateStatus` with FSM `pending[confirmed,cancelled], confirmed[preparing,cancelled], preparing[ready,cancelled], ready[delivered,completed,cancelled], delivered[completed]` + buyer can `cancelled` if pending + stock restore on cancel + `notifyStatus` creates 2 `order_update` + push.
- **AdminController** `verifications` paginates `FarmerProfile where verification_status`, `decideVerification` updates status + `user.is_verified` + `Notification verification_approved/rejected` + push; `users` paginates with `farmerProfile,buyerProfile`; `moderateUser {is_verified,role}`; `listings` products paginated with transform; `moderateListing {status}`; `analytics` aggregates `gmv, total_orders, active_farmers, pending_verifications, total/available products, buyers, orders_by_day 7d, by_status, top_farmers 5, gmv_by_category`; `orders`.
- **PushTokenController** `store validates ExponentPushToken[...]` + `platform`, updates `user.expo_push_token`.

### Service `app/Services/ExpoPushService.php`
`sendForNotification(Notification)` — skips if no token, validates `ExponentPushToken`, maps `type→channelId orders/default`, payload `{to,title,body,data{notification_id,type},sound,priority,channelId}`, `Http::timeout(5)->post('https://exp.host/--/api/v2/push/send')`, on `DeviceNotRegistered` clears token, logs.

### Routes
- **api.php** public `POST /register, /login, /2fa/*` throttled, `GET /products, /products/{product}, /categories, /health`; `auth:sanctum` group: `POST /logout, GET /me`, `POST /2fa/*`, `role:farmer` `POST /products, PUT/DELETE/PATCH /products/{product}, PATCH /products/{product}/stock, GET /farmer/products`, `POST /orders, GET /orders, GET /orders/{order}, PATCH /orders/{order}/status, POST /cart/validate`, `role:buyer*` stubs, `role:admin` `GET /admin/verifications|users|listings|analytics|orders` + `POST /admin/verifications/{id}/decision` + `PATCH ...`, `POST/DELETE /push-token`, `GET /notifications, PATCH .../read, GET .../unread-count`.
- **web.php** `GET /` → `welcome`, `GET /admin{any} → admin`, `GET /manage{any} → manage`.

### Config
`config/cors.php` `paths api/*, sanctum/csrf-cookie` `allowed_* *`; `config/sanctum.php` published; `bootstrap/app.php` handles stateful API.

### Seeder `AniMarketSeeder.php`
Categories 5, admin `admin@anilink.test / password123`, farmers `lito@anilink.test (approved), nena@anilink.test (approved), rodel@anilink.test (approved), jun.pending@ (pending), elena.pending@ (pending), boy.rejected@ (rejected)`, buyers `buyer@anilink.test (individual), biz@anilink.test (business)`, products 6 + 1 archived `Pechay overpriced 350`, 7 orders over 7 days varied statuses for analytics.

---

## 5. Mobile Expo (`mobile/`)

**App.js** `useFonts Poppins_400Regular/500Medium/600SemiBold/700Bold` from `@expo-google-fonts/poppins` (was Inter), `SafeAreaProvider > AuthProvider > CartProvider > NavigationContainer > PushBootstrap(usePushNotifications) > AppNavigator + StatusBar`.

**Theme** `src/theme/colors.js` Forest etc + `spacing.js shadow boxShadow 0px 4px 12px rgba(46,83,57,0.08)` (no `shadowColor`), `typography.js` `Poppins_*`.

**Data** `mockProducts.js` categories 5 + 6 products with `farmer.verified/distance_km` (offline fallback).

**API** `src/api/config.js` `API_URL = EXPO_PUBLIC_API_URL || http://localhost:8000/api` (Android emulator `10.0.2.2`), `client.js` `api.request` with `Bearer token` stored via `setAuthToken`, `products.js getCategories/getProducts(qs)/getProduct`, `orders.js createOrder/getOrders`, `inventory.js getFarmerProducts/adjustStock/updateProduct`, `notifications.js registerPushToken/getNotifications`.

**Context** `AuthContext login` handles `two_factor_required` auto `code_hint` verify, stores token+user; `CartContext` `items [{product,qty}]`, `fulfillment delivery|pickup`, `orderType retail|bulk`, `unitPriceFor` bulk logic, `subtotal, deliveryFee 45, total, count`, `add/updateQty/remove`.

**Hooks** `usePushNotifications.js` `setNotificationHandler shouldShowAlert/sound/badge`, `createAndroidChannels orders/high`, register on `token+user` change: if `!Device.isDevice` mock token, else `getPermissionsAsync → requestPermissionsAsync`, `getExpoPushTokenAsync({projectId})` fallback mock, `POST /push-token`, listeners only if `Platform.OS !== web && Device.isDevice` (avoids web warning), logs foreground/tap.

**Components** `ProductCard` (image placeholder, `categoryLabel = category.name if object`, lowStock pill, bulk ribbon `harvestGoldLight`, farmer row verified badge, `★ rating`, `+ Add` 44pt `forestGreen`), `StatusChip` pill per `pending #FFF4D6`, `confirmed #E8F0E9/#4A7C59`, `ready #2E5339`, `cancelled #FDEDEC`, `QuantityStepper/InventoryStepper` 44pt `− FAFAF3 / + forestGreen` + `center value+unit`, `SearchBar`, `CategoryChips`, `NotificationBell` polls `unread-count` 15s + `useFocusEffect`, `TrustBadgeRow`.

**Screens** `FeedScreen` header `Deliver to` + `NotificationBell` + cart `🧺` badge, `SearchBar`, `CategoryChips`, sort `fresh/distance/price_low/price_high`, filter panel `verifiedOnly + Under ₱100`, `FlatList numColumns 2` `ProductCard`, pull `RefreshControl`, offline banner, floating `cartBar forestGreen` `View basket`; `ProductDetailScreen` hero `forestGreenLight` placeholder, bulk toggle `Retail/Bulk`, `QuantityStepper`, farmer card `avatar + verified + TrustBadgeRow`, sticky CTA `Add to basket`; `CartScreen` toggle `retail/bulk` + `delivery/pickup`, stepper `compact`, summary `subtotal/delivery/total`; `CheckoutScreen` order type badges, address `TextInput` or pickup box, `placeOrder` auto-login `buyer@anilink.test` if no token, `createOrder` or offline queued `Alert`; `InventoryScreen` header `AniManage Inventory` + bell, `SummaryCard daily/weekly/pending`, low-stock alerts `+10`, list `thumb + StatusChip + StockStepper InventoryStepper + Mark sold out`; `FarmerOrdersScreen` filter chips `all/pending/...`, cards `Order# + StatusChip`, `itemsBox neutralBg`, `Confirm/Prepare/Ready/Deliver` + `Cancel` → `PATCH /orders/:id/status`; `BuyerOrdersScreen`, `NotificationsScreen` list `GET /notifications` + `markRead`, `ProfilePlaceholder` role switch `Sign in as Farmer/Buyer/Biz` + sign out; `PredictPlaceholder/OrdersPlaceholder`.

**Navigation** `AppNavigator.js` `Stack HomeStack(Feed→ProductDetail→Cart→Checkout)` + `RootStack(Tabs → Notifications)` + `Tabs` `HomeTab, OrdersTab(OrdersRoute → FarmerOrders/BuyerOrders by role), ManageTab(ManageRoute → Inventory if farmer else Predict), ProfileTab` — `TabIcon` `⌂/≡/▦|◈/○` active `forestGreen`.

**app.json** `name AniLink slug anilink icon ./assets/anilink_icon_512.png (was icon.png), web.favicon same, android.package com.anilink.mobile, plugins expo-notifications {icon same, color #2E5339}`.

**Build:** `npx expo export --platform web --dev --clear` verified `686 modules` (was 686 → Poppins 686), `public/build` not used; web favicon via `public/favicon-*.png` for Laravel, mobile via `assets`.

---

## 6. Web Admin & Manage SPAs (`resources/js/`)

**Vite** `vite.config.js` `input [app.css, app.js, admin.jsx, manage.jsx]` + `bunny Poppins 400/500/600/700` + `tailwindcss` plugin, watcher ignores `storage/framework/views`.

**Blade** `admin.blade.php` + `manage.blade.php` `title AniLink` + favicons `<link 32/16/apple-touch>` + `@vite([app.css, admin.jsx])` / `manage.jsx`, `body font-sans` + `#admin-root / #manage-root`. `welcome.blade.php` is a branded AniLink landing page (hero + tagline, product-card/status-chip/stepper preview, "four tools" cards incl. AniPredict coming-soon, 3-step how-it-works, footer) — no Laravel default content; graceful no-build fallback note.

**Admin** `resources/js/admin/`
- `App.jsx` `QueryClient + AuthProvider + BrowserRouter basename /admin` + `RequireAdmin` (token+role admin else redirect `/login` or `Admin only` message)
- `lib/api.js` `apiFetch` with Bearer `anilink_admin_token`, `qs()` helper drops undefined/empty params before `URLSearchParams` (fixes literal `undefined` filters), endpoints `login/me/verifications/decide/listings/moderateListing/users/moderateUser/analytics/orders`
- `lib/auth.jsx` login handles `code_hint` 2FA auto
- `components/Layout.jsx` `w-[260px] bg-[#2E5339] text-white` sidebar: favicon logo img + `AniLink / Admin console`, tagline, nav `Analytics/Verifications/Listings/Users` with SVG icons (active `bg-white text-[#2E5339]`), user card + Harvest Gold `Sign out`, footer link to `/manage`; header shows date + Live dot (no dev/API copy)
- `pages/Login.jsx` seeded `admin@anilink.test / password123`, brand accents + logo img
- `pages/Analytics.jsx` KPI 4 cards `GMV/active_farmers/available/Orders by status` (now pill chips `pending #FFF4D6`, `confirmed #E8F0E9`, `ready #2E5339`, `cancelled #FDEDEC` sorted flow), 7-day GMV bars (peak `bg-[#D4A017] ring-[#FFF4D6]`), `GMV by category` bars, `Top farmers`, `AniPredict note` harvestGold
- `pages/Verifications.jsx` filter `pending/approved/rejected`, note input, cards `avatar + name/email + statusTone` + `farm_name · barangay` + `Approve/Reject` → `POST /decision`
- `pages/Listings.jsx` search + status filter, table `Listing|Farmer|Price|Stock|Status|Actions` → `Archive/Restore`
- `pages/Users.jsx` role filter, table `User|Role|Location|Verified|Verify toggle`

**Manage (Farmer desktop)** `resources/js/manage/`
- Mirrors admin but farmer role `RequireFarmer` (farmer|admin); `lib/api.js` has the same `qs()` undefined-param guard
- `components/Layout.jsx` `w-[280px] bg-[#2E5339]` favicon logo + `AniManage / AniLink for farmers` + `✓ Verified farm / ○ Verification pending` pill + `🔒 2FA on` + farm location, nav `Inventory / Orders` (SVG icons, active white card w/ gold icon disc), mobile-sync tip card, footer tagline
- `pages/Login.jsx` `lito@anilink.test / nena@anilink.test`
- `pages/Inventory.jsx` desktop table (not mobile card) — sales summary 3 cards daily/weekly/low-stock alerts, low-stock banner `+10`, table `Product|Category·Price|Stock pill|Stepper Inventory (StockStepper) 44pt|Actions Mark sold out/Restock` → `GET /farmer/products + PATCH /products/:id/stock|PUT`
- `pages/Orders.jsx` filter chips `all/pending/...`, cards `Order# + StatusChip bg colors, buyer, itemsBox neutralBg, total` + `Confirm→Prepare→Ready→Deliver→Complete + Cancel` → `PATCH /orders/:id/status`
- Uses same `Poppins` theme, `font-sans`, `rounded-[12px] border-[#E8E2D6]`.

- All admin/manage pages use `resources/js/shared/ui.jsx` — `PageHeader` (also sets `document.title`), `Chip` + `chipTone` status pills per DESIGN.md colors, `Skeleton`/`CardSkeleton` loading states, `EmptyState`, stroke-SVG `Icon` set. UI copy is user-facing (no hex codes / API paths / dev annotations in visible text).

**Build** `npm run dev` HMR or `npm run build` → `public/build/admin-*.js 26k, manage-*.js 23k, useMutation-*.js 264k`.

---

## 7. Design System (`DESIGN.md`)

- **Colors:** Forest Green `#2E5339` primary (buttons/nav/headers/Ready), Harvest Gold `#D4A017` accent (CTAs/badges/Pending), `forest-soft #4A7C59` Confirmed, `forest-light #E8F0E9`, `harvest-light #FFF4D6`, `warm #FAF8F3`, `white #FFFFFF`, `text #1A1A1A`, `cancel #B0413E`.
- **Typography:** Headings/body single humanist sans **Poppins** (400/500/600/700) via bunny + expo-google-fonts, intentional weight/spacing, bilingual-ready containers.
- **Principles:** Zero-friction 44pt, low-bandwidth lightweight placeholder images not heavy, trust signals verified/2FA, card `rounded 8-12px shadow 0_4px_12px rgba(46,83,57,0.06)`, bottom tab icon-driven, no purple gradients.
- **Components:** `Product card` image/name/price/farmer+verified/distance/quick-add, `Status chip` pill colored per status, `Stock stepper` large +/- center count one-tap no modal, `Trend chart` muted gridlines harvest gold window.
- **Feel:** Cooperative app — farmers market approachable, bank credible.

All web + mobile now use `font-sans` → `Poppins`.

---

## 8. API Endpoint Map (full)

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| POST | /api/register | no | — | `{name,email,phone,password c,role,farm_name,barangay...}` → `*` token |
| POST | /api/login | no | — | → `token` or `pending_token+code_hint` if 2FA |
| POST | /api/2fa/verify | no/pending | — | `{code,email?}` → verified token |
| POST | /api/2fa/resend | no | — | `email` |
| POST | /api/push-token | yes | any | `{expo_push_token,platform}` |
| DELETE | /api/push-token | yes | any | clear |
| GET | /api/me | yes | any | user+profiles |
| POST | /api/2fa/enable|confirm|disable|send | yes | any | farmer cannot disable |
| GET | /api/products | no | — | discovery `search,category,price_min/max,province/municipality/barangay,verified_only,sort,per_page` |
| GET | /api/products/{product} | no | — | detail |
| POST | /api/products | yes | farmer | CRUD |
| PUT | /api/products/{product} | yes | farmer | update |
| DELETE | /api/products/{product} | yes | farmer | archived |
| PATCH | /api/products/{product}/stock | yes | farmer | `{change_amount,reason}` |
| GET | /api/farmer/products | yes | farmer | my listings |
| POST | /api/orders | yes | buyer | `items[{product_id,quantity}],order_type,fulfillment_type,delivery_address` grouped by farmer |
| GET | /api/orders | yes | buyer/farmer/admin | scoped list |
| GET | /api/orders/{order} | yes | owner/admin | detail + history |
| PATCH | /api/orders/{order}/status | yes | farmer/admin or buyer cancel pending | FSM |
| POST | /api/cart/validate | yes | buyer | pre-check |
| GET | /api/admin/verifications | yes | admin | pending etc |
| POST | /api/admin/verifications/{id}/decision | yes | admin | `{status,note}` |
| GET | /api/admin/users | yes | admin | |
| PATCH | /api/admin/users/{user} | yes | admin | |
| GET | /api/admin/listings | yes | admin | |
| PATCH | /api/admin/listings/{product} | yes | admin | |
| GET | /api/admin/analytics | yes | admin | GMV etc |
| GET | /api/admin/orders | yes | admin | |
| GET | /api/notifications | yes | any | 20 latest |
| PATCH | /api/notifications/{id}/read | yes | owner | |
| GET | /api/notifications/unread-count | yes | any | badge |

Web SPA routes: `GET /admin{any} → admin.blade`, `GET /manage{any} → manage.blade`, `GET / → welcome`.

---

## 9. Flows

- **Verification:** `POST /register role farmer → FarmerProfile pending → Farmer uploads doc → Admin Verifications Approve/Reject → Notification verification_approved → ExpoPush → farmer sees badge`.
- **Listing:** `POST /products` (farmer, category) → `status available` → appears in `GET /products` feed (sorted harvest_date) → `Inventory low-stock alerts if ≤5`.
- **Retail vs Bulk:** `product min_bulk_quantity/bulk_price` + `order_type retail|bulk` + `PATCH /products/:id` → Bulk: `business buyer if qty>=min → unit_price bulk_price else price_per_unit` + buyer Business sees `Bulk ribbon`.
- **Cart→Checkout:** Mobile `CartContext` local cart → `Checkout delivery/pickup + retail/bulk → POST /orders` grouped by farmer → `Order pending` + `OrderItem` + `InventoryLog sale` + stock deduct + `Notification`×2 + push.
- **Order FSM:** `pending→confirmed→preparing→ready→delivered→completed` (farmer advances one-tap, buyer can `cancelled` if pending), each transition `OrderStatusHistory + Notification order_update + push + InventoryLog on cancel restore`.
- **Notifications:** All transitions write `notifications` row → `ExpoPushService` tries push, log on fail, mobile polling `NotificationBell 15s` + foreground `addNotificationReceivedListener` shows banner.

---

## 10. Setup & Run

```sh
# Backend
composer install
cp .env.example .env   # APP_URL http://localhost:8000, DB_CONNECTION mysql DB_DATABASE=anilink root no pass (or sqlite)
php artisan key:generate
# create MySQL DB anilink if MySQL: mysql -u root -e "CREATE DATABASE anilink"
php artisan migrate:fresh --seed
php artisan serve      # :8000

# Web (admin+manage)
npm install
npm run dev            # Vite HMR for admin.jsx + manage.jsx (Poppins)
# or npm run build -> public/build

# Mobile
cd mobile
npm install
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api for Android emulator, else localhost
npx expo start --clear   # web: --web --clear
```

Visit: `http://localhost:8000` (welcome), `/admin` (admin@anilink.test), `/manage` (lito@anilink.test), Expo Go scan QR.

---

## 11. Branding Assets

- `public/favicon-32.png, favicon-16.png, apple-touch-icon-180.png, favicon.ico` (7k/6k/40k) linked in `admin.blade` + `welcome.blade` + `manage.blade` `title AniLink`.
- `mobile/assets/anilink_icon_512.png` (185k) set as `app.json icon + web.favicon + expo-notifications icon`.
- `docs/branding/anilink_full_logo_transparent.png` (853k) logo motif hands basket → waves.

---

## 12. Git & Where to Edit

- **Single repo root `AniLink/.git`** — `mobile/.git` removed (was embedded repo warning). `git add .` stages `mobile/src` as normal files.
- **Root `.gitignore`** covers `vendor, mobile/node_modules, mobile/.expo, database/*.sqlite, storage/logs`, `mobile/.gitignore` kept for standalone clone.
- **Where to edit:** New farmer feature → `app/Models` + `ProductController` + `mobile/src/screens/InventoryScreen` + `resources/js/manage/pages/Inventory`; new admin metric → `AdminController@analytics` + `admin/pages/Analytics.jsx`; new status → update `Product status enum` + `OrderController allowed` + `StatusChip` + `DESIGN.md` colors.

---

## 13. How to Extend (template for next model)

1. Read `ANILINK_SPEC.md` build order: API foundation → AniMarket → AniManage → Notifications → Admin → Manage dashboard → AniPredict last.
2. Add migration → update `User`/`Product` model → add `Controller` method → add `routes/api.php` with `role:` middleware → seed via `AniMarketSeeder`.
3. Mobile: add `src/api/*.js` → `src/screens/*.js` → `AppNavigator.js` tab/stack → reuse `colors/typography` + `InventoryStepper/StatusChip`.
4. Web: add `resources/js/admin|manage/pages/*.jsx` → `App.jsx` route → `vite.config.js` entry already includes both.
5. Always `php artisan migrate --seed` + `npm run build` + `npx expo export --platform web --dev --clear` verify `686 modules`.

---

*End — this doc is the map. For humans see `README.md` quick start, for designers see `DESIGN.md`, for product see `ANILINK_SPEC.md`.*
