import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Sparkles } from "lucide-react";
import { scanKitchen } from "@/lib/ai.functions";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

type ScannedItem = { name: string; quantity?: string; category?: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ScanPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setItems(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const found = await scanKitchen({ data: { imageDataUrl: dataUrl } });
      setItems(found);
      if (found.length === 0) {
        toast.info("Didn't spot any ingredients", {
          description: "Try a clearer, closer photo.",
        });
      }
    } catch (err) {
      toast.error("Couldn't scan that photo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function addAllToPantry() {
    if (!items || !user || saving) return;
    setSaving(true);
    try {
      await supabase.from("pantry_items").insert(
        items.map((i) => ({
          user_id: user.id,
          name: i.name,
          quantity: i.quantity ?? null,
          category: i.category ?? null,
          source: "scan",
        })),
      );
      toast.success(`Added ${items.length} item${items.length === 1 ? "" : "s"} to your pantry`);
      setItems(null);
      setPreview(null);
    } catch (err) {
      toast.error("Couldn't save to pantry", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-background">
          <Camera className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl leading-tight">AI Kitchen Scan</h1>
          <p className="text-sm text-muted-foreground">
            Point your camera at the fridge or pantry — we'll log every ingredient.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-card py-16 text-center transition-colors hover:bg-muted"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-background">
            <Camera className="h-7 w-7" />
          </span>
          <span className="font-medium">Tap to scan now</span>
          <span className="max-w-xs text-sm text-muted-foreground">
            Take or upload a photo of your ingredients, groceries, or a meal.
          </span>
        </button>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
          <img src={preview} alt="Scanned kitchen" className="max-h-64 w-full object-cover" />
        </div>
      )}

      {busy && (
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Identifying ingredients…
        </div>
      )}

      {items && items.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-xl">Found {items.length} ingredients</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {items.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
              >
                {item.name}
                {item.quantity ? (
                  <span className="text-muted-foreground"> · {item.quantity}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-3">
            <Button onClick={addAllToPantry} disabled={saving} className="rounded-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add all to pantry
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                setItems(null);
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Scan again
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
