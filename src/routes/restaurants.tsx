import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Store, Loader2 } from "lucide-react";
import { approvedRestaurantsQuery, type PublicRestaurant } from "@/lib/restaurant-queries";
import { haversineKm, useUserLocation, isOpenNow } from "@/lib/geo";
import { RestaurantCard } from "@/components/restaurant/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/restaurants")({
  head: () => ({
    meta: [
      { title: "Restaurants Near You | MealMate" },
      {
        name: "description",
        content:
          "Discover verified restaurants near you on MealMate, browse menus, and order delivery with live order tracking.",
      },
      { property: "og:title", content: "Restaurants Near You | MealMate" },
      {
        property: "og:description",
        content: "Browse nearby verified restaurants, order delivery and track every step live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestaurantsPage,
});

type SortKey = "nearest" | "rating" | "fastest";

function RestaurantsPage() {
  const { data, isLoading } = useQuery(approvedRestaurantsQuery());
  const { coords, state, request } = useUserLocation();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("nearest");
  const [openOnly, setOpenOnly] = useState(false);

  const rows = useMemo(() => {
    const withDistance = (data ?? []).map((r: PublicRestaurant) => {
      const loc = r.restaurant_locations?.[0];
      const km = coords && loc ? haversineKm(coords, loc) : null;
      return { r, km };
    });
    const term = q.trim().toLowerCase();
    let filtered = withDistance.filter(({ r }) =>
      term
        ? `${r.name} ${r.cuisine ?? ""} ${r.description ?? ""}`.toLowerCase().includes(term)
        : true,
    );
    if (openOnly) filtered = filtered.filter(({ r }) => isOpenNow(r.opening_hours) !== false);
    if (coords) {
      filtered = filtered.filter(
        ({ r, km }) => km == null || km <= Number(r.delivery_radius_km ?? 10) + 5,
      );
    }
    return filtered.sort((a, b) => {
      if (sort === "rating") return Number(b.r.avg_rating) - Number(a.r.avg_rating);
      if (sort === "fastest")
        return a.r.delivery_estimate_minutes - b.r.delivery_estimate_minutes;
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    });
  }, [data, coords, q, sort, openOnly]);

  return (
    <div className="page-enter mx-auto max-w-3xl px-4 pb-28 pt-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Restaurants near you</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified kitchens, real menus, live order tracking.
        </p>
      </header>

      {state !== "granted" && (
        <div className="md3-surface mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Show distance and nearby only</p>
              <p className="text-xs text-muted-foreground">
                {state === "denied"
                  ? "Location permission was denied — you can still browse everything."
                  : "We only read your location when you tap allow."}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={request} disabled={state === "prompting"}>
            {state === "prompting" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use location"}
          </Button>
        </div>
      )}

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search restaurants or cuisines"
            aria-label="Search restaurants"
            className="rounded-full pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["nearest", "Nearest"],
              ["rating", "Top rated"],
              ["fastest", "Fastest"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={sort === key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setSort(key)}
            >
              {label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={openOnly ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setOpenOnly((v) => !v)}
          >
            Open now
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="md3-surface rounded-3xl border border-dashed border-border p-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No restaurants yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Own a restaurant? Get listed on MealMate in minutes.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-full">
            <Link to="/partner">Partner with MealMate</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ r, km }, i) => (
            <div key={r.id} className="page-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <RestaurantCard restaurant={r} distanceKm={km} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/partner">Partner with MealMate</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/orders">My orders</Link>
        </Button>
      </div>
    </div>
  );
}
