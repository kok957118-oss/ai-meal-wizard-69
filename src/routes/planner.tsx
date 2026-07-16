import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { myPlannerQuery, myFavoritesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/planner")({
  component: PlannerPage,
});

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function PlannerPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  const fromISO = iso(week[0]);
  const toISO = iso(week[6]);

  const { data: plans } = useQuery({
    ...myPlannerQuery(fromISO, toISO),
    enabled: !!user,
  });
  const { data: favorites } = useQuery({ ...myFavoritesQuery(), enabled: !!user });

  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [mealType, setMealType] = useState("Dinner");
  const [recipeId, setRecipeId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["planner"] });
  }

  async function addMeal(day: string) {
    if (!user || !recipeId) return;
    const fav = favorites?.find((f) => f.recipe_id === recipeId);
    setSaving(true);
    try {
      const { error } = await supabase.from("meal_plans").insert({
        user_id: user.id,
        plan_date: day,
        meal_type: mealType,
        recipe_id: recipeId,
        custom_name: fav?.recipes?.name ?? null,
      });
      if (error) throw error;
      setAddingDay(null);
      setRecipeId("");
      refresh();
    } catch {
      toast.error("Couldn't add meal");
    } finally {
      setSaving(false);
    }
  }

  async function removeMeal(id: string) {
    await supabase.from("meal_plans").delete().eq("id", id);
    refresh();
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-4xl">Meal planner</h1>
          <p className="text-sm text-muted-foreground">This week's plan</p>
        </div>
      </div>

      {favorites && favorites.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Save some recipes first — your favorites show up here to plan with.{" "}
          <Link to="/recipes" className="font-medium text-foreground hover:underline">
            Browse recipes
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {week.map((d) => {
          const dayISO = iso(d);
          const dayPlans = plans?.filter((p) => p.plan_date === dayISO) ?? [];
          const isToday = dayISO === iso(new Date());
          return (
            <div
              key={dayISO}
              className={`rounded-2xl border bg-card p-4 ${
                isToday ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">
                  {d.toLocaleDateString(undefined, { weekday: "long" })}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setAddingDay(addingDay === dayISO ? null : dayISO)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {dayPlans.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {dayPlans.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{p.meal_type}:</span>{" "}
                        {p.recipes?.slug ? (
                          <Link
                            to="/recipe/$slug"
                            params={{ slug: p.recipes.slug }}
                            className="hover:underline"
                          >
                            {p.recipes?.name ?? p.custom_name}
                          </Link>
                        ) : (
                          p.custom_name
                        )}
                      </span>
                      <button
                        onClick={() => removeMeal(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {addingDay === dayISO && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={recipeId} onValueChange={setRecipeId}>
                    <SelectTrigger className="min-w-48 flex-1">
                      <SelectValue placeholder="Choose a saved recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {favorites?.map((f) => (
                        <SelectItem key={f.recipe_id} value={f.recipe_id}>
                          {f.recipes?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => addMeal(dayISO)}
                    disabled={!recipeId || saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
