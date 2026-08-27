/**
 * Recipe image matching + delivery.
 *
 * Rules:
 *  - The image must depict the actual dish (name + main ingredient + cuisine).
 *  - The URL is deterministic per recipe (stable seed derived from the slug),
 *    so the same recipe always renders the same photo — never random.
 *  - Card/thumbnail call sites request small renditions; only the recipe page
 *    requests a hero rendition.
 */

const PHOTO_STYLE =
  "real photograph, hyperrealistic food photography, DSLR, 50mm, natural window light, shallow depth of field, appetising, professionally plated, not an illustration, not cartoon, not 3d render";

/** Main-ingredient hints so e.g. a beef dish never gets a chicken photo. */
const INGREDIENT_HINTS: Array<[RegExp, string]> = [
  [/\bbeef|steak|brisket|oxtail|mince\b/i, "beef as the main protein"],
  [/\bchicken|poultry|wings\b/i, "chicken as the main protein"],
  [/\blamb|mutton\b/i, "lamb as the main protein"],
  [/\bpork|bacon|ribs\b/i, "pork as the main protein"],
  [/\bfish|salmon|tuna|hake|snoek|prawn|shrimp|seafood\b/i, "seafood as the main protein"],
  [/\bvegan|vegetarian|veggie|tofu|chickpea|lentil|bean\b/i, "plant-based, no meat"],
  [/\bpasta|spaghetti|alfredo|lasagne|lasagna|penne|noodle\b/i, "pasta dish"],
  [/\brice|biryani|risotto|jollof|paella\b/i, "rice dish"],
  [/\bburger\b/i, "burger in a bun with toppings"],
  [/\bpizza\b/i, "pizza with visible toppings"],
  [/\bsalad\b/i, "fresh salad in a bowl"],
  [/\bsoup|stew|curry|potjie\b/i, "served in a bowl or pot"],
  [/\bpancake|waffle|french toast\b/i, "breakfast stack on a plate"],
  [/\bcake|pudding|pie|tart|dessert|brownie|cookie\b/i, "dessert plated with garnish"],
  [/\bbread|loaf|sandwich|wrap|taco|kota|bunny chow\b/i, "handheld, cut to show the filling"],
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 1_000_000_000;
}

export interface ImageRecipeLike {
  slug?: string | null;
  name: string;
  cuisine?: string | null;
  category?: string | null;
  image_url?: string | null;
}

/** Builds a dish-specific prompt from the recipe name, cuisine and category. */
export function dishPrompt(r: ImageRecipeLike): string {
  const hints = INGREDIENT_HINTS.filter(([re]) => re.test(r.name)).map(([, h]) => h);
  return [
    r.name,
    r.cuisine ? `${r.cuisine} cuisine` : null,
    r.category ? r.category.toLowerCase() : null,
    ...hints,
    PHOTO_STYLE,
  ]
    .filter(Boolean)
    .join(", ");
}

export type ImageSize = "thumb" | "card" | "hero";

export const IMAGE_DIMENSIONS: Record<ImageSize, { width: number; height: number }> = {
  thumb: { width: 256, height: 256 },
  card: { width: 512, height: 512 },
  hero: { width: 1024, height: 1024 },
};

/** Deterministic generated photo for a recipe with no stored image. */
export function generatedImageUrl(r: ImageRecipeLike, size: ImageSize = "card"): string {
  const { width, height } = IMAGE_DIMENSIONS[size];
  const seed = hashSeed(r.slug || r.name);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    dishPrompt(r),
  )}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
}

/**
 * Resolve the URL to render. Prefers the stored image (so each recipe keeps its
 * own validated photo), but downsizes generated renditions to the size actually
 * needed — a 160px card never downloads a 1200px file.
 */
export function recipeImageUrl(r: ImageRecipeLike, size: ImageSize = "card"): string {
  const stored = r.image_url?.trim();
  if (!stored) return generatedImageUrl(r, size);
  if (!stored.includes("image.pollinations.ai")) return stored;
  const { width, height } = IMAGE_DIMENSIONS[size];
  try {
    const url = new URL(stored);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    url.searchParams.set("nologo", "true");
    if (!url.searchParams.get("seed")) {
      url.searchParams.set("seed", String(hashSeed(r.slug || r.name)));
    }
    return url.toString();
  } catch {
    return stored;
  }
}

/** onError handler: fall back to the dish-matched generated photo, never a generic one. */
export function imageFallback(r: ImageRecipeLike, size: ImageSize = "card") {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset["fallback"] === "1") return;
    img.dataset["fallback"] = "1";
    img.src = generatedImageUrl(r, size);
  };
}
