import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, trackEvent } from "@/lib/security.server";

const PlanInput = z.object({
  days: z.number().int().min(1).max(14).default(7),
  meals: z.array(z.string()).default(["Breakfast", "Lunch", "Dinner"]),
  startDate: z.string().optional(),
});

type MealSuggestion = {
  day: number;
  date: string;
  meal_type: string;
  name: string;
  calories: number;
  short_reason: string;
};

// AI Meal Planner v2 — uses profile (goal, allergies, budget, dietary_preferences)
export const generatePersonalizedPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => PlanInput.parse(v))
  .handler(async ({ data, context }) => {
    await enforceRateLimit("ai_planner", context.userId, 5);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("goal,activity_level,allergies,budget_per_day,dietary_preferences,family_size,weight_kg,height_cm,age")
      .eq("id", context.userId)
      .maybeSingle();

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const start = data.startDate ? new Date(data.startDate) : new Date();
    const dates: string[] = [];
    for (let i = 0; i < data.days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const prompt = `Build a ${data.days}-day meal plan for meals: ${data.meals.join(", ")}.
User profile:
- Goal: ${profile?.goal ?? "general wellness"}
- Activity: ${profile?.activity_level ?? "moderate"}
- Allergies: ${(profile?.allergies ?? []).join(", ") || "none"}
- Dietary preferences: ${(profile?.dietary_preferences ?? []).join(", ") || "none"}
- Daily budget: ${profile?.budget_per_day ? `$${profile.budget_per_day}` : "flexible"}
- Family size: ${profile?.family_size ?? 1}

Prefer varied, culturally diverse dishes including South African options. Reply ONLY as JSON:
{"plan":[{"day":1,"meal_type":"Breakfast","name":"...","calories":450,"short_reason":"..."}]}
Days: 1..${data.days}. One entry per meal per day.`;

    const t0 = Date.now();
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a certified nutritionist and chef. Respond with strict JSON only." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const j = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(s, e + 1)) as {
        plan: Array<{ day: number; meal_type: string; name: string; calories?: number; short_reason?: string }>;
      };
      const suggestions: MealSuggestion[] = (parsed.plan ?? []).map((p) => ({
        day: p.day,
        date: dates[Math.max(0, Math.min(p.day - 1, dates.length - 1))],
        meal_type: p.meal_type,
        name: p.name,
        calories: p.calories ?? 0,
        short_reason: p.short_reason ?? "",
      }));
      void trackEvent({ user_id: context.userId, kind: "ai", name: "ai.plan_generated", latency_ms: Date.now() - t0, success: true, metadata: { days: data.days, count: suggestions.length } });
      return { suggestions };
    } catch (err) {
      void trackEvent({ user_id: context.userId, kind: "ai", name: "ai.plan_generated", latency_ms: Date.now() - t0, success: false, error: err instanceof Error ? err.message.slice(0, 500) : String(err) });
      throw err;
    }
  });

// Auto-generate grocery list from planned meals in a date range
export const buildGroceryFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ from: z.string(), to: z.string() }).parse(v))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: plans, error } = await supabase
      .from("meal_plans")
      .select("recipe_id, recipes(ingredients, name)")
      .gte("plan_date", data.from)
      .lte("plan_date", data.to);
    if (error) throw new Error(error.message);

    // aggregate ingredients by name
    const map = new Map<string, { quantity: string | null; sources: Set<string> }>();
    for (const p of plans ?? []) {
      const rec = (p as { recipes?: { ingredients?: unknown; name?: string } | null }).recipes;
      const ings = Array.isArray(rec?.ingredients) ? (rec!.ingredients as Array<{ name?: string; quantity?: string }>) : [];
      for (const ing of ings) {
        if (!ing?.name) continue;
        const k = ing.name.trim().toLowerCase();
        const cur = map.get(k) ?? { quantity: null, sources: new Set() };
        if (ing.quantity) cur.quantity = cur.quantity ? `${cur.quantity} + ${ing.quantity}` : ing.quantity;
        if (rec?.name) cur.sources.add(rec.name);
        map.set(k, cur);
      }
    }

    const rows = Array.from(map.entries()).map(([name, v]) => ({
      user_id: context.userId,
      name,
      quantity: v.quantity,
      source: Array.from(v.sources).slice(0, 3).join(", ") || null,
    }));

    if (rows.length === 0) return { inserted: 0 };
    const { error: insErr } = await supabase.from("grocery_items").insert(rows);
    if (insErr) throw new Error(insErr.message);
    void trackEvent({ user_id: context.userId, kind: "planner", name: "planner.autogrocery", success: true, metadata: { inserted: rows.length } });
    return { inserted: rows.length };
  });

// Ingredient substitution suggestions
export const suggestSubstitutions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ ingredient: z.string().min(1).max(120), context: z.string().max(300).optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await enforceRateLimit("ai_substitute", context.userId, 20);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const t0 = Date.now();
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a culinary substitutions expert. Return JSON only." },
            {
              role: "user",
              content: `Give 3 practical substitutes for "${data.ingredient}"${data.context ? ` in the context of ${data.context}` : ""}. JSON: {"substitutes":[{"name":"...","ratio":"1:1","notes":"..."}]}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const j = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(s, e + 1)) as {
        substitutes: Array<{ name: string; ratio?: string; notes?: string }>;
      };
      void trackEvent({ user_id: context.userId, kind: "ai", name: "ai.substitute", latency_ms: Date.now() - t0, success: true, metadata: { ingredient: data.ingredient } });
      return { substitutes: parsed.substitutes ?? [] };
    } catch (err) {
      void trackEvent({ user_id: context.userId, kind: "ai", name: "ai.substitute", latency_ms: Date.now() - t0, success: false, error: err instanceof Error ? err.message.slice(0, 500) : String(err) });
      throw err;
    }
  });
