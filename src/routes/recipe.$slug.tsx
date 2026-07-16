import { createFileRoute, notFound, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Clock,
  Users,
  Flame,
  Heart,
  ShoppingCart,
  ChefHat,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { recipeBySlugQuery, myFavoritesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { usePremium } from "@/hooks/use-premium";
import { regenerateRecipeImage } from "@/lib/ai.functions";
import { setContinueCooking } from "@/lib/continue-cooking";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/recipe/$slug")({
  loader: async ({ context, params }) => {
    const recipe = await context.queryClient.ensureQueryData(
      recipeBySlugQuery(params.slug),
    );
    if (!recipe) throw notFound();
    return recipe;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.name} — MealMate` },
            { name: "description", content: loaderData.description ?? undefined },
            { property: "og:title", content: `${loaderData.name} — MealMate` },
            ...(loaderData.image_url
              ? [{ property: "og:image", content: loaderData.image_url }]
              : []),
          ],
        }
      : {},
  component: RecipePage,
});

type Ingredient = { name: string; quantity?: string };

function RecipePage() {
  const recipe = Route.useLoaderData();
  const { data } = useQuery(recipeBySlugQuery(recipe.slug));
  const r = data ?? recipe;
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: favorites } = useQuery({ ...myFavoritesQuery(), enabled: !!user });
  const [savingFav, setSavingFav] = useState(false);
  const [addingList, setAddingList] = useState(false);

  useEffect(() => {
    setContinueCooking({
      slug: r.slug,
      name: r.name,
      image_url: r.image_url,
      cooking_time_minutes: r.cooking_time_minutes,
      calories: r.calories,
    });
  }, [r.slug]);

  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []) as Ingredient[];
  const steps = (Array.isArray(r.steps) ? r.steps : []) as string[];
  const isFav = favorites?.some((f) => f.recipe_id === r.id) ?? false;

  const stats = [
    r.cooking_time_minutes && { icon: Clock, label: `${r.cooking_time_minutes} min` },
    r.servings && { icon: Users, label: `${r.servings} servings` },
    r.calories && { icon: Flame, label: `${r.calories} kcal` },
    r.difficulty && { icon: ChefHat, label: r.difficulty },
  ].filter(Boolean) as { icon: typeof Clock; label: string }[];

  async function toggleFavorite() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setSavingFav(true);
    try {
      if (isFav) {
        await supabase
          .from("favorites")
          .delete()
          .eq("recipe_id", r.id)
          .eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ recipe_id: r.id, user_id: user.id });
      }
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {
      toast.error("Couldn't update favorites");
    } finally {
      setSavingFav(false);
    }
  }

  async function addToGrocery() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (ingredients.length === 0) return;
    setAddingList(true);
    try {
      const rows = ingredients.map((ing) => ({
        user_id: user.id,
        recipe_id: r.id,
        name: ing.name,
        quantity: ing.quantity ?? null,
      }));
      const { error } = await supabase.from("grocery_items").insert(rows);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["grocery"] });
      toast.success("Added to your grocery list", {
        action: { label: "View", onClick: () => navigate({ to: "/list" }) },
      });
    } catch {
      toast.error("Couldn't add to grocery list");
    } finally {
      setAddingList(false);
    }
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/recipes"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to recipes
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-muted">
            {r.image_url ? (
              <img
                src={r.image_url}
                alt={r.name}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback === "1") return;
                  img.dataset.fallback = "1";
                  img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(
                    `${r.name}, real food photograph, hyperrealistic, natural light, plated`,
                  )}?width=1200&height=1200&nologo=true&model=flux`;
                }}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center">
                <ChefHat className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {r.cuisine && <span>{r.cuisine}</span>}
              {r.country && <span>· {r.country}</span>}
              {r.category && <span>· {r.category}</span>}
            </div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{r.name}</h1>
            {r.description && (
              <p className="mt-3 text-lg text-muted-foreground">{r.description}</p>
            )}

            {r.diet_tags && r.diet_tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {r.diet_tags.map((t: string) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center"
                >
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={toggleFavorite} variant={isFav ? "default" : "secondary"} disabled={savingFav}>
                {savingFav ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`mr-2 h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                )}
                {isFav ? "Saved" : "Save"}
              </Button>
              <Button onClick={addToGrocery} variant="outline" disabled={addingList}>
                {addingList ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-4 w-4" />
                )}
                Add to list
              </Button>
            </div>
          </div>
        </div>

        {(r.protein_g || r.carbs_g || r.fat_g) && (
          <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4">
            {[
              { label: "Protein", value: r.protein_g },
              { label: "Carbs", value: r.carbs_g },
              { label: "Fat", value: r.fat_g },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="font-display text-2xl">{m.value ?? "–"}g</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.5fr]">
          <section>
            <h2 className="font-display text-2xl">Ingredients</h2>
            <ul className="mt-4 space-y-2">
              {ingredients.map((ing, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 text-sm"
                >
                  <span>{ing.name}</span>
                  {ing.quantity && (
                    <span className="shrink-0 text-muted-foreground">{ing.quantity}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl">Method</h2>
            <ol className="mt-4 space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {r.fun_fact && (
          <div className="mt-10 flex gap-3 rounded-2xl bg-secondary p-5">
            <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-secondary-foreground">
              <strong>Did you know?</strong> {r.fun_fact}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
