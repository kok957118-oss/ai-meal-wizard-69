import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, auditLog } from "@/lib/security.server";

const RecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  cuisine: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  diet_tags: z.array(z.string()).default([]),
  meal_type: z.string().nullable().optional(),
  cooking_time_minutes: z.number().int().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  servings: z.number().int().nullable().optional(),
  calories: z.number().int().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  ingredients: z
    .array(z.object({ name: z.string(), quantity: z.string().optional() }))
    .default([]),
  steps: z.array(z.string()).default([]),
  fun_fact: z.string().nullable().optional(),
  image_prompt: z.string().nullable().optional(),
});

type GeneratedRecipe = z.infer<typeof RecipeSchema>;

const SYSTEM = `You are MealMate, an expert global chef and food writer with deep knowledge of South African cuisine (Pap, Chakalaka, Bunny Chow, Kota, Boerewors, Vetkoek, Mogodu, Samp and Beans, Malva Pudding, Bobotie, Umngqusho) as well as world cuisines.

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

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callModel(prompt: string): Promise<GeneratedRecipe> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = j.choices?.[0]?.message?.content ?? "{}";
  return RecipeSchema.parse(extractJson(text));
}

function imageUrlFor(r: GeneratedRecipe): string {
  const base = r.image_prompt || `${r.name}${r.country ? `, traditional ${r.country} dish` : ""}`;
  const prompt =
    `Authentic ${r.name}${r.cuisine ? ` from ${r.cuisine} cuisine` : ""}. ` +
    `${base}. Real photograph, hyperrealistic food photography, DSLR, 50mm, ` +
    `natural window light, shallow depth of field, plated on real crockery, ` +
    `not an illustration, not cartoon, not 3d render, photorealistic.`;
  // Deterministic seed per dish name so the same recipe always shows the same photo.
  let seed = 0;
  for (let i = 0; i < r.name.length; i++) seed = (seed * 31 + r.name.charCodeAt(i)) >>> 0;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=800&nologo=true&model=flux&seed=${seed}`;
}

function toDbRecipe(r: GeneratedRecipe, userId: string | null) {
  const slug = `${slugify(r.name)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    slug,
    name: r.name,
    description: r.description,
    image_url: imageUrlFor(r),
    cuisine: r.cuisine ?? null,
    category: r.category ?? null,
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
    created_by: userId,
  };
}

// Surprise Me — signed-in users only, rate limited to 10/min per user
export const surpriseMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await enforceRateLimit("ai_generate", context.userId, 10);
    const themes = [
      "a comforting South African classic",
      "a bold weeknight dinner from anywhere in the world",
      "a fast healthy lunch",
      "a celebratory Sunday dish",
      "a street food favorite",
      "an African diaspora dish",
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const recipe = await callModel(
      `Surprise the user with ${theme}. Pick something delightful and specific — not generic. Include one fun fact.`,
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = toDbRecipe(recipe, context.userId);
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .insert(row)
      .select("slug")
      .single();
    if (error) throw new Error(error.message);
    return { slug: data.slug };
  });

// Search / generate a specific recipe — signed-in users only, rate limited.
export const generateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ query: z.string().trim().min(1).max(200) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await enforceRateLimit("ai_generate", context.userId, 10);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Prefer an exact-name match (case-insensitive) for dedup; fall back to fuzzy.
    const { data: exact } = await supabaseAdmin
      .from("recipes")
      .select("slug,name")
      .ilike("name", data.query)
      .limit(1);
    if (exact && exact.length > 0) return { slug: exact[0].slug, cached: true };

    const { data: fuzzy } = await supabaseAdmin
      .from("recipes")
      .select("slug,name")
      .ilike("name", `%${data.query}%`)
      .limit(1);
    if (fuzzy && fuzzy.length > 0) return { slug: fuzzy[0].slug, cached: true };

    const recipe = await callModel(
      `Create a real, authentic recipe for: "${data.query}". If the dish exists in any culture, use the traditional version. Be specific and accurate.`,
    );
    const row = toDbRecipe(recipe, context.userId);
    const { data: inserted, error } = await supabaseAdmin
      .from("recipes")
      .insert(row)
      .select("slug")
      .single();
    if (error) throw new Error(error.message);
    await auditLog({
      actor_id: context.userId,
      action: "recipe.generated",
      target_table: "recipes",
      target_id: inserted.slug,
      metadata: { query: data.query, name: recipe.name },
    });
    return { slug: inserted.slug, cached: false };
  });

// Kitchen Scan — identify ingredients from a photo
export const scanKitchen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ imageDataUrl: z.string().startsWith("data:image/") }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await enforceRateLimit("ai_vision", context.userId, 10);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Identify every distinct food ingredient visible. Reply as JSON only: {"items": [{"name":"tomato","quantity":"2","category":"vegetable"}]}. Use lowercase names.',
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = j.choices?.[0]?.message?.content ?? "{}";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      items: { name: string; quantity?: string; category?: string }[];
    };
    return parsed.items ?? [];
  });

// Ask anything about food — a single-turn Q&A used by the AI Chat quick action
export const askFoodQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ question: z.string().trim().min(1).max(500) }).parse(v))
  .handler(async ({ data, context }) => {
    await enforceRateLimit("ai_chat", context.userId, 20);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are MealMate's kitchen assistant. Answer food, cooking, nutrition, and ingredient-substitution questions clearly and concisely, in 2-4 short paragraphs or a short list. Plain text only, no markdown headers.",
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { choices: { message: { content: string } }[] };
    return { answer: j.choices?.[0]?.message?.content ?? "" };
  });
