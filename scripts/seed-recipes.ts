/**
 * MealMate recipe seeder.
 *
 * Generates recipes with an LLM (via the same Lovable AI gateway your app already
 * uses) and inserts them into the `recipes` table with the service-role client,
 * so it bypasses RLS.
 *
 * USAGE
 *   bun scripts/seed-recipes.ts --count=200
 *   bun scripts/seed-recipes.ts --count=1000 --concurrency=4
 *
 * Run it in chunks (a few hundred at a time) rather than all 5,000 at once —
 * see the note at the bottom of this file about time/cost.
 */

import { createClient } from "@supabase/supabase-js";

// ---------- env ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. See setup notes below the script.",
  );
  process.exit(1);
}
if (!LOVABLE_API_KEY) {
  console.error("Missing LOVABLE_API_KEY env var.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- cli args ----------
function argNum(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const TARGET_COUNT = argNum("count", 200);
const CONCURRENCY = argNum("concurrency", 3);

// ---------- categories to spread recipes across ----------
// Mirrors the categories listed in the app / store page.
const CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Desserts",
  "Drinks",
  "Healthy Meals",
  "High Protein",
  "Low Carb",
  "Keto",
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Seafood",
  "Chicken",
  "Beef",
  "Pork",
  "Pasta",
  "Rice",
  "Salads",
  "Soups",
  "Air Fryer",
  "Baking",
  "South African Favorites",
  "International Cuisine",
];

// ---------- slugify (copied from src/lib/slug.ts) ----------
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------- AI gateway calls ----------
async function chatJson(prompt: string, system: string): Promise<unknown> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = j.choices?.[0]?.message?.content ?? "{}";
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Step 1: cheap call — get a batch of distinct dish names for a category
async function getDishIdeas(category: string, count: number, avoid: string[]): Promise<string[]> {
  const avoidList = avoid.length ? `Avoid repeating these: ${avoid.slice(-40).join(", ")}.` : "";
  const result = await chatJson(
    `List ${count} distinct, specific, real dish names that fit the category "${category}". ${avoidList} Return ONLY a JSON array of strings, no commentary.`,
    "You are a recipe database curator. Respond with only a JSON array of dish name strings.",
  );
  if (!Array.isArray(result)) throw new Error("Expected array of dish names");
  return result.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

// Step 2: full recipe detail for one dish name
const RECIPE_SYSTEM = `You are MealMate, an expert global chef and food writer with deep knowledge of South African cuisine (Pap, Chakalaka, Bunny Chow, Kota, Boerewors, Vetkoek, Mogodu, Samp and Beans, Malva Pudding, Bobotie, Umngqusho) as well as world cuisines.

Return ONLY valid JSON matching this shape (no code fences, no commentary):
{
  "name": string,
  "description": string (1-2 sentences),
  "cuisine": string,
  "category": one of "Breakfast" | "Lunch" | "Dinner" | "Dessert" | "Snacks" | "Drinks",
  "country": string,
  "diet_tags": string[] (subset of ["Vegan","Vegetarian","High Protein","Low Carb","Gluten Free","Healthy","Quick"]),
  "meal_type": string,
  "cooking_time_minutes": number,
  "difficulty": "Easy" | "Medium" | "Hard",
  "servings": number,
  "calories": number (per serving),
  "protein_g": number, "carbs_g": number, "fat_g": number,
  "ingredients": [{ "name": string, "quantity": string }],
  "steps": string[] (5-10 clear steps),
  "fun_fact": string,
  "image_prompt": string (concise, food-photography style)
}`;

type GeneratedRecipe = {
  name: string;
  description: string;
  cuisine?: string | null;
  category?: string | null;
  country?: string | null;
  diet_tags?: string[];
  meal_type?: string | null;
  cooking_time_minutes?: number | null;
  difficulty?: string | null;
  servings?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ingredients?: { name: string; quantity?: string }[];
  steps?: string[];
  fun_fact?: string | null;
  image_prompt?: string | null;
};

async function generateFullRecipe(dishName: string, category: string): Promise<GeneratedRecipe> {
  const raw = await chatJson(
    `Create a real, authentic, detailed recipe for: "${dishName}" (category: ${category}). Be specific and accurate — use the traditional version if this dish exists in a real cuisine.`,
    RECIPE_SYSTEM,
  );
  return raw as GeneratedRecipe;
}

function imageUrlFor(r: GeneratedRecipe): string {
  const prompt = r.image_prompt || `${r.name}, plated food photography`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt + ", professional food photography, natural light, appetizing",
  )}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
}

function toDbRow(r: GeneratedRecipe, category: string) {
  const slug = `${slugify(r.name)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    slug,
    name: r.name,
    description: r.description,
    image_url: imageUrlFor(r),
    cuisine: r.cuisine ?? null,
    category: r.category ?? category,
    country: r.country ?? null,
    diet_tags: r.diet_tags ?? [],
    meal_type: r.meal_type ?? null,
    cooking_time_minutes: r.cooking_time_minutes ?? null,
    difficulty: r.difficulty ?? null,
    servings: r.servings ?? 2,
    calories: r.calories ?? null,
    protein_g: r.protein_g ?? null,
    carbs_g: r.carbs_g ?? null,
    fat_g: r.fat_g ?? null,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    fun_fact: r.fun_fact ?? null,
    is_featured: false,
    created_by: null,
  };
}

// ---------- simple concurrency pool ----------
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<void> {
  let next = 0;
  let active = 0;
  return new Promise((resolve) => {
    const launch = () => {
      if (next >= items.length && active === 0) return resolve();
      while (active < limit && next < items.length) {
        const idx = next++;
        active++;
        worker(items[idx], idx)
          .catch((err) => console.error("  ✗ item failed:", err instanceof Error ? err.message : err))
          .finally(() => {
            active--;
            launch();
          });
      }
    };
    launch();
  });
}

async function existingNames(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from("recipes").select("name");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.name.toLowerCase()));
}

async function main() {
  console.log(`Seeding target: ${TARGET_COUNT} recipes (concurrency ${CONCURRENCY})`);

  const seen = await existingNames();
  console.log(`Already in DB: ${seen.size} recipes`);

  const perCategory = Math.ceil(TARGET_COUNT / CATEGORIES.length);
  let inserted = 0;
  let failed = 0;

  for (const category of CATEGORIES) {
    if (inserted >= TARGET_COUNT) break;
    const wanted = Math.min(perCategory, TARGET_COUNT - inserted);
    console.log(`\n[${category}] requesting ${wanted} dish ideas…`);

    let ideas: string[] = [];
    try {
      ideas = await getDishIdeas(category, wanted, [...seen]);
    } catch (err) {
      console.error(`  ✗ couldn't get ideas for ${category}:`, err);
      continue;
    }

    // de-dupe against what's already in the DB / already queued this run
    ideas = ideas.filter((name) => !seen.has(name.toLowerCase()));
    ideas.forEach((name) => seen.add(name.toLowerCase()));

    await pool(ideas, CONCURRENCY, async (dishName) => {
      const recipe = await generateFullRecipe(dishName, category);
      const row = toDbRow(recipe, category);
      const { error } = await supabaseAdmin.from("recipes").insert(row);
      if (error) throw new Error(error.message);
      inserted++;
      console.log(`  ✓ (${inserted}/${TARGET_COUNT}) ${row.name}`);
    });
  }

  console.log(`\nDone. Inserted ${inserted} recipes. Failed: ${failed}.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
