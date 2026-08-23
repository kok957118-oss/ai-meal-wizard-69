# Finish MealMate 2.0 — Complete Production Pass

## Context (verified this session)

- The remix gave a **fresh, empty database**: 0 recipes, 0 challenges, 0 feature flags, 0 premium features, 0 restaurants, 0 profiles.
- The XP engine (`xp.server.ts`) is complete but **dead code** — `awardXpFor`/`touchStreak` are never called, and no UI reads `user_stats`.
- Bottom nav is still the old 6-tab layout; no floating AI companion, no mascot, no logo-color palette.
- RevenueCat client SDK is not wired (only the secret key exists; no public key was provided).
- TypeScript currently passes with zero errors.

## Work items

### 1. Seed the database (single migration, literal INSERTs)

Per platform rules, first-screen demo data must live in a migration — not scripts or server functions.

- **Recipes**: ~18 curated recipes as literal INSERTs (South African + global mix: pap & chakalaka, kota, bobotie, butter chicken, jollof, etc.) with full ingredients, steps, nutrition, diet tags, and images.
- **Challenges**: weekly + monthly rows (e.g. "Cook 3 recipes this week", "Complete 2 grocery lists") matching the XP engine's action names.
- **Feature flags**: `ai_coach`, `personalized_planner`, `visual_mode`, `marketplace` — enabled, 100% rollout.
- **Premium features**: catalog rows used by the premium page (`min_tier` per feature).
- **Demo marketplace**: 3 demo restaurants (marked `is_demo`, approved) with menus + menu items so Discover/Browse isn't empty.

### 2. Wire the gamification engine end-to-end

- New `src/lib/xp.functions.ts` — thin `createServerFn` wrappers (auth-protected) exposing `getGamification`, `claimEliteReward`, and client-callable award actions. No module-scope runtime code (splitting rule).
- Call `awardXpFor` / `touchStreak` from the real flows: recipe cooked (cooking mode complete), planned meal completed, grocery list completed, weekly plan built, premium purchase (webhook path).
- **Profile page**: level badge + emoji, XP progress bar to next level, current/longest streak, achievements grid (unlocked vs locked).
- **Home**: compact level/streak chip on the Plan Status card.
- **Elite reward**: claim button at 50,000 XP (grants 30 days promo premium — already implemented server-side).

### 3. MealMate 2.0 navigation + mascot

- **Bottom nav → 4 tabs**: Home `/`, Restaurants `/restaurants`, Planner `/planner`, Profile `/profile` (MD3 active pill indicator, i18n labels).
- **Floating AI companion**: elevated center FAB on the nav bar → `/chat`; hidden while on `/chat`. MD3 motion (press scale, subtle idle bob).
- **Animated SVG mascot** (`Mascot.tsx`): pure-SVG MealMate buddy in logo colors — blink, bob, and wave animations via CSS; used in the FAB, empty states, and level-up moments. No runtime deps.
- Old destinations (`/recipes`, `/list`, `/cookbook`, `/grocery`) stay reachable from Home/Profile shortcuts so nothing breaks.

### 4. Logo-color palette

- Sample `mealmate-logo.png` for its dominant colors, then update the semantic tokens in `src/styles.css` (light + dark): primary, secondary, accent, surface tones. Components already use tokens, so the retheme propagates everywhere without per-component edits.

### 5. RevenueCat final wiring (conditional)

- Wire `@revenuecat/purchases-js` into `/premium` checkout **behind** `VITE_REVENUECAT_PUBLIC_KEY` — when the key is absent the existing promo/manual flow stays the fallback, so nothing regresses.
- Keep the webhook verifying the Authorization header only when `REVENUECAT_WEBHOOK_SECRET` is set (currently unset).

### 6. Verify production stability

- `tsgo` typecheck — zero errors.
- Production build — zero errors.
- Smoke test every route with Playwright: all return 200, no console errors, nav/FAB render, seeded recipes and restaurants visible, XP card renders after sign-in.

## Needs from you (not blocking this build)

1. **RevenueCat public SDK key** (`pk_...` / `rcb_...`) — paste it and checkout goes fully live; until then the paywall uses the existing fallback.
2. **Webhook secret** — the Authorization header value you set in the RevenueCat dashboard.
3. **Sign up once** with `tatendamkhwanazi6@gmail.com` in this remixed project — the database trigger auto-grants you admin on signup.

## Technical details

- Migration follows the required order: CREATE/INSERT → GRANT → RLS → policies (seeds only touch existing tables, so inserts + any missing grants).
- XP functions use `requireSupabaseAuth`; privileged writes load `supabaseAdmin` inside handlers via dynamic import.
- Mascot and FAB are client-safe (no SSR-only browser APIs at module scope).
- No changes to generated files (`routeTree.gen.ts`, `src/integrations/supabase/*`).
