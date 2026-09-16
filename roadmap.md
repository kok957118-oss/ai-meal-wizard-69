# MealMate roadmap

## In progress — Customer app ↔ Partner platform integration
- [x] DB: branches, modifiers, dietary tags, promotions, redemptions, payment status, fulfillment, realtime publication
- [x] Shared pricing/availability engine (`src/lib/marketplace.pricing.ts`)
- [x] Shared schemas (`src/lib/marketplace.schemas.ts`)
- [ ] Server layer: quote + order v2, promotions CRUD, branches CRUD, pause controls, analytics events
- [ ] Server functions exposed to both apps
- [ ] Public read API routes (`/api/public/v1/*`) + documented contract
- [ ] Realtime hooks: menu, restaurant, order status (customer) and order queue (partner)
- [ ] Cart supports add-ons / branch / fulfillment
- [ ] Checkout: promo code, pickup vs delivery, "payment provider not configured" state
- [ ] Partner dashboard: promotions tab, branches tab, pause ordering, live order queue
- [ ] `docs/API-INTEGRATION.md`
- [ ] Branding: "MealMate — operated by Taz Technologies"
- [ ] End-to-end test of the real flow + authorization checks

## Next — Restaurants page redesign (customer discovery)
- [ ] Dark-first premium theme (#0D0D0D bg, #FF4B26 accent) scoped to restaurant discovery
- [ ] Delivering-to header + large search (restaurants, dishes, cuisines)
- [ ] Horizontal category rail (Hot Deals, Pizza, Burgers, Chicken, Fast Food, Healthy, Mexican, Desserts, Drinks)
- [ ] Filter chips: All, Top Rated, Fast, Halaal, Vegetarian, Deals
- [ ] "Deals near you" carousel from real promotions
- [ ] "Popular near you" restaurant cards + favourite button
- [ ] "Craving something?" dish carousel with inline add-to-cart
- [ ] "Picked for you" from order history, else popular
- [ ] Restaurant detail page: hero, logo, menu search, category tabs, add-to-cart
- [ ] Keep existing global bottom nav; Restaurants tab active in orange
      (note: user's nav list mentions Pick n Pay/Shops tabs that don't exist yet — confirm before adding)
