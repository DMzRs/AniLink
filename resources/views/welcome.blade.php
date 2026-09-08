<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>AniLink — Cultivating Connection, Harvesting Fair Trades</title>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">
        <meta name="description" content="AniLink connects smallholder farmers directly to households and businesses — fair prices for harvests, fresh produce for every table.">

        @fonts

        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @else
            <style>
                /* Critical fallback before `npm run build` — brand colors + readable layout */
                body { margin: 0; background: #FAF8F3; color: #1A1A1A; font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }
                a { color: #2E5339; }
                img { vertical-align: middle; }
                .wl-fallback-note { max-width: 640px; margin: 48px auto; padding: 24px; background: #fff; border: 1px solid #E8E2D6; border-radius: 12px; }
            </style>
        @endif
    </head>
    <body class="bg-[#FAF8F3] text-[#1A1A1A] font-sans antialiased min-h-screen flex flex-col">
        @unless (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            <div class="wl-fallback-note">
                <strong>AniLink</strong> — Cultivating Connection, Harvesting Fair Trades.<br /><br />
                The web assets aren’t built yet. Run <code>npm install &amp;&amp; npm run build</code>,
                then refresh this page. Meanwhile: <a href="/manage">AniManage (farmers)</a> · <a href="/admin">Admin console</a>
            </div>
        @endunless

        {{-- ===== Top bar ===== --}}
        <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E8E2D6]">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <a href="/" class="flex items-center gap-3 min-w-0">
                    <img src="/apple-touch-icon-180.png" alt="AniLink logo" class="w-9 h-9 rounded-xl shadow-[0_4px_12px_rgba(46,83,57,0.12)]" />
                    <span class="min-w-0">
                        <span class="block font-semibold leading-tight">AniLink</span>
                        <span class="block text-[11px] leading-tight text-[#8A8A8A] truncate">Cultivating Connection</span>
                    </span>
                </a>
                <nav class="flex items-center gap-2 sm:gap-3 text-sm">
                    <a href="/manage" class="hidden sm:inline-flex h-9 items-center px-3 rounded-full font-medium text-[#2E5339] hover:bg-[#E8F0E9] transition">For farmers</a>
                    <a href="/admin" class="hidden sm:inline-flex h-9 items-center px-3 rounded-full font-medium text-[#5C5C5C] hover:bg-[#FAF8F3] transition">Admin</a>
                    <a href="/manage" class="inline-flex h-10 items-center px-4 rounded-full bg-[#2E5339] text-white font-semibold hover:bg-[#24412D] transition shadow-[0_4px_12px_rgba(46,83,57,0.18)]">Open AniManage</a>
                </nav>
            </div>
        </header>

        <main class="flex-1">
            {{-- ===== Hero ===== --}}
            <section class="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 lg:pt-20 lg:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                <div>
                    <span class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A] text-xs font-semibold">
                        🧺 Farm-to-table marketplace
                    </span>
                    <h1 class="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.15]">
                        Cultivating Connection,<br class="hidden sm:block" />
                        <span class="text-[#2E5339]">Harvesting Fair Trades.</span>
                    </h1>
                    <p class="mt-5 text-[#5C5C5C] leading-7 max-w-[52ch]">
                        <span class="font-medium text-[#1A1A1A]">Ani</span> means harvest. AniLink connects smallholder farmers
                        straight to households and businesses — fair prices for every harvest, fresher produce for every table.
                    </p>

                    <div class="mt-7 flex flex-wrap items-center gap-3">
                        <a href="/manage" class="inline-flex h-12 items-center px-6 rounded-full bg-[#2E5339] text-white font-semibold hover:bg-[#24412D] transition shadow-[0_4px_12px_rgba(46,83,57,0.18)]">
                            Sign in as Farmer
                        </a>
                        <a href="/admin" class="inline-flex h-12 items-center px-6 rounded-full bg-white border border-[#E8E2D6] font-semibold hover:bg-white/60 hover:border-[#2E5339]/30 transition">
                            Admin console
                        </a>
                    </div>

                    {{-- Trust signals — visible, not intrusive --}}
                    <ul class="mt-8 flex flex-wrap gap-2 text-xs font-medium">
                        <li class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-[#E8E2D6] text-[#2E5339]">✓ Verified farmers</li>
                        <li class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-[#E8E2D6] text-[#2E5339]">🔒 2FA-secured accounts</li>
                        <li class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-[#E8E2D6] text-[#2E5339]">📶 Low-bandwidth friendly</li>
                    </ul>
                </div>

                {{-- Market preview — mirrors the mobile app's design language, no heavy images --}}
                <div class="relative max-w-md w-full mx-auto lg:mx-0 lg:justify-self-end">
                    <div class="absolute -top-4 -left-4 w-24 h-24 rounded-[20px] bg-[#E8F0E9] -z-10" aria-hidden="true"></div>
                    <div class="absolute -bottom-5 -right-3 w-28 h-28 rounded-full bg-[#FFF4D6] -z-10" aria-hidden="true"></div>

                    <div class="bg-white rounded-[16px] border border-[#E8E2D6] p-5 shadow-[0_8px_24px_rgba(46,83,57,0.08)]">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Today’s harvest</span>
                            <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59]"><span class="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse"></span> Fresh picks</span>
                        </div>

                        {{-- Product card preview --}}
                        <div class="mt-4 rounded-[12px] border border-[#E8E2D6] p-4 flex gap-4 items-center">
                            <div class="w-16 h-16 rounded-[12px] bg-[#E8F0E9] flex items-center justify-center text-3xl shrink-0" aria-hidden="true">🥬</div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-semibold truncate">Pechay</span>
                                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A] font-semibold whitespace-nowrap">Low stock</span>
                                </div>
                                <div class="text-lg font-semibold text-[#2E5339] leading-tight">₱35.00 <span class="text-xs font-medium text-[#8A8A8A]">/ kg</span></div>
                                <div class="text-xs text-[#8A8A8A] truncate">Lito’s Farm · Brgy. San Isidro ✓ Verified</div>
                            </div>
                            <button type="button" class="w-11 h-11 shrink-0 rounded-full bg-[#2E5339] text-white text-xl font-semibold hover:bg-[#24412D] transition" aria-label="Add to basket">+</button>
                        </div>

                        {{-- Order status chips + stepper preview --}}
                        <div class="mt-4 flex flex-wrap gap-1.5">
                            <span class="px-2.5 py-1 rounded-full border text-xs font-semibold bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]">Pending</span>
                            <span class="px-2.5 py-1 rounded-full border text-xs font-semibold bg-[#E8F0E9] border-[#C5D9C7] text-[#4A7C59]">Confirmed</span>
                            <span class="px-2.5 py-1 rounded-full border text-xs font-semibold bg-[#2E5339] border-[#2E5339] text-white">Ready</span>
                            <span class="px-2.5 py-1 rounded-full border text-xs font-semibold bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]">Cancelled</span>
                        </div>
                        <div class="mt-4 flex items-center gap-3">
                            <div class="flex items-center rounded-full border border-[#E8E2D6] bg-white overflow-hidden h-11 w-[180px]">
                                <span class="w-11 h-full bg-[#FAF8F3] grid place-items-center text-lg font-semibold">−</span>
                                <span class="flex-1 text-center leading-none"><span class="block font-semibold">12</span><span class="block text-[11px] text-[#8A8A8A] -mt-0.5">kg</span></span>
                                <span class="w-11 h-full bg-[#2E5339] text-white grid place-items-center text-lg font-semibold">+</span>
                            </div>
                            <p class="text-xs text-[#8A8A8A] leading-4">One-tap stock steppers —<br />no modals, 44&nbsp;pt touch targets.</p>
                        </div>
                    </div>
                </div>
            </section>

            {{-- ===== What's inside ===== --}}
            <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
                <h2 class="text-xl font-semibold tracking-tight">One cooperative, four tools</h2>
                <p class="text-sm text-[#5C5C5C] mt-1">Everything runs on the same Laravel API — the mobile app in your pocket, the web dashboards at your desk.</p>

                <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
                        <div class="w-10 h-10 rounded-xl bg-[#E8F0E9] grid place-items-center text-xl" aria-hidden="true">🥬</div>
                        <h3 class="mt-3 font-semibold">AniMarket</h3>
                        <p class="mt-1 text-sm text-[#5C5C5C] leading-6">Browse fresh harvests from verified farmers near you, sorted by freshest pick first.</p>
                    </div>
                    <div class="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
                        <div class="w-10 h-10 rounded-xl bg-[#E8F0E9] grid place-items-center text-xl" aria-hidden="true">🧺</div>
                        <h3 class="mt-3 font-semibold">AniManage</h3>
                        <p class="mt-1 text-sm text-[#5C5C5C] leading-6">Farmers track stock with one-tap steppers and advance orders from pending to delivered.</p>
                    </div>
                    <div class="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
                        <div class="w-10 h-10 rounded-xl bg-[#E8F0E9] grid place-items-center text-xl" aria-hidden="true">🛡️</div>
                        <h3 class="mt-3 font-semibold">Trust &amp; safety</h3>
                        <p class="mt-1 text-sm text-[#5C5C5C] leading-6">Admin-verified farmer badges, 2FA-secured accounts, and a full history for every order.</p>
                    </div>
                    <div class="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
                        <div class="w-10 h-10 rounded-xl bg-[#FFF4D6] grid place-items-center text-xl" aria-hidden="true">📈</div>
                        <h3 class="mt-3 font-semibold flex items-center gap-2">AniPredict <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A] font-semibold">Coming soon</span></h3>
                        <p class="mt-1 text-sm text-[#5C5C5C] leading-6">Price trends that show the best window to sell — highlighted in Harvest Gold.</p>
                    </div>
                </div>
            </section>

            {{-- ===== How it works ===== --}}
            <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div class="bg-white rounded-[16px] border border-[#E8E2D6] p-6 sm:p-8 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
                    <h2 class="text-xl font-semibold tracking-tight">From farm to table in three steps</h2>
                    <ol class="mt-6 grid sm:grid-cols-3 gap-6">
                        <li class="flex gap-4">
                            <span class="w-10 h-10 shrink-0 rounded-full bg-[#2E5339] text-white grid place-items-center font-semibold">1</span>
                            <div>
                                <h3 class="font-semibold leading-snug">Farmers list the harvest</h3>
                                <p class="text-sm text-[#5C5C5C] mt-1 leading-6">Name, price, and stock — posted in seconds, even on 3G.</p>
                            </div>
                        </li>
                        <li class="flex gap-4">
                            <span class="w-10 h-10 shrink-0 rounded-full bg-[#4A7C59] text-white grid place-items-center font-semibold">2</span>
                            <div>
                                <h3 class="font-semibold leading-snug">Buyers order retail or bulk</h3>
                                <p class="text-sm text-[#5C5C5C] mt-1 leading-6">Delivery or pickup, grouped per farm — businesses unlock bulk pricing.</p>
                            </div>
                        </li>
                        <li class="flex gap-4">
                            <span class="w-10 h-10 shrink-0 rounded-full bg-[#D4A017] text-[#1A1A1A] grid place-items-center font-semibold">3</span>
                            <div>
                                <h3 class="font-semibold leading-snug">One tap moves each order</h3>
                                <p class="text-sm text-[#5C5C5C] mt-1 leading-6">Pending → confirmed → preparing → ready → delivered, with a notification at every step.</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </section>
        </main>

        {{-- ===== Footer ===== --}}
        <footer class="border-t border-[#E8E2D6] bg-white">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#8A8A8A]">
                <p>© {{ date('Y') }} AniLink Cooperative — Cultivating Connection, Harvesting Fair Trades.</p>
                <nav class="flex items-center gap-4">
                    <a href="/manage" class="hover:text-[#2E5339] transition">AniManage</a>
                    <a href="/admin" class="hover:text-[#2E5339] transition">Admin</a>
                </nav>
            </div>
        </footer>
    </body>
</html>
