<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FarmerDashboardController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PredictController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PushTokenController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Models\Category;
use App\Models\Notification;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AniLink API Routes - Spec: Laravel API + Sanctum, 2FA OTP, RBAC
|--------------------------------------------------------------------------
*/

// Public auth routes - throttled for brute-force protection (spec: Rate limiting on login)
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');
    Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor'])->middleware('throttle:10,1');
    Route::post('/2fa/resend', [AuthController::class, 'resendTwoFactor'])->middleware('throttle:3,1');
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // 2FA management — reachable with a pending (pre-OTP) token
    Route::post('/2fa/enable', [TwoFactorController::class, 'enable']);
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirmEnable']);
    Route::post('/2fa/disable', [TwoFactorController::class, 'disable']);
    Route::post('/2fa/send', [TwoFactorController::class, 'send']);

    // Everything below requires a token issued after 2FA verification
    Route::middleware('2fa')->group(function () {

        // ── AniMarket product CRUD — Farmer only ──
        Route::middleware('role:farmer')->group(function () {
            Route::post('/products', [ProductController::class, 'store']);
            Route::put('/products/{product}', [ProductController::class, 'update']);
            Route::delete('/products/{product}', [ProductController::class, 'destroy']);
            Route::patch('/products/{product}/stock', [ProductController::class, 'adjustStock']);
            Route::get('/farmer/products', [ProductController::class, 'myProducts']);
            Route::post('/farmer/verification-doc', [AuthController::class, 'uploadVerificationDoc']);
            Route::get('/farmer/dashboard', [FarmerDashboardController::class, 'index']);
            Route::get('/predict/insights', [PredictController::class, 'insights']);
            Route::get('/farmer/quotes', [QuoteController::class, 'farmerIndex']);
            Route::patch('/farmer/quotes/{quote}', [QuoteController::class, 'respond']);
        });

        // ── Orders / Cart / Checkout — Buyer + Farmer shared ──
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
        Route::post('/orders/{order}/review', [ReviewController::class, 'store']);
        Route::post('/reports', [ReportController::class, 'store']);
        Route::post('/cart/validate', [OrderController::class, 'validateCart']);

        // Buyer routes (both individual and business can shop, but business has bulk quotes)
        Route::middleware('role:buyer_individual,buyer_business')->group(function () {
            Route::get('/buyer/market', fn () => response()->json(['message' => 'AniMarket browse']));
            Route::get('/buyer/orders', fn () => response()->json(['message' => 'Buyer orders']));
        });

        Route::middleware('role:buyer_business')->group(function () {
            Route::get('/quotes', [QuoteController::class, 'index']);
            Route::post('/quotes', [QuoteController::class, 'store']);
            Route::patch('/quotes/{quote}/accept', [QuoteController::class, 'accept']);
            Route::patch('/quotes/{quote}/withdraw', [QuoteController::class, 'withdraw']);
        });

        // Admin routes (verification, moderation, analytics) — real controllers per spec
        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/verifications', [AdminController::class, 'verifications']);
            Route::get('/admin/verifications/{farmerProfile}/document', [AdminController::class, 'document']);
            Route::post('/admin/verifications/{farmerProfile}/decision', [AdminController::class, 'decideVerification']);
            Route::get('/admin/users', [AdminController::class, 'users']);
            Route::patch('/admin/users/{user}', [AdminController::class, 'moderateUser']);
            Route::get('/admin/listings', [AdminController::class, 'listings']);
            Route::patch('/admin/listings/{product}', [AdminController::class, 'moderateListing']);
            Route::get('/admin/analytics', [AdminController::class, 'analytics']);
            Route::get('/admin/orders', [AdminController::class, 'orders']);
            Route::get('/admin/reports', [AdminController::class, 'reports']);
            Route::patch('/admin/reports/{report}', [AdminController::class, 'handleReport']);
        });

        // Expo push token — tied to notifications table
        Route::post('/push-token', [PushTokenController::class, 'store']);
        Route::delete('/push-token', [PushTokenController::class, 'destroy']);

        // Notifications — tied to push
        Route::get('/notifications', function (Request $request) {
            return response()->json(['notifications' => $request->user()->notifications()->latest()->limit(20)->get()]);
        });
        Route::patch('/notifications/{notification}/read', function (Request $request, Notification $notification) {
            if ($notification->user_id !== $request->user()->id) {
                abort(403);
            }
            $notification->update(['is_read' => true]);

            return response()->json($notification);
        });
        Route::get('/notifications/unread-count', function (Request $request) {
            return response()->json(['count' => $request->user()->notifications()->where('is_read', false)->count()]);
        });
    });
});

// ── AniMarket public discovery (no auth needed for browsing) ──
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories', function () {
    return response()->json(Category::orderBy('name')->get(['id', 'name', 'slug']));
});
Route::get('/farmers/{farmer}/reviews', [ReviewController::class, 'forFarmer']);
Route::get('/regions', function () {
    return response()->json(Region::orderBy('name')->get(['id', 'name']));
});

// Health check for API
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'AniLink API', 'version' => '1.0']));
