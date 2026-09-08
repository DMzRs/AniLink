# AniLink Design System

## Brand Meaning
"Ani" means to harvest, "Link" means connection.
Tagline: **Cultivating Connection, Harvesting Fair Trades.**
Logo motif: hands holding a woven basket, its weave transitioning into
flowing waves — tradition meeting digital connection.

## Colors
- **Forest Green** `#2E5339` — primary. Represents agriculture,
  sustainability, growth. Used for primary buttons, nav, headers.
- **Harvest Gold** `#D4A017` — accent. Represents prosperity, energy,
  optimism. Used for CTAs, highlights, badges, active states.
- **Neutral background**: white `#FFFFFF` or a very light warm-neutral
  `#FAF8F3` — never cream/beige as a dominant tone.
- **Text**: near-black `#1A1A1A` for body copy, never pure black.
- **Status colors** (order states): 
  - Pending: `#D4A017` (gold, muted)
  - Confirmed: `#4A7C59` (soft green)
  - Ready/Delivered: `#2E5339` (forest green, solid)
  - Cancelled: `#B0413E` (muted red, not alarm-red)

## Typography
- Headings: a clean humanist sans (e.g. "Inter" or "Manrope" — but pick
  ONE and use it deliberately, not as a default fallback)
- Body: same family, regular weight
- Avoid system-default look; weight and spacing should feel intentional,
  not auto-generated

## Tone & Personality
- Warm, trustworthy, optimistic — rooted in agriculture, not corporate
- Never cold, never "startup generic"
- Copy should read like it's written for real farmers and households,
  not investors

## UI Principles (non-negotiable)
1. **Zero-friction**: minimal taps to complete any action. Large touch
   targets (min 44x44pt). No unnecessary confirmation steps.
2. **Low-bandwidth first**: lightweight screens, minimal reliance on large
   images, clear loading/skeleton states, works on 3G and older Android
   devices.
3. **Trust signals everywhere**: verified-farmer badges, 2FA indicators,
   secure-payment icons — visible but not intrusive.
4. **Bilingual-ready**: text containers should tolerate both English and
   Filipino without breaking layout (Filipino strings often run longer).
5. **Card-based layouts**: soft shadows, rounded corners (8-12px radius),
   generous whitespace, icon-driven bottom tab navigation
   (Home / Orders / Inventory-Predict / Profile).
6. **No AI-slop defaults**: no purple gradients, no generic Inter-on-white
   with no hierarchy, no unexplained accent stripes. Every visual choice
   should tie back to the Forest Green / Harvest Gold identity.

## Navigation Pattern
Bottom tab bar (mobile): Home, Orders, Inventory/Predict, Profile
Farmer view and Buyer view share the same shell but swap tab contents
based on role.

## Component Notes
- **Product card**: image, name, price/unit, farmer name + verified badge,
  distance/location, quick-add button
- **Order status chip**: pill-shaped, colored per status list above
- **Stock stepper**: large +/- buttons, current count in center, one-tap
  update, no modal required
- **Trend chart (AniPredict)**: simple line/bar, muted gridlines, Harvest
  Gold accent on the "recommended sell window"

## Reference Feel
Think: a well-run local cooperative's app — approachable like a farmers'
market, credible like a bank. Not flashy, not sterile.
